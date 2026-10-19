import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/dates';
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
  const { edition } = view;
  return (
    <main className="ui-root min-h-screen bg-bg px-4 pb-16 pt-28 text-fg">
      <div className="mx-auto max-w-2xl">
        <p className="text-label text-muted">Biglietti</p>
        <h1 className="mt-1 text-2xl font-semibold text-fg sm:text-3xl">{edition.title}</h1>
        <p className="mt-1 text-body text-muted">
          {[edition.startsAt && formatDate(edition.startsAt), edition.location].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-6">
          {view.selling ? (
            <CheckoutClient view={view} />
          ) : (
            <div role="status" className="rounded-lg border border-border bg-surface p-5">
              <p className="text-body font-medium text-fg">{view.closedReason}</p>
              <p className="mt-1 text-label text-muted">Per informazioni scrivici dalla pagina Contatti.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
