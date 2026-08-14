import { randomBytes } from 'crypto';
import { DepositInit, PaymentProvider, WithdrawalInit } from './provider';

/**
 * DEMO M-Pesa provider. Returns a fake CheckoutRequestID; PaymentsService schedules a
 * simulated success callback (as if the user entered their PIN). No real money moves.
 * Clearly the demo path — swapped for MpesaDarajaProvider when LIVE_PAYMENTS=true + keys.
 */
export class SimulatedMpesaProvider implements PaymentProvider {
  readonly name = 'M-Pesa (simulated demo)';
  readonly simulated = true;

  private ref(prefix: string): string {
    return `${prefix}_${randomBytes(6).toString('hex')}`;
  }

  initiateDeposit(_input: DepositInit): Promise<{ providerRef: string; customerMessage: string }> {
    return Promise.resolve({
      providerRef: this.ref('ws_CO'),
      customerMessage: 'A payment request has been sent to your phone. Enter your M-Pesa PIN to complete.',
    });
  }

  initiateWithdrawal(_input: WithdrawalInit): Promise<{ providerRef: string }> {
    return Promise.resolve({ providerRef: this.ref('b2c') });
  }
}
