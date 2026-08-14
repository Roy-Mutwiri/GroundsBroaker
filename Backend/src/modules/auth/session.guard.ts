import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../../common/prisma/prisma.service';
import { sha256 } from '../../common/crypto/tokens';
import { AuthedUser } from './auth.types';

/** Authenticates a request from the opaque session cookie. Attaches req.authUser + req.sessionId. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const cookieName = this.config.get<string>('SESSION_COOKIE_NAME', 'aurum_session');
    const raw = (req.cookies as Record<string, string | undefined> | undefined)?.[cookieName];
    if (!raw) throw new UnauthorizedException({ code: 'unauthorized', message: 'Not signed in.' });

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(raw) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'unauthorized', message: 'Session expired. Sign in again.' });
    }
    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ code: 'account_inactive', message: 'This account is not active.' });
    }

    // Best-effort last-seen refresh (don't block the request on it).
    void this.prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);

    const authUser: AuthedUser = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      totpEnabled: session.user.totpEnabledAt !== null,
    };
    req.authUser = authUser;
    req.sessionId = session.id;
    return true;
  }
}
