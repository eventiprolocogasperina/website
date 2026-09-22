import type { Metadata } from 'next';
import RefundClient from './RefundClient';

export const metadata: Metadata = {
  title: 'Richiesta di Rimborso - Zuccaland 2026',
  description: 'Modulo ufficiale per la richiesta di rimborso delle prenotazioni dell\'evento Zuccaland.',
};

export default function ZuccalandRefundPage() {
  return <RefundClient />;
}
