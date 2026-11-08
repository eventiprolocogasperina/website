import type { Metadata } from 'next';
import Link from 'next/link';
import { V3Page } from '@/components/site/ui';
import { DEFAULT_TRANSPARENCY, type CookieItem, type Processor, type Treatment } from '@/lib/public/transparency';
import { getTransparency, type TransparencyView } from '@/server/domain/site/transparency';
import { log } from '@/server/log';
import { DataTable, Section } from './Sections';
import { RequestForm } from './RequestForm';

export const metadata: Metadata = {
  title: 'Trasparenza sui dati',
  description: 'Quali dati personali raccoglie la Pro Loco Gasperina APS, per cosa li usa, per quanto li conserva, chi li tratta per suo conto e come esercitare i tuoi diritti.',
  alternates: { canonical: '/trasparenza' },
  openGraph: { title: 'Trasparenza sui dati | Pro Loco Gasperina', url: '/trasparenza' },
};

export const dynamic = 'force-dynamic';

const fullDate = (d: Date) => d.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric' });

async function load(): Promise<TransparencyView> {
  try {
    return await getTransparency();
  } catch (error) {
    log.error('Trasparenza: contenuti non disponibili, mostro quelli predefiniti', { error });
    return { content: DEFAULT_TRANSPARENCY, updatedAt: null, versions: [] };
  }
}

/** Trasparenza sul trattamento dei dati (§13.6): completa /privacy, con contenuti aggiornati da admin. */
export default async function TrasparenzaPage() {
  const { content: c, updatedAt, versions } = await load();
  const cookies = (audience: CookieItem['audience']) => c.cookies.filter((k) => k.audience === audience);

  return (
    <V3Page>
      <section className="hero">
        <span className="eyebrow">Trasparenza</span>
        <h1 className="h1">
          I tuoi dati, <span>in chiaro.</span>
        </h1>
        <p className="lede">
          Cosa raccogliamo, perché, per quanto tempo e chi ci aiuta a trattarlo. Il testo completo è nell&apos;
          <Link href="/privacy" style={{ textDecoration: 'underline' }}>informativa sulla privacy</Link>.
        </p>
        {updatedAt && <p style={{ fontSize: 14, opacity: 0.8 }}>Ultimo aggiornamento: {fullDate(updatedAt)}</p>}
      </section>

      <Section n={1} id="in-breve" title="In breve" tone="cream">
        <div className="grid g2">
          {c.summary.map((line) => (
            <div key={line} className="vcard">
              <p>{line}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section n={2} id="trattamenti" title="Quali dati, per cosa e per quanto tempo">
        <DataTable<Treatment>
          caption="Trattamenti dei dati personali"
          rows={c.treatments}
          columns={[
            { label: 'Attività', cell: (t) => t.name },
            { label: 'Dati raccolti', cell: (t) => t.data },
            { label: 'Finalità', cell: (t) => t.purpose },
            { label: 'Base giuridica', cell: (t) => t.legalBasis },
            { label: 'Conservazione', cell: (t) => t.retention },
          ]}
        />
      </Section>

      <Section n={3} id="fornitori" title="Chi tratta i dati per nostro conto" tone="blue">
        <p className="lede" style={{ marginBottom: 24 }}>Fornitori che usiamo per far funzionare il sito e gli eventi (responsabili del trattamento). Ricevono solo i dati che servono al loro servizio.</p>
        <DataTable<Processor>
          caption="Fornitori che trattano i dati"
          rows={c.processors}
          columns={[
            { label: 'Fornitore', cell: (p) => p.name },
            { label: 'Servizio', cell: (p) => p.service },
            { label: 'Paese', cell: (p) => p.country },
            {
              label: 'Privacy',
              cell: (p) => (
                <a href={p.privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
                  Informativa<span className="sr-only"> di {p.name} (si apre in una nuova scheda)</span>
                </a>
              ),
            },
          ]}
        />
      </Section>

      <Section n={4} id="cookie" title="Cookie e memoria del browser" tone="cream">
        <p className="lede" style={{ marginBottom: 24 }}>Solo strumenti tecnici, senza profilazione né pubblicità. Chi visita il sito riceve al massimo questi:</p>
        <CookieTable rows={cookies('public')} />
        {cookies('staff').length > 0 && (
          <>
            <p className="lede" style={{ margin: '32px 0 24px' }}>Solo per lo staff e i volontari, nell&apos;area riservata, alla cassa e allo scanner:</p>
            <CookieTable rows={cookies('staff')} />
          </>
        )}
      </Section>

      <section id="diritti" aria-labelledby="diritti-t" className="panel p-blued">
        <div className="split" style={{ alignItems: 'start' }}>
          <div>
            <span className="eyebrow">5 · Esercita i tuoi diritti</span>
            <h2 id="diritti-t" className="h2">Vedi, correggi o cancella i tuoi dati.</h2>
            <p className="lede" style={{ marginTop: 18 }}>{c.rightsNote}</p>
            <p style={{ marginTop: 14, fontSize: 15 }}>
              Preferisci l&apos;email? Scrivi a <a href={`mailto:${c.contactEmail}`} style={{ textDecoration: 'underline' }}>{c.contactEmail}</a>.
            </p>
          </div>
          <RequestForm />
        </div>
      </section>

      <Section n={6} id="versioni" title="Aggiornamenti di questa pagina">
        {versions.length ? (
          <ol style={{ paddingLeft: 22, margin: 0, display: 'grid', gap: 8 }}>
            {versions.map((v) => (
              <li key={v.id}>
                <strong>{fullDate(v.createdAt)}</strong> — {v.note}
              </li>
            ))}
          </ol>
        ) : (
          <p>Prima versione della pagina, ottobre 2026.</p>
        )}
      </Section>
    </V3Page>
  );
}

function CookieTable({ rows }: { rows: CookieItem[] }) {
  return (
    <DataTable<CookieItem>
      caption="Cookie e memoria del browser"
      rows={rows}
      columns={[
        { label: 'Nome', cell: (k) => <code>{k.name}</code> },
        { label: 'Tipo', cell: (k) => (k.kind === 'cookie' ? 'Cookie tecnico' : 'Memoria del browser') },
        { label: 'A cosa serve', cell: (k) => k.purpose },
        { label: 'Durata', cell: (k) => k.duration },
      ]}
    />
  );
}
