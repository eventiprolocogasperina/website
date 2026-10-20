'use client';

import { ExternalLink, History } from 'lucide-react';
import { ButtonLink, EmptyState, PageHeader, Tabs, Timeline } from '@/components/ui';
import type { TransparencyContent } from '@/lib/public/transparency';
import { ContentEditor } from './ContentEditor';
import { RequestsPanel, type RequestRow } from './RequestsPanel';

type Props = {
  content: TransparencyContent;
  updatedAt: string | null;
  versions: Array<{ id: string; note: string; author: string; createdAt: string }>;
  /** null = chi guarda non ha customers.read e vede solo il numero di richieste aperte. */
  requests: RequestRow[] | null;
  openRequests: number;
};

const when = (iso: string) => new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** /admin/sito/trasparenza (§13.6): richieste degli interessati, contenuti strutturati e storico delle versioni. */
export function TransparencyClient({ content, updatedAt, versions, requests, openRequests }: Props) {
  return (
    <>
      <PageHeader
        title="Trasparenza"
        subtitle={updatedAt ? `Pagina pubblica aggiornata il ${when(updatedAt)}.` : 'La pagina pubblica mostra il testo di partenza: pubblicalo o modificalo da qui.'}
        primaryAction={
          <ButtonLink href="/trasparenza" target="_blank" variant="secondary" iconEnd={ExternalLink}>
            Apri la pagina
          </ButtonLink>
        }
      />
      <Tabs
        aria-label="Sezioni della pagina Trasparenza"
        defaultValue={requests && openRequests > 0 ? 'richieste' : 'contenuti'}
        items={[
          {
            value: 'richieste',
            label: 'Richieste',
            count: openRequests,
            content: (
              <div className="pt-4">
                {requests ? (
                  <RequestsPanel rows={requests} />
                ) : (
                  <p className="text-body text-muted">
                    {openRequests > 0 ? `Ci sono ${openRequests} richieste da gestire.` : 'Nessuna richiesta aperta.'} Le gestiscono il titolare e gli amministratori: contengono dati personali.
                  </p>
                )}
              </div>
            ),
          },
          { value: 'contenuti', label: 'Contenuti', content: <div className="pt-4"><ContentEditor initial={content} /></div> },
          {
            value: 'storico',
            label: 'Storico',
            content: (
              <div className="pt-4">
                {versions.length ? (
                  <Timeline items={versions.map((v) => ({ id: v.id, title: v.note, time: when(v.createdAt), actor: v.author }))} />
                ) : (
                  <EmptyState icon={History} title="Nessuna versione pubblicata" description="Alla prima pubblicazione il testo di partenza diventa la versione 1." />
                )}
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
