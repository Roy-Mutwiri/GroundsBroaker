import { UserRole, UserStatus } from '@prisma/client';

/** The user shape attached to authenticated requests (never includes secrets). */
export interface AuthedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  totpEnabled: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthedUser;
    sessionId?: string;
  }
}
