import { AdminPage } from '@/components/admin/shell/AdminPage';
import { Badge, Card, PageHeader } from '@/components/ui';
import { pageDenied } from '@/server/auth/guard';
import { type Level, type MapNode, type NodeId, systemMap } from '@/server/domain/notifications/systemMap';

export const metadata = { title: 'Mappa del sistema' };
export const dynamic = 'force-dynamic';

const TONE = { ok: 'success', warn: 'warning', error: 'danger' } as const;
const LABEL: Record<Level, string> = { ok: 'Regolare', warn: 'Da guardare', error: 'Problema' };

/** Righe della mappa: il percorso dell'acquisto, il lavoro in piazza, i servizi sotto. */
const ROWS: Array<{ title: string; ids: NodeId[] }> = [
  { title: 'Acquisto online', ids: ['sito', 'ordini', 'pagamenti', 'email'] },
  { title: 'All’evento e dopo', ids: ['ingresso', 'cassa', 'rimborsi'] },
  { title: 'Sotto il sito', ids: ['accessi', 'automatismi', 'telegram', 'database', 'configurazione', 'altro'] },
];

const time = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

function NodeCard({ node }: { node: MapNode }) {
  return (
    <Card className={node.level === 'error' ? 'border-danger' : node.level === 'warn' ? 'border-warning' : undefined}>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-body font-semibold">{node.label}</h3>
          <Badge tone={TONE[node.level]} dot>
            {LABEL[node.level]}
          </Badge>
        </div>
        <p className="text-caption text-muted">{node.role}</p>
        {node.system && <p className="text-caption text-muted">In uso: {node.system}</p>}
        {(node.signals.length > 0 || node.errors.length > 0) && (
          <ul className="flex flex-col gap-1 text-caption">
            {node.signals.map((s) => (
              <li key={s.name} className={s.ok ? 'text-muted' : s.warn ? 'text-warning' : 'text-danger'}>
                {s.name}: {s.detail}
              </li>
            ))}
            {node.errors.map((e) => (
              <li key={e.message} className="text-danger">
                {e.message} · ultimo {time(e.lastAt)}
                {e.more > 0 && ` (+${e.more})`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/**
 * Sistema → Mappa: versione semplice di docs/mappa-logica.html con un semaforo per nodo. Rosso: un
 * controllo non passa o un errore nell'ultima ora; giallo: errori negli ultimi 7 giorni o cose da lavorare.
 */
export default async function SystemMapPage() {
  const denied = await pageDenied('settings.manage');
  if (denied) return denied;
  const nodes = await systemMap();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const problems = nodes.filter((n) => n.level !== 'ok').length;
  return (
    <AdminPage>
      <PageHeader
        title="Mappa del sistema"
        badge={<Badge tone={problems ? 'warning' : 'success'}>{problems ? `${problems} nodi da guardare` : 'Tutto regolare'}</Badge>}
        subtitle="Le parti del sito e il loro stato. Gli errori vengono dagli allarmi Telegram degli ultimi 7 giorni; il dettaglio è nei log di Vercel."
      />
      {ROWS.map((row) => {
        const cards = row.ids.flatMap((id) => byId.get(id) ?? []);
        return (
          cards.length > 0 && (
            <section key={row.title} className="flex flex-col gap-2">
              <h2 className="text-caption font-semibold tracking-wide text-muted uppercase">{row.title}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((n) => (
                  <NodeCard key={n.id} node={n} />
                ))}
              </div>
            </section>
          )
        );
      })}
    </AdminPage>
  );
}
