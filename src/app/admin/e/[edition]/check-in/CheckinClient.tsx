'use client';

import { ScanLine } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ArchivedNotice } from '@/components/admin/edition/common';
import { ButtonLink, PageHeader, Tabs } from '@/components/ui';
import type { CheckinListRow, CheckinStats } from '@/server/domain/checkin';
import type { DeviceRow, RegisterOption } from '@/server/domain/devices';
import { DevicesPanel } from './DevicesPanel';
import { ListsPanel, type ListOptions } from './ListsPanel';
import { StatsPanel } from './StatsPanel';

export type CheckinTab = 'andamento' | 'liste' | 'dispositivi';
export type EditionInfo = { slug: string; title: string; readOnly: boolean };

type Props = {
  edition: EditionInfo;
  tab: CheckinTab;
  stats: CheckinStats;
  lists: CheckinListRow[];
  options: ListOptions;
  devices: DeviceRow[];
  registers: RegisterOption[];
  perms: { lists: boolean; devices: boolean };
  scannerV2: boolean;
};

/** Ogni quanto si aggiornano i numeri mentre la pagina è aperta e visibile. */
const LIVE_MS = 15_000;

/** Check-in dell'edizione (§10.3): andamento in tempo reale, liste, dispositivi scanner. */
export function CheckinClient({ edition, tab, stats, lists, options, devices, registers, perms, scannerV2 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, LIVE_MS);
    return () => window.clearInterval(id);
  }, [router]);

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Check-in"
        subtitle={`${stats.total.entered} entrati su ${stats.total.expected} biglietti d’ingresso · si aggiorna da solo`}
        primaryAction={
          <ButtonLink href={scannerV2 ? '/scanner' : '/scanner/nuovo'} icon={ScanLine}>
            Apri lo scanner
          </ButtonLink>
        }
      />
      {edition.readOnly && <ArchivedNotice />}
      <Tabs
        aria-label="Sezioni del check-in"
        value={tab}
        onValueChange={(v) => go({ scheda: v === 'andamento' ? null : v })}
        items={[
          { value: 'andamento', label: 'Andamento', content: <StatsPanel stats={stats} onDay={(d) => go({ giorno: d })} /> },
          { value: 'liste', label: 'Liste', count: lists.length, content: <ListsPanel edition={edition} lists={lists} options={options} canEdit={perms.lists && !edition.readOnly} /> },
          { value: 'dispositivi', label: 'Dispositivi', count: devices.filter((d) => !d.revokedAt).length, content: <DevicesPanel edition={edition} devices={devices} registers={registers} stats={stats.devices} canManage={perms.devices} scannerV2={scannerV2} /> },
        ]}
      />
    </>
  );
}
