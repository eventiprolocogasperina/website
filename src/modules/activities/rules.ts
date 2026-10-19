// Regole del modulo Attività e laboratori, senza database: le usano il controllo dell'ordine e i test.
import { ANSWER_KEYS, type ActivitiesSettings } from './module';

export type ActivityChoice = { children: number | null; activities: string[] };

/** Bambini e attività scelti, dalle risposte dell'ordine. Accetta anche il formato della migrazione ({ bambini, iscritti }). */
export function readChoice(answers: Array<{ questionKey: string; value: unknown }>): ActivityChoice {
  const raw = answers.find((a) => a.questionKey === ANSWER_KEYS.children)?.value;
  const children = typeof raw === 'number' ? raw : raw && typeof raw === 'object' && 'bambini' in raw ? Number((raw as { bambini: unknown }).bambini) : null;
  const acts = answers.find((a) => a.questionKey === ANSWER_KEYS.activities)?.value;
  return { children: Number.isFinite(children) ? children : null, activities: Array.isArray(acts) ? acts.map(String) : [] };
}

/**
 * Le risposte migrate dal sistema di oggi contengono il nome dell'attività ("Zuccart (3-7 anni)"),
 * quelle nuove il codice: qui tutto diventa codice. Nomi sconosciuti restano come sono.
 */
export function normalizeChoice(settings: ActivitiesSettings, choice: ActivityChoice): ActivityChoice {
  const norm = (s: string) => s.trim().toLowerCase();
  return {
    ...choice,
    activities: choice.activities.map((x) => settings.activities.find((a) => a.key === x || norm(a.label) === norm(x))?.key ?? x),
  };
}

/** Posti che un ordine occupa in un'attività: i bambini, o tutti gli ingressi se l'attività è per tutti. */
export function placesTaken(target: 'bambini' | 'tutti', choice: ActivityChoice, admissions: number): number {
  return target === 'tutti' ? admissions : (choice.children ?? 0);
}

/**
 * Controlla le scelte di un ordine nuovo. `used` sono i posti già occupati per attività nella data
 * dell'ordine (ordini pagati o in attesa non scaduti). Restituisce il problema, o null.
 */
export function activityProblem(
  settings: ActivitiesSettings,
  input: { sessionId: string | null; admissions: number; choice: ActivityChoice; used: Map<string, number> },
): string | null {
  const { admissions } = input;
  const choice = normalizeChoice(settings, input.choice);
  if (choice.children !== null) {
    if (!Number.isInteger(choice.children) || choice.children < 0) return 'Numero di bambini non valido.';
    if (choice.children > admissions) return 'I bambini non possono essere più degli ingressi.';
  }
  if (new Set(choice.activities).size !== choice.activities.length) return 'Un’attività è scelta due volte.';
  for (const key of choice.activities) {
    const a = settings.activities.find((x) => x.key === key);
    if (!a) return 'Un’attività scelta non esiste più. Ricarica la pagina.';
    if (a.sessionIds.length && (!input.sessionId || !a.sessionIds.includes(input.sessionId))) return `“${a.label}” non c’è nel giorno scelto.`;
    const need = placesTaken(a.target, choice, admissions);
    if (a.target === 'bambini' && need === 0) return `“${a.label}” è per i bambini: indica quanti sono.`;
    if (a.maxPlaces > 0 && (input.used.get(key) ?? 0) + need > a.maxPlaces) {
      const left = Math.max(0, a.maxPlaces - (input.used.get(key) ?? 0));
      return left ? `“${a.label}”: ${left === 1 ? 'resta 1 posto' : `restano ${left} posti`}.` : `“${a.label}” è al completo per questo giorno.`;
    }
  }
  return null;
}
