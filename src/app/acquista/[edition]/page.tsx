import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { card } from '@/components/public/checkout/parts';
import { EventPageShell } from '@/components/public/EventPageShell';
import { PopIn } from '@/components/public/motion';
import { editionTheme } from '@/lib/edition-theme';
import { getCheckout, type CheckoutView } from '@/server/domain/checkout';
import { CheckoutClient } from './CheckoutClient';

type Props = { params: Promise<{ edition: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = await getCheckout((await params).edition);
  return { title: view ? `Biglietti ${view.edition.title}` : 'Biglietti', robots: { index: false, follow: true } };
}

/** Faccia della pagina quando non si vende, per stato (guida P2.13, PhaseBanner di produzione). */
function closedLook(view: CheckoutView) {
  if (view.edition.status === 'published') return { emoji: '⏳', title: 'I biglietti arrivano presto', tone: 'border-warning/30 bg-warning-bg' };
  if (view.edition.status === 'sold_out') return { emoji: `${editionTheme(view.edition.theme).emoji}🚫`, title: 'Biglietti esauriti', tone: 'border-danger/25 bg-danger-bg' };
  return { emoji: '🎟️', title: 'Vendita online chiusa', tone: 'border-[var(--ev-border)] bg-white' };
}

/** Checkout unico (§13.2): scegli, attività, dati, riepilogo, pagamento. Prezzi e posti li decide il server. */
export default async function CheckoutPage({ params }: Props) {
  const view = await getCheckout((await params).edition);
  if (!view) notFound();
  const look = closedLook(view);
  return (
    <EventPageShell edition={view.edition}>
      {view.selling ? (
        <CheckoutClient view={view} />
      ) : (
        <PopIn className={`${card} mx-auto max-w-2xl border-2 p-8 text-center ${look.tone}`}>
          <div role="status">
            <p aria-hidden className="text-[3rem] leading-none">
              {look.emoji}
            </p>
            <h2 className="mt-3 font-ev-display text-pub-2xl font-bold text-[var(--ev-ink)]">{look.title}</h2>
            <p className="mt-2 text-pub-base text-fg">{view.closedReason}</p>
            <p className="mt-4 flex flex-wrap justify-center gap-2">
              {view.edition.format && (
                <Link href={view.edition.format.path} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-pub-sm font-bold text-primary-fg hover:bg-primary-hover">
                  Scopri {view.edition.format.name}
                </Link>
              )}
              <Link href="/contatti" className="inline-flex min-h-11 items-center rounded-full border-2 border-[var(--ev-border)] bg-white px-5 text-pub-sm font-bold text-[var(--ev-ink)] hover:bg-[var(--ev-softer)]">
                Scrivici
              </Link>
            </p>
          </div>
        </PopIn>
      )}
    </EventPageShell>
  );
}
