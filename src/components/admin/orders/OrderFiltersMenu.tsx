'use client';

import { SlidersHorizontal } from 'lucide-react';
import { Badge, Button, Checkbox, DatePicker, Field, Input, Popover, PopoverContent, PopoverTrigger, Select, type FilterChip } from '@/components/ui';
import { CHANNEL_LABELS, countActiveFilters, ORDER_CHANNEL_KEYS, ORDER_STATUSES, type OrderFilters } from '@/lib/admin/order-filters';
import { STATUS_META } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/dates';

// Filtri dell'elenco ordini in un popover, e chip dei filtri attivi. Ogni modifica cambia l'URL.

const ANY = '__tutti';
type Option = { value: string; label: string };
const statusLabel = (s: string) => (STATUS_META as Record<string, { label: string }>)[s]?.label ?? s;

export function OrderFiltersMenu({
  filters,
  onChange,
  sessions,
  editions,
}: {
  filters: OrderFilters;
  onChange: (next: Partial<OrderFilters>) => void;
  sessions: Option[] | null;
  editions: Option[] | null;
}) {
  const active = countActiveFilters(filters);
  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" icon={SlidersHorizontal}>
          Filtri
          {active > 0 && <Badge tone="primary">{active}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,26rem)]">
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-1">
          {editions && (
            <Field label="Edizione">
              <Select value={filters.edition || ANY} onValueChange={(v) => onChange({ edition: v === ANY ? '' : v, session: '' })} options={[{ value: ANY, label: 'Tutte' }, ...editions]} />
            </Field>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label font-medium">Stato del pagamento</legend>
            <div className="grid grid-cols-2 gap-2">
              {ORDER_STATUSES.map((s) => (
                <Checkbox key={s} label={statusLabel(s)} checked={filters.status.includes(s)} onCheckedChange={() => onChange({ status: toggle(filters.status, s) })} />
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label font-medium">Canale</legend>
            <div className="grid grid-cols-2 gap-2">
              {ORDER_CHANNEL_KEYS.map((c) => (
                <Checkbox key={c} label={CHANNEL_LABELS[c]} checked={filters.channel.includes(c)} onCheckedChange={() => onChange({ channel: toggle(filters.channel, c) })} />
              ))}
            </div>
          </fieldset>
          {sessions && (
            <Field label="Sessione">
              <Select value={filters.session || ANY} onValueChange={(v) => onChange({ session: v === ANY ? '' : v })} options={[{ value: ANY, label: 'Tutte' }, ...sessions]} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Creati dal">
              <DatePicker value={filters.from} onValueChange={(v) => onChange({ from: v })} />
            </Field>
            <Field label="al">
              <DatePicker value={filters.to} onValueChange={(v) => onChange({ to: v })} />
            </Field>
          </div>
          <Field label="Codice sconto" help="Scrivi “si” per tutti gli ordini con uno sconto.">
            <Input
              defaultValue={filters.discount}
              key={filters.discount}
              placeholder="ES. SOCI10"
              onBlur={(e) => e.target.value.trim() !== filters.discount && onChange({ discount: e.target.value.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && onChange({ discount: e.currentTarget.value.trim() })}
            />
          </Field>
          <Field label="Blacklist">
            <Select
              value={filters.blacklist || ANY}
              onValueChange={(v) => onChange({ blacklist: v === ANY ? '' : (v as 'si' | 'no') })}
              options={[
                { value: ANY, label: 'Tutti gli ordini' },
                { value: 'si', label: 'Solo in blacklist' },
                { value: 'no', label: 'Escludi la blacklist' },
              ]}
            />
          </Field>
          <Checkbox label="Solo ordini con un rimborso" checked={filters.refund} onCheckedChange={(v) => onChange({ refund: v })} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Chip dei filtri attivi, ognuno con la sua X. */
export function orderFilterChips(f: OrderFilters, onChange: (next: Partial<OrderFilters>) => void, names: { sessions: Option[] | null; editions: Option[] | null }): FilterChip[] {
  const label = (list: Option[] | null, v: string) => list?.find((o) => o.value === v)?.label ?? v;
  const chips: FilterChip[] = [];
  if (f.edition) chips.push({ key: 'edition', label: `Edizione: ${label(names.editions, f.edition)}`, onRemove: () => onChange({ edition: '', session: '' }) });
  if (f.status.length) chips.push({ key: 'status', label: `Stato: ${f.status.map(statusLabel).join(', ')}`, onRemove: () => onChange({ status: [] }) });
  if (f.channel.length) chips.push({ key: 'channel', label: `Canale: ${f.channel.map((c) => CHANNEL_LABELS[c]).join(', ')}`, onRemove: () => onChange({ channel: [] }) });
  if (f.session) chips.push({ key: 'session', label: `Sessione: ${label(names.sessions, f.session)}`, onRemove: () => onChange({ session: '' }) });
  if (f.from || f.to) {
    const text = f.from && f.to ? `dal ${formatDate(f.from, 'short')} al ${formatDate(f.to, 'short')}` : f.from ? `dal ${formatDate(f.from, 'short')}` : `fino al ${formatDate(f.to, 'short')}`;
    chips.push({ key: 'dates', label: `Creati ${text}`, onRemove: () => onChange({ from: '', to: '' }) });
  }
  if (f.discount) chips.push({ key: 'discount', label: f.discount === 'si' ? 'Con sconto' : `Sconto: ${f.discount.toUpperCase()}`, onRemove: () => onChange({ discount: '' }) });
  if (f.blacklist) chips.push({ key: 'blacklist', label: f.blacklist === 'si' ? 'In blacklist' : 'Senza blacklist', onRemove: () => onChange({ blacklist: '' }) });
  if (f.refund) chips.push({ key: 'refund', label: 'Con rimborso', onRemove: () => onChange({ refund: false }) });
  return chips;
}
