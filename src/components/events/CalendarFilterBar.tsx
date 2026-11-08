import Link from 'next/link';
import { monthLabel, type CalendarFilters } from '@/lib/public/calendar';
import type { EventCategory } from '@/lib/public/editions';

// Filtri del calendario /eventi: link (funzionano anche senza JavaScript e si possono condividere).

function href(f: CalendarFilters) {
  const q = new URLSearchParams();
  if (f.category) q.set('categoria', f.category);
  if (f.month) q.set('mese', f.month);
  const s = q.toString();
  return s ? `/eventi?${s}` : '/eventi';
}

function Chip({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={to} scroll={false} aria-current={active ? 'true' : undefined} className={active ? 'chip on' : 'chip'} style={{ whiteSpace: 'nowrap' }}>
      {children}
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span className="eyebrow" style={{ margin: 0, minWidth: '5.5rem' }}>
        {label}
      </span>
      {children}
    </div>
  );
}

export function CalendarFilterBar({ filters, months, categories }: { filters: CalendarFilters; months: string[]; categories: Array<{ value: EventCategory; label: string }> }) {
  if (!months.length && !categories.length) return null;
  return (
    <nav aria-label="Filtra il calendario" style={{ display: 'grid', gap: 14, marginBottom: 36 }}>
      {categories.length > 1 && (
        <Row label="Categoria">
          <Chip to={href({ ...filters, category: null })} active={!filters.category}>
            Tutte
          </Chip>
          {categories.map((c) => (
            <Chip key={c.value} to={href({ ...filters, category: c.value })} active={filters.category === c.value}>
              {c.label}
            </Chip>
          ))}
        </Row>
      )}
      {months.length > 1 && (
        <Row label="Mese">
          <Chip to={href({ ...filters, month: null })} active={!filters.month}>
            Tutti
          </Chip>
          {months.map((m) => (
            <Chip key={m} to={href({ ...filters, month: m })} active={filters.month === m}>
              {monthLabel(m)}
            </Chip>
          ))}
        </Row>
      )}
    </nav>
  );
}
