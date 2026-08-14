import { DepositInit, PaymentProvider, WithdrawalInit } from './provider';

/** Honest stub for a future card processor, implementing the same interface. */
export class CardProviderStub implements PaymentProvider {
  readonly name = 'Card (stub)';
  readonly simulated = true;

  initiateDeposit(_input: DepositInit): Promise<{ providerRef: string; customerMessage: string }> {
    return Promise.reject(new Error('Card deposits are not available yet.'));
  }

  initiateWithdrawal(_input: WithdrawalInit): Promise<{ providerRef: string }> {
    return Promise.reject(new Error('Card withdrawals are not available yet.'));
  }
}
