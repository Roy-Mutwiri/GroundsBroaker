import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { createSignedToken, randomToken, sha256, verifySignedToken } from '../../common/crypto/tokens';
import { AuthedUser } from './auth.types';
import { LoginDto, RegisterDto } from './dto';

const MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export interface SessionGrant {
  token: string;
  expiresAt: Date;
}

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  // ── Registration ──────────────────────────────────────────────────────────
  async register(dto: RegisterDto, meta: RequestMeta): Promise<{ user: AuthedUser; session: SessionGrant }> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException({ code: 'email_taken', message: 'That email is already registered.' });

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
        role: 'CLIENT',
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        kycProfile: { create: { tier: 0, status: 'NONE' } },
      },
    });

    await this.audit.write({ actorId: user.id, action: 'auth.register', ip: meta.ip });
    const session = await this.createSession(user.id, meta);
    return { user: this.toAuthedUser(user), session };
  }

  // ── Login (step 1) ────────────────────────────────────────────────────────
  async login(
    dto: LoginDto,
    meta: RequestMeta,
  ): Promise<{ mfaRequired: true; mfaToken: string } | { mfaRequired: false; user: AuthedUser; session: SessionGrant }> {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Constant-ish work whether or not the user exists.
    const ok = user ? await argon2.verify(user.passwordHash, dto.password).catch(() => false) : false;
    if (!user || !ok) {
      await this.audit.write({ actorId: user?.id ?? null, action: 'auth.login.failed', ip: meta.ip });
      throw new UnauthorizedException({ code: 'invalid_credentials', message: 'Incorrect email or password.' });
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({ code: 'account_inactive', message: 'This account is not active.' });
    }

    if (user.totpEnabledAt) {
      const mfaToken = createSignedToken({ sub: user.id, typ: 'mfa' }, this.cookieSecret(), MFA_CHALLENGE_TTL_MS);
      return { mfaRequired: true, mfaToken };
    }

    await this.audit.write({ actorId: user.id, action: 'auth.login', ip: meta.ip });
    const session = await this.createSession(user.id, meta);
    return { mfaRequired: false, user: this.toAuthedUser(user), session };
  }

  // ── Login (step 2: TOTP) ────────────────────────────────────────────────────
  async loginTotp(
    mfaToken: string,
    code: string,
    meta: RequestMeta,
  ): Promise<{ user: AuthedUser; session: SessionGrant }> {
    const payload = verifySignedToken<{ sub: string; typ: string }>(mfaToken, this.cookieSecret());
    if (!payload || payload.typ !== 'mfa') {
      throw new UnauthorizedException({ code: 'mfa_challenge_invalid', message: 'Your login attempt expired. Try again.' });
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.totpSecret || !user.totpEnabledAt) {
      throw new UnauthorizedException({ code: 'mfa_not_enabled', message: 'Two-factor authentication is not set up.' });
    }
    if (!authenticator.check(code, user.totpSecret)) {
      await this.audit.write({ actorId: user.id, action: 'auth.login.totp_failed', ip: meta.ip });
      throw new UnauthorizedException({ code: 'invalid_totp', message: 'That code is incorrect or expired.' });
    }

    await this.audit.write({ actorId: user.id, action: 'auth.login', ip: meta.ip, metadata: { mfa: true } });
    const session = await this.createSession(user.id, meta);
    return { user: this.toAuthedUser(user), session };
  }

  // ── 2FA management ───────────────────────────────────────────────────────
  async setupTotp(userId: string): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.totpEnabledAt) {
      throw new BadRequestException({ code: 'totp_already_enabled', message: 'Two-factor is already enabled.' });
    }
    const secret = authenticator.generateSecret();
    // Store as pending secret (not enabled until a code is verified).
    await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });
    const issuer = this.config.get<string>('TOTP_ISSUER', 'Aurum Markets');
    const otpauthUrl = authenticator.keyuri(user.email, issuer, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrDataUrl };
  }

  async enableTotp(userId: string, code: string, meta: RequestMeta): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.totpSecret) {
      throw new BadRequestException({ code: 'totp_not_initialized', message: 'Start two-factor setup first.' });
    }
    if (!authenticator.check(code, user.totpSecret)) {
      throw new BadRequestException({ code: 'invalid_totp', message: 'That code is incorrect. Try again.' });
    }
    await this.prisma.user.update({ where: { id: userId }, data: { totpEnabledAt: new Date() } });
    await this.audit.write({ actorId: userId, action: 'auth.2fa.enable', ip: meta.ip });
  }

  async disableTotp(user: AuthedUser, code: string, meta: RequestMeta): Promise<void> {
    // Staff must keep 2FA on.
    if (user.role !== 'CLIENT') {
      throw new ForbiddenException({ code: 'totp_required_for_staff', message: 'Staff accounts must keep two-factor enabled.' });
    }
    const record = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!record.totpSecret || !authenticator.check(code, record.totpSecret)) {
      throw new BadRequestException({ code: 'invalid_totp', message: 'That code is incorrect.' });
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { totpSecret: null, totpEnabledAt: null } });
    await this.audit.write({ actorId: user.id, action: 'auth.2fa.disable', ip: meta.ip });
  }

  // ── Sessions ─────────────────────────────────────────────────────────────
  async createSession(userId: string, meta: RequestMeta): Promise<SessionGrant> {
    const token = randomToken();
    const ttlDays = this.config.get<number>('SESSION_TTL_DAYS', 7);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: sha256(token),
        userAgent: meta.userAgent ?? undefined,
        ip: meta.ip ?? undefined,
        expiresAt,
      },
    });
    return { token, expiresAt };
  }

  async revokeSessionByToken(rawToken: string): Promise<void> {
    await this.prisma.session
      .updateMany({ where: { tokenHash: sha256(rawToken), revokedAt: null }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  async listSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
    });
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      current: s.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({ where: { id: sessionId, userId }, data: { revokedAt: new Date() } });
    await this.audit.write({ actorId: userId, action: 'auth.session.revoke', targetId: sessionId });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private cookieSecret(): string {
    return this.config.get<string>('COOKIE_SECRET', 'dev-only-cookie-secret-change-me');
  }

  toAuthedUser(user: User): AuthedUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      totpEnabled: user.totpEnabledAt !== null,
    };
  }
}
