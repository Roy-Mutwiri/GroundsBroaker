import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { AuthedUser } from './auth.types';

/** Restrict a route to the given roles (used with RolesGuard). */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Inject the authenticated user into a handler param. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthedUser | undefined => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest>();
  return req.authUser;
});
