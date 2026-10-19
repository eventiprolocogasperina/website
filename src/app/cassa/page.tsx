import { CassaApp } from '@/components/field/cassa/CassaApp';

export const dynamic = 'force-dynamic';

/**
 * Nuova cassa (§12.1). Dai telefoni abbinati l'edizione è quella del dispositivo; dall'admin si
 * arriva con ?edizione=<slug> (pulsante "Apri la cassa" in Cassa). La vecchia /cashier resta attiva.
 */
export default async function CassaPage({ searchParams }: { searchParams: Promise<{ edizione?: string }> }) {
  const { edizione } = await searchParams;
  const edition = edizione && /^[a-z0-9-]{1,80}$/.test(edizione) ? edizione : null;
  return <CassaApp adminEdition={edition} />;
}
