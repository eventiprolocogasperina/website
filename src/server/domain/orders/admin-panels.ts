import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { attendeeAnswers, sessions } from '@/server/db/schema';
import { ANSWER_KEYS, type ActivitiesSettings } from '@/modules/activities/module';
import { normalizeChoice, readChoice } from '@/modules/activities/rules';
import { postponementRefundRight } from '@/modules/postponement/server';
import { moduleSettings } from '@/modules/registry';

// Dati dei riquadri dei moduli nella pagina dell'ordine (§10.5, punto di estensione orderPanels).
// Ogni modulo che dichiara un riquadro ha qui il suo caricatore; l'interfaccia ha il componente
// con la stessa chiave (src/components/admin/orders/detail/panels.tsx).

type PanelOrder = { id: string; sessionId: string | null; originalSessionId: string | null };
type PanelEdition = { moduleSettings: Record<string, unknown> };

export type ActivitiesPanelData = {
  children: number | null;
  activities: Array<{ key: string; label: string }>;
  /** Le altre risposte (domande in più, "attività per"): etichetta e valore già testuali. */
  other: Array<{ label: string; value: string }>;
};

export type PostponementPanelData = {
  original: { label: string; startsAt: string; status: string } | null;
  current: { label: string; startsAt: string; status: string } | null;
  right: { eligible: boolean; postponements: number; reason: string };
};

export type PanelData = { activities: ActivitiesPanelData; postponement: PostponementPanelData };
export type PanelKey = keyof PanelData;

const text = (v: unknown): string => (Array.isArray(v) ? v.map(text).join(', ') : v && typeof v === 'object' ? Object.values(v).map(text).join(' · ') : String(v ?? '—'));

async function activitiesPanel(order: PanelOrder, edition: PanelEdition): Promise<ActivitiesPanelData> {
  const settings = moduleSettings('activities', edition.moduleSettings) as ActivitiesSettings;
  const answers = await getDb().select({ questionKey: attendeeAnswers.questionKey, value: attendeeAnswers.value }).from(attendeeAnswers).where(eq(attendeeAnswers.orderId, order.id));
  const choice = normalizeChoice(settings, readChoice(answers));
  const known = new Set<string>([ANSWER_KEYS.children, ANSWER_KEYS.activities]);
  return {
    children: choice.children,
    activities: choice.activities.map((key) => ({ key, label: settings.activities.find((a) => a.key === key)?.label ?? key })),
    other: answers
      .filter((a) => !known.has(a.questionKey))
      .map((a) => ({ label: settings.questions.find((q) => q.key === a.questionKey)?.label ?? (a.questionKey === 'attivita_per' ? 'Attività per' : a.questionKey), value: text(a.value) })),
  };
}

async function postponementPanel(order: PanelOrder): Promise<PostponementPanelData> {
  const ids = [order.originalSessionId, order.sessionId].filter((x): x is string => !!x);
  const rows = ids.length ? await getDb().select({ id: sessions.id, label: sessions.label, startsAt: sessions.startsAt, status: sessions.status }).from(sessions).where(inArray(sessions.id, ids)) : [];
  const pick = (id: string | null) => {
    const s = rows.find((r) => r.id === id);
    return s ? { label: s.label, startsAt: s.startsAt.toISOString(), status: s.status } : null;
  };
  return { original: order.originalSessionId ? pick(order.originalSessionId) : null, current: pick(order.sessionId), right: await postponementRefundRight(order.id) };
}

const LOADERS: { [K in PanelKey]: (order: PanelOrder, edition: PanelEdition) => Promise<PanelData[K]> } = {
  activities: activitiesPanel,
  postponement: postponementPanel,
};

export type LoadedPanel = { [K in PanelKey]: { key: K; title: string; data: PanelData[K] } }[PanelKey];

/** Carica i riquadri richiesti; quelli senza caricatore (moduli futuri) si saltano. */
export async function loadPanels(panels: Array<{ key: string; title: string }>, order: PanelOrder, edition: PanelEdition): Promise<LoadedPanel[]> {
  const out: LoadedPanel[] = [];
  for (const p of panels) {
    if (!(p.key in LOADERS)) continue;
    const key = p.key as PanelKey;
    out.push({ key, title: p.title, data: await LOADERS[key](order, edition) } as LoadedPanel);
  }
  return out;
}
