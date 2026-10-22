import { notFound, redirect } from 'next/navigation';
import { SetupStepper } from '@/components/admin/edition/SetupChecklist';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { PageHeader, StatusBadge } from '@/components/ui';
import { romeDateKey, romeTime } from '@/lib/dates';
import { STEP_PATHS, type SetupStep } from '@/lib/edition-setup';
import { editionLinks } from '@/lib/public/edition-links';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { getEditionDetail } from '@/server/domain/editions';
import { getSetupChecklist } from '@/server/domain/editions/setup';
import { StepPanel, type StepLink } from '../StepPanel';

export const metadata = { title: 'Procedura guidata' };

type Props = { params: Promise<{ edition: string; step: string }> };

/** Un passo della procedura guidata: cosa serve, a che punto sei, dove si fa, e "Salta per ora". */
export default async function SetupStepPage({ params }: Props) {
  const { edition: slug, step: segment } = await params;
  const denied = await pageDenied('editions.edit', { edition: slug });
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const [e, list] = await Promise.all([getEditionDetail(slug), getSetupChecklist(ctx, slug)]);
  if (!e) notFound();
  if (e.status === 'archived') redirect(`/admin/e/${slug}`);
  const index = list.items.findIndex((i) => i.path === segment);
  if (index < 0) notFound();
  const item = list.items[index];
  const base = `/admin/e/${slug}`;
  const hrefOf = (k: SetupStep) => `${base}/procedura/${STEP_PATHS[k]}`;
  const links = linksFor(item.key, base, e.series?.slug ?? null, e.enabledModules);

  return (
    <AdminPage>
      <PageHeader
        title="Procedura guidata"
        badge={<StatusBadge status={e.status} />}
        subtitle={`${e.title} · passo ${index + 1} di ${list.items.length}`}
        back={{ href: base, label: 'Panoramica' }}
      />
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <SetupStepper items={list.items} current={item.key} hrefOf={hrefOf} />
        <StepPanel
          edition={slug}
          item={item}
          kind={list.kind}
          status={e.status}
          links={links}
          prevHref={index > 0 ? hrefOf(list.items[index - 1].key) : null}
          nextHref={index < list.items.length - 1 ? hrefOf(list.items[index + 1].key) : base}
          blockers={list.salesBlockers.map((b) => `${b.label}: ${b.detail}`)}
          initial={{
            location: e.location ?? '',
            startsDate: e.startsAt ? romeDateKey(e.startsAt) : '',
            startsTime: e.startsAt ? romeTime(e.startsAt) : '',
            rulesUrl: editionLinks(e.pageBlocks).rulesUrl ?? '',
          }}
        />
      </div>
    </AdminPage>
  );
}

function linksFor(step: SetupStep, base: string, seriesSlug: string | null, modules: string[]): StepLink[] {
  switch (step) {
    case 'dates':
      return [
        { label: 'Date e capienze', href: `${base}/date`, hint: 'Aggiungi o correggi le date, gli orari e i posti di ognuna.' },
        { label: 'Impostazioni', href: `${base}/impostazioni`, hint: 'Titolo, luogo, date di inizio e fine.' },
      ];
    case 'tickets':
      return [{ label: 'Catalogo', href: `${base}/catalogo`, hint: 'Biglietto “Intero”, ridotti, prezzi e canali (online, cassa).' }];
    case 'extras':
      return [
        { label: 'Catalogo', href: `${base}/catalogo`, hint: 'Extra a pagamento: laboratori, calice di vino, pezzi della cassa.' },
        ...(modules.includes('activities') ? [{ label: 'Attività (Impostazioni → Moduli)', href: `${base}/impostazioni`, hint: 'Attività gratuite per giorno, con i loro posti.' }] : []),
      ];
    case 'page':
      return [
        { label: 'Pagina pubblica', href: `${base}/pagina`, hint: 'Editor a blocchi: testi, programma, menu e tappe, foto. Salva quando è pronta.' },
        ...(seriesSlug ? [{ label: 'Format', href: `/admin/format/${seriesSlug}`, hint: 'Logo e colori del format, la pagina fuori stagione.' }] : []),
        { label: 'Impostazioni', href: `${base}/impostazioni`, hint: 'Descrizione breve e immagine di copertina.' },
      ];
    case 'rules':
      return [{ label: 'Pagina pubblica', href: `${base}/pagina`, hint: 'Il regolamento è la voce “Regolamento” del blocco Allegati.' }];
    case 'registers':
      return [
        { label: 'Cassa', href: `${base}/cassa`, hint: 'Casse (principale all’ingresso, secondarie), prodotti di ogni cassa, dispositivi.' },
        { label: 'Check-in', href: `${base}/check-in`, hint: 'Liste d’ingresso e telefoni dello scanner.' },
      ];
    case 'discounts':
      return [
        { label: 'Catalogo → Codici sconto', href: `${base}/catalogo`, hint: 'Codici per gli sponsor, con limite di utilizzi e scadenza.' },
        ...(modules.includes('invites') ? [{ label: 'Inviti', href: `${base}/m/invites`, hint: 'Biglietti omaggio per enti e sponsor.' }] : []),
      ];
    case 'publish':
      return [{ label: 'Impostazioni → Stato', href: `${base}/impostazioni`, hint: 'Tutti i passaggi di stato, anche “Torna in bozza”.' }];
  }
}
