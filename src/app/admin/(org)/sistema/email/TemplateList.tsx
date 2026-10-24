import { ChevronRight, Mail } from 'lucide-react';
import Link from 'next/link';
import { Badge, Card } from '@/components/ui';
import { formatRelative } from '@/lib/dates';
import type { TemplateSummary } from '@/server/domain/email-templates';

/** Elenco dei modelli: uno per riga, con lo stato (predefinito o modificato) e le versioni per edizione. */
export function TemplateList({ templates }: { templates: TemplateSummary[] }) {
  return (
    <Card flush>
      <ul className="divide-y divide-border">
        {templates.map((t) => (
          <li key={t.key}>
            <Link href={`/admin/sistema/email/${t.key}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-primary">
              <Mail size={20} className="shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">{t.label}</span>
                  {t.customized ? <Badge tone="info">Modificato {t.updatedAt ? formatRelative(t.updatedAt) : ''}</Badge> : <Badge>Predefinito</Badge>}
                  {t.editionOverrides > 0 && <Badge tone="neutral">{t.editionOverrides === 1 ? '1 edizione' : `${t.editionOverrides} edizioni`} con un testo proprio</Badge>}
                  {!t.wired && <Badge tone="warning">Non ancora inviato dal sistema nuovo</Badge>}
                </div>
                <p className="mt-0.5 text-body text-muted">{t.when}</p>
              </div>
              <ChevronRight size={20} className="shrink-0 text-subtle" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
