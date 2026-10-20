import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Eye, ShieldCheck } from 'lucide-react';
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
    <div style={{ paddingTop: '6rem', paddingBottom: '6rem', background: 'var(--neutral-950)', minHeight: '100vh', color: 'var(--neutral-300)' }}>
      <div style={{ maxWidth: '920px', margin: '0 auto', padding: '0 1.5rem' }}>
        <Link href="/" className="hover-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--neutral-400)', marginBottom: '2rem' }}>
          <ArrowLeft size={16} aria-hidden /> Torna alla Home
        </Link>

        <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.3)', padding: '0.35rem 1rem', borderRadius: '999px', color: 'var(--gold-400)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            <Eye size={14} aria-hidden /> Trasparenza
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 600, color: 'var(--color-heading)', marginBottom: '1rem' }}>
            I tuoi dati, <span style={{ color: 'var(--gold-400)', fontStyle: 'italic' }}>in chiaro</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--neutral-400)', maxWidth: '680px', margin: '0 auto', lineHeight: 1.7 }}>
            Cosa raccogliamo, perché, per quanto tempo e chi ci aiuta a trattarlo. Il testo completo è nell’
            <Link href="/privacy" style={{ color: 'var(--gold-400)', textDecoration: 'underline' }}>
              informativa sulla privacy
            </Link>
            .
          </p>
          {updatedAt && <p style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', marginTop: '0.75rem' }}>Ultimo aggiornamento: {fullDate(updatedAt)}</p>}
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', lineHeight: 1.75, fontSize: '0.95rem' }}>
          <Section n={1} id="in-breve" title="In breve">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {c.summary.map((line) => (
                <li key={line} style={{ display: 'flex', gap: '0.75rem' }}>
                  <ShieldCheck size={18} aria-hidden style={{ color: 'var(--gold-500)', flexShrink: 0, marginTop: 4 }} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
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

          <Section n={3} id="fornitori" title="Chi tratta i dati per nostro conto">
            <p style={{ marginBottom: '1rem' }}>Fornitori che usiamo per far funzionare il sito e gli eventi (responsabili del trattamento). Ricevono solo i dati che servono al loro servizio.</p>
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
                    <a href={p.privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-400)', textDecoration: 'underline' }}>
                      Informativa<span className="sr-only"> di {p.name} (si apre in una nuova scheda)</span>
                    </a>
                  ),
                },
              ]}
            />
          </Section>

          <Section n={4} id="cookie" title="Cookie e memoria del browser">
            <p style={{ marginBottom: '1rem' }}>Solo strumenti tecnici, senza profilazione né pubblicità. Chi visita il sito riceve al massimo questi:</p>
            <CookieTable rows={cookies('public')} />
            {cookies('staff').length > 0 && (
              <>
                <p style={{ margin: '1.25rem 0 1rem' }}>Solo per lo staff e i volontari, nell’area riservata, alla cassa e allo scanner:</p>
                <CookieTable rows={cookies('staff')} />
              </>
            )}
          </Section>

          <Section n={5} id="diritti" title="I tuoi diritti">
            <p style={{ marginBottom: '1.5rem' }}>{c.rightsNote}</p>
            <RequestForm />
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--neutral-400)' }}>
              Preferisci l’email? Scrivi a{' '}
              <a href={`mailto:${c.contactEmail}`} style={{ color: 'var(--gold-400)', textDecoration: 'underline' }}>
                {c.contactEmail}
              </a>
              .
            </p>
          </Section>

          <Section n={6} id="versioni" title="Aggiornamenti di questa pagina">
            {versions.length ? (
              <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {versions.map((v) => (
                  <li key={v.id}>
                    <strong style={{ color: 'var(--color-heading)' }}>{fullDate(v.createdAt)}</strong> — {v.note}
                  </li>
                ))}
              </ol>
            ) : (
              <p>Prima versione della pagina, ottobre 2026.</p>
            )}
          </Section>
        </div>
      </div>
    </div>
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
