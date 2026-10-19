import { type OrderWithTickets, parseOrderNotes } from '@/lib/data/tickets';
import { ManifestPdfDocument } from './manifest/ManifestPdf';
import { groupByDay, type ManifestRow } from './manifest/rows';

// Registro presenze degli ordini di oggi (tabelle `orders`/`tickets`), usato da /api/admin/orders/export-pdf.
// Dal prompt 12 il disegno sta in manifest/ManifestPdf.tsx, condiviso con la pagina Partecipanti nuova:
// qui resta solo la lettura degli ordini di oggi (note, tipi di biglietto), con le stesse regole di prima.

export interface BookingManifestPdfProps {
  orders: OrderWithTickets[];
  title?: string;
  subtitle?: string;
}

/** Formatta la data abbreviata tipo 'sab 10/10/2026' o 'dom 11/10/2026' come nell'allegato. */
function formatShortDate(eventDate: string | null, dayKey?: string): string {
  if (!eventDate) return 'N/D';
  const byDay: Record<string, string> = { '10': 'sab 10/10/2026', '11': 'dom 11/10/2026', '17': 'sab 17/10/2026', '18': 'dom 18/10/2026', '24': 'sab 24/10/2026', '25': 'dom 25/10/2026' };
  const d = eventDate.toLowerCase();
  for (const day of Object.keys(byDay)) if (d.includes(day)) return byDay[day];
  if (dayKey && byDay[dayKey]) return byDay[dayKey];
  return eventDate.length > 15 ? eventDate.substring(0, 15) : eventDate;
}

const DAY_PRIORITY: Record<string, number> = { '10': 1, '11': 2, '17': 3, '18': 4, '24': 5, '25': 6, unspecified: 99 };

/** Le tre attività di Zuccaland 2026 con la loro colonna, riconosciute dal testo delle note. */
const ZUCCALAND_ACTIVITIES = [
  { key: 'zuccart', label: 'Zuccart', match: (a: string) => a.includes('zuccart') },
  { key: 'zucca_vaso', label: 'Zucca in Vaso', match: (a: string) => a.includes('vaso') },
  { key: 'facepainting', label: 'Facepainting', match: (a: string) => a.includes('facepainting') || a.includes('thriller') },
];

const isLab = (t: { type: string }) => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio');

export function BookingManifestPdfDocument({ orders, title = 'Zuccaland 2026', subtitle }: BookingManifestPdfProps) {
  const isZuccaland = title.toLowerCase().includes('zuccaland') || !!subtitle?.toLowerCase().includes('zuccaland');
  const rows = orders.map((o) => {
    const parsed = parseOrderNotes(o.notes);
    const dayKey = parsed.dayKey || 'unspecified';
    const admTix = o.tickets.filter((t) => !isLab(t)).length;
    const acts = parsed.activities.map((a) => a.toLowerCase());
    const isPaid = o.status === 'PAID';
    const row: ManifestRow & { shortDate: string; sortKey: string } = {
      id: o.id,
      shortDate: formatShortDate(parsed.eventDate, dayKey),
      sortKey: String(DAY_PRIORITY[dayKey] ?? 50).padStart(2, '0'),
      name: o.buyerName,
      phone: o.buyerPhone || null,
      code: `#${o.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`,
      persons: admTix || o.tickets.length,
      children: parsed.children ?? 0,
      labs: o.tickets.filter(isLab).length,
      activities: parsed.activities,
      activityKeys: ZUCCALAND_ACTIVITIES.filter((z) => acts.some(z.match)).map((z) => z.key),
      detail: o.tickets.map((t) => t.type).join(', '),
      paid: isPaid,
      free: isPaid && o.totalAmount === 0,
      statusLabel: o.status,
      amountCents: Math.round(o.totalAmount * 100),
    };
    return row;
  });
  return (
    <ManifestPdfDocument
      groups={groupByDay(rows)}
      title={isZuccaland ? 'Zuccaland 2026' : title}
      subtitle={subtitle}
      layout={isZuccaland ? 'activities' : 'generic'}
      activityColumns={ZUCCALAND_ACTIVITIES}
    />
  );
}
