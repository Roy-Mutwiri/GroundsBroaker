import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './common/config/env';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MetaModule } from './modules/meta/meta.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { TradingModule } from './modules/trading/trading.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    RedisModule,
    AuditModule,
    AuthModule,
    UsersModule,
    MetaModule,
    LedgerModule,
    MarketDataModule,
    TradingModule,
    GatewayModule,
  ],
})
export class AppModule {}
