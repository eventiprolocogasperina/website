import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eventCard } from '@/components/public/event-card';
import { EventPageShell } from '@/components/public/EventPageShell';
import { getCheckout } from '@/server/domain/checkout';
import { CheckoutClient } from './CheckoutClient';

type Props = { params: Promise<{ edition: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = await getCheckout((await params).edition);
  return { title: view ? `Biglietti ${view.edition.title}` : 'Biglietti', robots: { index: false, follow: true } };
}

/** Checkout unico (§13.2): scegli, dati, riepilogo, pagamento. Prezzi e posti li decide il server. */
export default async function CheckoutPage({ params }: Props) {
  const view = await getCheckout((await params).edition);
  if (!view) notFound();
  return (
    <EventPageShell edition={view.edition}>
      {view.selling ? (
        <CheckoutClient view={view} />
      ) : (
        <div role="status" className={`${eventCard} mx-auto max-w-2xl p-6 text-center`}>
          <p aria-hidden className="text-[2.5rem]">
            🎟️
          </p>
          <p className="mt-2 text-section font-bold text-[var(--ev-ink)]">{view.closedReason}</p>
          <p className="mt-1 text-body text-muted">
            Per informazioni scrivici dalla pagina{' '}
            <a href="/contatti" className="text-primary underline">
              Contatti
            </a>
            .
          </p>
        </div>
      )}
    </EventPageShell>
  );
}
