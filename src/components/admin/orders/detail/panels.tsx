import { Badge, Card, KeyValue } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import type { ActivitiesPanelData, LoadedPanel, PanelData, PanelKey, PostponementPanelData } from '@/server/domain/orders/admin-panels';

// Riquadri dei moduli nella pagina ordine (punto di estensione orderPanels). La chiave è la stessa
// del caricatore in src/server/domain/orders/admin-panels.ts: un modulo nuovo aggiunge una voce a entrambi.

function ActivitiesPanel({ data }: { data: ActivitiesPanelData }) {
  const items = [
    { label: 'Bambini', value: data.children === null ? '—' : String(data.children) },
    {
      label: 'Attività',
      value: data.activities.length ? (
        <span className="flex flex-wrap gap-1">
          {data.activities.map((a) => (
            <Badge key={a.key} tone="info">{a.label}</Badge>
          ))}
        </span>
      ) : (
        'nessuna'
      ),
    },
    ...data.other.map((o) => ({ label: o.label, value: o.value })),
  ];
  return <KeyValue items={items} />;
}

const sessionText = (s: PostponementPanelData['current']) => (s ? `${s.label} · ${formatDateTime(s.startsAt)}` : '—');

function PostponementPanel({ data }: { data: PostponementPanelData }) {
  const moved = data.original && data.current && data.original.label !== data.current.label;
  return (
    <KeyValue
      items={[
        ...(moved ? [{ label: 'Data originale', value: sessionText(data.original) }] : []),
        { label: moved ? 'Data attuale' : 'Data', value: sessionText(data.current) },
        {
          label: 'Diritto al rimborso',
          value: (
            <span className="flex flex-col items-start gap-0.5">
              <Badge tone={data.right.eligible ? 'warning' : 'neutral'}>{data.right.eligible ? 'Sì, per rinvio' : 'No'}</Badge>
              <span className="text-caption text-muted">{data.right.reason}</span>
            </span>
          ),
        },
      ]}
    />
  );
}

const PANELS: { [K in PanelKey]: (props: { data: PanelData[K] }) => React.ReactNode } = {
  activities: ActivitiesPanel,
  postponement: PostponementPanel,
};

export function ModulePanels({ panels }: { panels: LoadedPanel[] }) {
  return panels.map((p) => {
    const Panel = PANELS[p.key] as (props: { data: typeof p.data }) => React.ReactNode;
    return (
      <Card key={p.key} title={p.title}>
        <Panel data={p.data} />
      </Card>
    );
  });
}
