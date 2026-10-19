'use client';

import { ChefHat, ExternalLink, Monitor } from 'lucide-react';
import Link from 'next/link';
import { ButtonLink, Card, EmptyState } from '@/components/ui';
import type { CashAdminData } from './types';

/**
 * Reparti (modulo `departments`, §12.2): il reparto è un campo del prodotto nel Catalogo. Da qui si
 * aprono gli schermi della cucina e lo schermo pubblico "Pronti".
 */
export function DepartmentsTab({ data }: { data: CashAdminData }) {
  const { edition } = data;
  if (!edition.departmentsModule) {
    return (
      <Card className="mt-4">
        <EmptyState
          icon={ChefHat}
          title="Il modulo Reparti non è attivo"
          description="Attivalo in Impostazioni › Moduli per avere le comande per reparto, lo schermo della cucina e lo schermo Pronti."
          action={<ButtonLink href={`/admin/e/${edition.slug}/impostazioni`}>Vai alle impostazioni</ButtonLink>}
        />
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4 pt-4">
      {data.departments.length === 0 ? (
        <Card>
          <EmptyState icon={ChefHat} title="Nessun prodotto ha un reparto" description="Nel Catalogo indica il reparto dei prodotti di cassa (es. Cucina, Griglia, Bar)." />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.departments.map((d) => (
            <li key={d.name} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm">
              <h3 className="text-section font-semibold">{d.name}</h3>
              <p className="text-label text-muted">{d.products === 1 ? '1 prodotto' : `${d.products} prodotti`}</p>
              <ButtonLink href={`/cassa/reparto/${encodeURIComponent(d.name)}?edizione=${edition.slug}`} target="_blank" variant="secondary" icon={ExternalLink}>
                Apri lo schermo del reparto
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
      <Card title="Schermo Pronti" description="Da proiettare vicino al ritiro: mostra solo i numeri pronti, nessun dato personale.">
        {edition.readyScreen ? (
          <ButtonLink href={`/cassa/pronti/${edition.slug}`} target="_blank" variant="secondary" icon={Monitor}>
            Apri lo schermo Pronti
          </ButtonLink>
        ) : (
          <p className="text-body text-muted">
            È spento. Accendilo in{' '}
            <Link href={`/admin/e/${edition.slug}/impostazioni`} className="text-primary underline">
              Impostazioni › Moduli › Reparti
            </Link>
            .
          </p>
        )}
      </Card>
      <p className="text-label text-muted">Sui tablet della cucina usa un dispositivo di cassa abbinato e apri /cassa/reparto/&lt;nome del reparto&gt;.</p>
    </div>
  );
}
