/**
 * PaymentProvider abstraction. A production deployment uses MpesaDarajaProvider against the
 * Safaricom Daraja API; demo mode uses SimulatedMpesaProvider (no credentials needed). The
 * interface is intentionally small — the async STK/B2C result arrives via a webhook the
 * PaymentsService handles, so `initiate*` only kicks off the request.
 */

export interface DepositInit {
  depositId: string;
  amountKes: number;
  phone: string; // MSISDN 2547XXXXXXXX
  accountRef: string; // ≤12 chars
}

export interface WithdrawalInit {
  withdrawalId: string;
  amountKes: number;
  phone: string;
}

export interface StkCallback {
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  mpesaReceipt?: string;
  phone?: string;
}

export interface PaymentProvider {
  readonly name: string;
  /** true = no real money movement; PaymentsService self-delivers a simulated callback. */
  readonly simulated: boolean;
  initiateDeposit(input: DepositInit): Promise<{ providerRef: string; customerMessage: string }>;
  initiateWithdrawal(input: WithdrawalInit): Promise<{ providerRef: string }>;
}
