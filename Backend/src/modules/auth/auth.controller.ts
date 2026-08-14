import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards, UsePipes } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import { AuthService, RequestMeta, SessionGrant } from './auth.service';
import { CurrentUser } from './decorators';
import { AuthedUser } from './auth.types';
import { SessionGuard } from './session.guard';
import {
  LoginDto,
  loginSchema,
  RegisterDto,
  registerSchema,
  TotpCodeDto,
  totpCodeSchema,
  TotpLoginDto,
  totpLoginSchema,
} from './dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private meta(req: FastifyRequest): RequestMeta {
    return { ip: req.ip, userAgent: req.headers['user-agent'] ?? null };
  }

  private setSessionCookie(reply: FastifyReply, grant: SessionGrant): void {
    reply.setCookie(this.config.get<string>('SESSION_COOKIE_NAME', 'aurum_session'), grant.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      path: '/',
      expires: grant.expiresAt,
    });
  }

  private clearSessionCookie(reply: FastifyReply): void {
    reply.clearCookie(this.config.get<string>('SESSION_COOKIE_NAME', 'aurum_session'), { path: '/' });
  }

  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() dto: RegisterDto, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const { user, session } = await this.auth.register(dto, this.meta(req));
    this.setSessionCookie(reply, session);
    return { user };
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() dto: LoginDto, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.auth.login(dto, this.meta(req));
    if (result.mfaRequired) return { mfaRequired: true, mfaToken: result.mfaToken };
    this.setSessionCookie(reply, result.session);
    return { mfaRequired: false, user: result.user };
  }

  @Post('login/totp')
  @UsePipes(new ZodValidationPipe(totpLoginSchema))
  async loginTotp(@Body() dto: TotpLoginDto, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const { user, session } = await this.auth.loginTotp(dto.mfaToken, dto.code, this.meta(req));
    this.setSessionCookie(reply, session);
    return { user };
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const cookieName = this.config.get<string>('SESSION_COOKIE_NAME', 'aurum_session');
    const raw = (req.cookies as Record<string, string | undefined>)?.[cookieName];
    if (raw) await this.auth.revokeSessionByToken(raw);
    this.clearSessionCookie(reply);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: AuthedUser) {
    return { user };
  }

  // ── 2FA ──
  @Post('2fa/setup')
  @UseGuards(SessionGuard)
  setup2fa(@CurrentUser() user: AuthedUser) {
    return this.auth.setupTotp(user.id);
  }

  @Post('2fa/enable')
  @UseGuards(SessionGuard)
  @UsePipes(new ZodValidationPipe(totpCodeSchema))
  async enable2fa(@Body() dto: TotpCodeDto, @CurrentUser() user: AuthedUser, @Req() req: FastifyRequest) {
    await this.auth.enableTotp(user.id, dto.code, this.meta(req));
    return { ok: true };
  }

  @Post('2fa/disable')
  @UseGuards(SessionGuard)
  @UsePipes(new ZodValidationPipe(totpCodeSchema))
  async disable2fa(@Body() dto: TotpCodeDto, @CurrentUser() user: AuthedUser, @Req() req: FastifyRequest) {
    await this.auth.disableTotp(user, dto.code, this.meta(req));
    return { ok: true };
  }

  // ── Sessions / devices ──
  @Get('sessions')
  @UseGuards(SessionGuard)
  sessions(@CurrentUser() user: AuthedUser, @Req() req: FastifyRequest) {
    return this.auth.listSessions(user.id, req.sessionId);
  }

  @Delete('sessions/:id')
  @UseGuards(SessionGuard)
  async revokeSession(@CurrentUser() user: AuthedUser, @Param('id') id: string) {
    await this.auth.revokeSession(user.id, id);
    return { ok: true };
  }
}
