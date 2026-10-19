import type { Metadata } from 'next';
import { AuthCard } from '@/app/login/AuthCard';
import { checkPairing } from '@/server/domain/devices';
import { listAssignableEditions } from '@/server/domain/editions';
import { PairForm } from './PairForm';

export const metadata: Metadata = { title: 'Abbina dispositivo', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const KIND = { pos: 'la cassa', scanner: 'lo scanner dei biglietti' } as const;

export default async function PairPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pairing = await checkPairing(token);
  if (!pairing) {
    return (
      <AuthCard title="QR non valido">
        <p className="text-body">Il QR è scaduto o è già stato usato. Chiedi a un responsabile di generarne uno nuovo dall’admin, in Sistema › Utenti › Dispositivi.</p>
      </AuthCard>
    );
  }
  const title = (await listAssignableEditions()).find((e) => e.slug === pairing.edition)?.title ?? pairing.edition;
  return (
    <AuthCard title={`Abbina “${pairing.name}”`} subtitle={`Questo dispositivo userà ${KIND[pairing.kind]} di ${title}.`}>
      <PairForm token={token} />
    </AuthCard>
  );
}
