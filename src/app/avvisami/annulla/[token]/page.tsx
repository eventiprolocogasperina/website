import type { Metadata } from 'next';
import { UnsubscribeClient } from './UnsubscribeClient';

export const metadata: Metadata = { title: 'Annulla l’avviso', robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

/**
 * Link "non avvisarmi più" delle email Avvisami. Serve un clic di conferma: un GET da solo non
 * cambia nulla, perché i programmi di posta aprono i link in anteprima.
 */
export default async function UnsubscribePage({ params }: Props) {
  const { token } = await params;
  return (
    <section className="ui-root flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-32">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        <h1 className="text-page font-semibold text-fg">Annulla l’avviso</h1>
        <UnsubscribeClient token={token} />
      </div>
    </section>
  );
}
