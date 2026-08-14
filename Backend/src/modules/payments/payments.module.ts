import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentsService } from './payments.service';
import { ReconciliationService } from './reconciliation.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [AuthModule, WalletModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, ReconciliationService],
  exports: [PaymentsService, ReconciliationService],
})
export class PaymentsModule {}
