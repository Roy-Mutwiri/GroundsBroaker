import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Append-only audit log for sensitive actions (login, KYC decision, withdrawal approval, …). */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        ip: input.ip ?? null,
        metadata: input.metadata,
      },
    });
  }
}
