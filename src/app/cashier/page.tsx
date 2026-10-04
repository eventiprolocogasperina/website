import { Metadata } from 'next';
import CashierClient from './CashierClient';

export const metadata: Metadata = {
  title: 'Cassa Eventi & Sagre - Pro Loco Gasperina APS',
  description: 'Postazione cassa e gestione contributi per le manifestazioni della Pro Loco Gasperina APS',
};

export const dynamic = 'force-dynamic';

export default function CashierPage() {
  return <CashierClient />;
}
