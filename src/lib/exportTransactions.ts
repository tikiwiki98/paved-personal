import { Transaction, CreditCard } from '@/types/budget';

const PAYMENT_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  cash: 'Cash',
  venmo: 'Venmo',
  paypal: 'PayPal',
  crypto: 'Crypto',
  bank_transfer: 'Bank Transfer',
  zelle: 'Zelle',
  check: 'Check',
  other: 'Other',
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  brokerage: 'Brokerage',
  retirement: 'Retirement',
  high_yield_savings: 'High-yield Savings',
  crypto: 'Crypto',
  other: 'Other',
};

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[\",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildTransactionsCsv(
  transactions: Transaction[],
  creditCards: CreditCard[]
): string {
  const cardById = new Map(creditCards.map((c) => [c.id, c.card_name]));

  // Exclude synthetic recurring instances; keep base templates only.
  const baseTransactions = transactions.filter((t) => !t.id.includes('_recurring_'));

  const headers = [
    'Date',
    'Type',
    'Description',
    'Category',
    'Amount',
    'Payment Type',
    'Payment Detail',
    'Credit Card',
    'Asset Type',
    'Asset Name',
    'Recurring',
    'Recurring Frequency',
  ];

  const rows = baseTransactions.map((t) => [
    t.date,
    t.type,
    t.description,
    t.category,
    t.amount.toFixed(2),
    t.payment_type ? PAYMENT_LABELS[t.payment_type] || t.payment_type : '',
    t.payment_description || '',
    t.credit_card_id ? cardById.get(t.credit_card_id) || '' : '',
    t.asset_type ? ASSET_TYPE_LABELS[t.asset_type] || t.asset_type : '',
    t.asset_name || '',
    t.is_recurring ? 'Yes' : 'No',
    t.recurring_frequency || '',
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
