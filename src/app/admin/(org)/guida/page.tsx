import { ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { ButtonLink, Card, cn, focusRing, PageHeader } from '@/components/ui';
import { GUIDE } from '@/lib/admin-guide';

export const metadata = { title: 'Guida agli eventi' };

/** Guida agli eventi: la gerarchia dal format al dopo-evento (stesso testo in docs/GUIDA-EVENTI.md). */
export default function GuidePage() {
  return (
    <AdminPage className="max-w-4xl">
      <PageHeader
        title="Guida agli eventi"
        subtitle="Da dove si parte e in che ordine: format, edizione, date, biglietti, pagina, cassa, giorno dell’evento, chiusura."
        primaryAction={
          <ButtonLink href="/admin/edizioni/nuova" icon={Plus}>
            Nuova edizione
          </ButtonLink>
        }
      />
      <nav aria-label="Indice della guida" className="flex flex-wrap items-center gap-1 text-label text-muted">
        {GUIDE.map((s, i) => (
          <span key={s.id} className="flex items-center gap-1">
            <Link href={`#${s.id}`} className={cn('rounded px-1 hover:text-fg hover:underline', focusRing)}>
              {s.title.replace(/^\d+\.\s*/, '')}
            </Link>
            {i < GUIDE.length - 1 && <ArrowRight size={12} aria-hidden className="text-subtle" />}
          </span>
        ))}
      </nav>
      <ol className="flex flex-col gap-4">
        {GUIDE.map((s) => (
          <li key={s.id} id={s.id} className="scroll-mt-20">
            <Card title={s.title} description={s.summary}>
              <ul className="list-disc space-y-1.5 pl-5 text-body text-fg">
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Card>
          </li>
        ))}
      </ol>
    </AdminPage>
  );
}
