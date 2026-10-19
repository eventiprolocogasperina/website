'use client';

import { ExternalLink, History, Lock } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArchivedNotice } from '@/components/admin/edition/common';
import { ButtonLink, EmptyState, PageHeader, Tabs } from '@/components/ui';
import { DepartmentsTab } from './DepartmentsTab';
import { DevicesTab } from './DevicesTab';
import { PrintersTab } from './PrintersTab';
import { RegisterProductsTab } from './RegisterProductsTab';
import { RegistersTab } from './RegistersTab';
import { ReportTab } from './ReportTab';
import { SessionsTab } from './SessionsTab';
import type { CashAdminData } from './types';

/** Pagina Cassa dell'edizione: casse, prodotti, reparti, stampanti, turni, dispositivi, rendiconto. */
export function CashAdminClient({ data, initialTab }: { data: CashAdminData; initialTab: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState(initialTab);
  const { edition } = data;
  const denied = (
    <EmptyState icon={Lock} title="Non hai accesso a questa sezione" description="Chiedi a un amministratore di darti il permesso." />
  );

  return (
    <>
      <PageHeader
        title="Cassa"
        subtitle={`${edition.title} · contributi raccolti alle casse dell’evento`}
        secondaryActions={
          <ButtonLink href={`/admin/e/${edition.slug}/cassa/vecchia`} variant="ghost" icon={History}>
            Vecchia cassa
          </ButtonLink>
        }
        primaryAction={
          <ButtonLink href={`/cassa?edizione=${edition.slug}`} target="_blank" icon={ExternalLink}>
            Apri la cassa
          </ButtonLink>
        }
      />
      {edition.readOnly && <ArchivedNotice />}
      <Tabs
        aria-label="Sezioni della cassa"
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          router.replace(`${pathname}${v === 'casse' ? '' : `?tab=${v}`}`, { scroll: false });
        }}
        items={[
          { value: 'casse', label: 'Casse', count: data.registers.length, content: <RegistersTab data={data} /> },
          { value: 'prodotti', label: 'Prodotti per cassa', content: <RegisterProductsTab data={data} /> },
          { value: 'reparti', label: 'Reparti', content: <DepartmentsTab data={data} /> },
          { value: 'stampanti', label: 'Stampanti', content: <PrintersTab data={data} /> },
          { value: 'turni', label: 'Turni', content: data.sessions ? <SessionsTab data={data} /> : denied },
          { value: 'dispositivi', label: 'Dispositivi', content: data.devices ? <DevicesTab data={data} /> : denied },
          { value: 'rendiconto', label: 'Rendiconto', content: data.summary ? <ReportTab data={data} /> : denied },
        ]}
      />
    </>
  );
}
