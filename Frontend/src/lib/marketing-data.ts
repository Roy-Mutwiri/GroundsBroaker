export interface AccountType {
  name: string;
  tagline: string;
  minDeposit: string;
  spreadFrom: string;
  commission: string;
  leverage: string;
  currencies: string;
  featured?: boolean;
  highlights: string[];
}

export const ACCOUNT_TYPES: AccountType[] = [
  {
    name: 'Standard',
    tagline: 'Commission-free, spread-only. The simplest way to start.',
    minDeposit: '$0',
    spreadFrom: '1.2 pips',
    commission: 'None',
    leverage: 'Up to 1:400',
    currencies: 'USD · KES',
    highlights: ['No commission', 'KES-denominated option', 'All 21 instruments', 'Ideal for beginners'],
  },
  {
    name: 'Gold',
    tagline: 'Raw spreads from 0.0 pips plus a low commission. Built for active gold traders.',
    minDeposit: '$100',
    spreadFrom: '0.0 pips',
    commission: '$3.50 / lot / side',
    leverage: 'Up to 1:400',
    currencies: 'USD · KES',
    featured: true,
    highlights: ['Raw pricing from 0.0 pips', 'Tightest gold spreads', 'Priority execution', 'Full market depth'],
  },
];

export interface FundingStep {
  step: number;
  title: string;
  body: string;
}

export const MPESA_STEPS: FundingStep[] = [
  { step: 1, title: 'Enter the amount', body: 'Choose how much to deposit in KES from your client portal. It converts to your USD wallet instantly.' },
  { step: 2, title: 'Approve on your phone', body: 'An M-Pesa STK prompt appears on your registered number. Enter your PIN to authorise the payment.' },
  { step: 3, title: 'Funds land instantly', body: 'Your wallet is credited the moment M-Pesa confirms — no broker fee, no waiting.' },
];

export interface LegalDoc {
  slug: string;
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
}

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  terms: {
    slug: 'terms',
    title: 'Terms of Service',
    updated: 'Template — for counsel review',
    sections: [
      { heading: '1. Demonstration platform', body: 'Aurum Markets is a demonstration platform. It does not hold client money, execute real trades, or process real payments. No content on this platform constitutes an offer of financial services.' },
      { heading: '2. Eligibility', body: 'You must be at least 18 years old and legally able to enter into a binding agreement to use the platform.' },
      { heading: '3. Account & security', body: 'You are responsible for keeping your credentials confidential and for all activity under your account. Enable two-factor authentication where available.' },
      { heading: '4. No investment advice', body: 'Nothing on the platform is investment, legal, or tax advice. Trading leveraged products carries a high risk of loss.' },
      { heading: '5. Changes', body: 'These template terms will be replaced by counsel-reviewed terms before any real-money operation, which would require CMA authorisation.' },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    updated: 'Template — for counsel review',
    sections: [
      { heading: '1. What we collect', body: 'In this demo we collect the account details you provide (name, email, phone) and technical data needed to run sessions securely.' },
      { heading: '2. How we use it', body: 'To operate your account, secure sign-in, and improve the platform. We do not sell your data.' },
      { heading: '3. KYC data', body: 'Identity documents uploaded for verification are stored outside the public web root and served only via short-lived signed links to authorised reviewers.' },
      { heading: '4. Your rights', body: 'You may request access to, correction of, or deletion of your data, subject to legal retention requirements that would apply to a licensed broker.' },
    ],
  },
  'risk-disclosure': {
    slug: 'risk-disclosure',
    title: 'Risk Disclosure',
    updated: 'Template — for counsel review',
    sections: [
      { heading: 'High-risk products', body: 'Online foreign exchange and CFDs are complex leveraged products. They carry a high risk of losing money rapidly due to leverage, and you can lose more than your initial deposit.' },
      { heading: 'Leverage', body: 'Leverage magnifies both gains and losses. A small adverse price move can result in the loss of your entire margin.' },
      { heading: 'Suitability', body: 'Consider whether you understand how these products work and whether you can afford to take the high risk of losing your money. Seek independent advice if in doubt.' },
      { heading: 'Demo status', body: 'This platform is a demonstration and is not currently licensed to offer real-money trading. A separate signed risk-disclosure acknowledgement would be required before opening a real account under CMA authorisation.' },
    ],
  },
  aml: {
    slug: 'aml',
    title: 'AML Policy',
    updated: 'Template — for counsel review',
    sections: [
      { heading: '1. Commitment', body: 'A licensed Aurum entity would maintain a risk-based anti-money-laundering and counter-terrorist-financing programme aligned with CMA and FATF standards.' },
      { heading: '2. Know Your Customer', body: 'Identity and proof-of-address verification, tiered by activity, with sanctions and PEP screening before account activation.' },
      { heading: '3. Return to source', body: 'Withdrawals are returned to the same method and, where required, the same source used to deposit — a core layering control.' },
      { heading: '4. Monitoring', body: 'Ongoing transaction monitoring, with escalation and reporting of suspicious activity to the relevant authority.' },
    ],
  },
};
