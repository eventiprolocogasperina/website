import { Hammer } from 'lucide-react';
import type { ReactNode } from 'react';
import { ButtonLink, EmptyState, PageHeader } from '@/components/ui';
import { AdminPage } from './AdminPage';

export type ComingSoonProps = {
  title: string;
  /** Cosa conterrà la pagina, in una frase. */
  description: string;
  /** Quando arriva ("con il prompt 08"). */
  when?: string;
  /** Collegamento a dove si fa oggi la stessa cosa, se esiste. */
  meanwhile?: { href: string; label: string };
  badge?: ReactNode;
};

/** Segnaposto per le sezioni della nuova mappa dell'admin non ancora costruite (prompt 06). */
export function ComingSoon({ title, description, when, meanwhile, badge }: ComingSoonProps) {
  return (
    <AdminPage>
      <PageHeader title={title} badge={badge} />
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <EmptyState
          icon={Hammer}
          title="In arrivo"
          description={`${description}${when ? ` Arriva ${when}.` : ''}`}
          action={meanwhile ? <ButtonLink href={meanwhile.href} variant="secondary">{meanwhile.label}</ButtonLink> : undefined}
        />
      </div>
    </AdminPage>
  );
}
