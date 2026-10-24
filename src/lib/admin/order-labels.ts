// Testi italiani di metodi di pagamento e rimborso, usati nelle pagine ordini e rimborsi.

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  nexi: 'Carta online (Nexi)',
  cash: 'Contanti',
  card_pos: 'Carta al POS',
  complimentary: 'Omaggio',
  bank_transfer: 'Bonifico',
};

export const REFUND_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bonifico',
  nexi: 'Storno sulla carta (Nexi)',
  cash: 'Contanti',
};

export const methodLabel = (m: string) => PAYMENT_METHOD_LABELS[m] ?? m;
export const refundMethodLabel = (m: string) => REFUND_METHOD_LABELS[m] ?? m;
