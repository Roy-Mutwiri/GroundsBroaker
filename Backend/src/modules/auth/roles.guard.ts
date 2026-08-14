import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { ROLES_KEY } from './decorators';

/** Enforces @Roles(...) metadata. Must run after SessionGuard (req.authUser present). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const user = req.authUser;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException({ code: 'forbidden', message: 'You do not have access to this resource.' });
    }
    return true;
  }
}
