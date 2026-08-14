import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DepositInit, PaymentProvider, WithdrawalInit } from './provider';

/**
 * Real Safaricom Daraja provider (STK Push for deposits, B2C for payouts). Used only when
 * LIVE_PAYMENTS=true and MPESA_* keys are present. Field names follow the Daraja docs
 * (see docs/OPERATIONS_NOTES.md §B3). Not exercised in demo mode.
 */
export class MpesaDarajaProvider implements PaymentProvider {
  readonly name = 'M-Pesa Daraja';
  readonly simulated = false;
  private readonly logger = new Logger('MpesaDaraja');
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  private base(): string {
    return this.config.get('MPESA_ENV') === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;
    const key = this.config.getOrThrow<string>('MPESA_CONSUMER_KEY');
    const secret = this.config.getOrThrow<string>('MPESA_CONSUMER_SECRET');
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const res = await fetch(`${this.base()}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new Error(`Daraja OAuth failed: ${res.status}`);
    const body = (await res.json()) as { access_token: string; expires_in: string };
    this.token = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in) * 1000 };
    return this.token.value;
  }

  private timestamp(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  async initiateDeposit(input: DepositInit): Promise<{ providerRef: string; customerMessage: string }> {
    const token = await this.accessToken();
    const shortcode = this.config.getOrThrow<string>('MPESA_SHORTCODE');
    const passkey = this.config.getOrThrow<string>('MPESA_PASSKEY');
    const ts = this.timestamp();
    const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString('base64');
    const callbackBase = this.config.getOrThrow<string>('MPESA_CALLBACK_BASE_URL');

    const res = await fetch(`${this.base()}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(input.amountKes),
        PartyA: input.phone,
        PartyB: shortcode,
        PhoneNumber: input.phone,
        CallBackURL: `${callbackBase}/api/v1/payments/mpesa/callback`,
        AccountReference: input.accountRef.slice(0, 12),
        TransactionDesc: 'Deposit',
      }),
    });
    const body = (await res.json()) as { CheckoutRequestID?: string; CustomerMessage?: string; errorMessage?: string };
    if (!res.ok || !body.CheckoutRequestID) throw new Error(`STK push failed: ${body.errorMessage ?? res.status}`);
    return { providerRef: body.CheckoutRequestID, customerMessage: body.CustomerMessage ?? 'Check your phone.' };
  }

  async initiateWithdrawal(input: WithdrawalInit): Promise<{ providerRef: string }> {
    // B2C requires a pre-computed RSA SecurityCredential — provided via env in a real deployment.
    this.logger.warn(`B2C payout for ${input.withdrawalId} requires configured B2C credentials.`);
    throw new Error('B2C payout not configured in this environment.');
  }
}
