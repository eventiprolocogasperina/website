import { describe, expect, it } from 'vitest';
import { activitiesSettings } from './module';
import { activityProblem, readChoice } from './rules';

const SAB = '11111111-1111-4111-8111-111111111111';
const DOM = '22222222-2222-4222-8222-222222222222';
const settings = activitiesSettings.parse({
  activities: [
    { key: 'zucca_vaso', label: 'Zucca in Vaso', sessionIds: [SAB], maxPlaces: 60 },
    { key: 'zuccart', label: 'Zuccart' },
    { key: 'caccia', label: 'Caccia al tesoro', target: 'tutti', maxPlaces: 10 },
  ],
});
const check = (choice: { children: number | null; activities: string[] }, opts: { sessionId?: string; admissions?: number; used?: Record<string, number> } = {}) =>
  activityProblem(settings, { sessionId: opts.sessionId ?? SAB, admissions: opts.admissions ?? 3, choice, used: new Map(Object.entries(opts.used ?? {})) });

describe('attività e laboratori', () => {
  it('legge le risposte nuove e quelle migrate', () => {
    expect(readChoice([{ questionKey: 'bambini', value: 2 }, { questionKey: 'attivita', value: ['zuccart'] }])).toEqual({ children: 2, activities: ['zuccart'] });
    expect(readChoice([{ questionKey: 'bambini', value: { bambini: 1, iscritti: 2 } }])).toEqual({ children: 1, activities: [] });
    expect(readChoice([])).toEqual({ children: null, activities: [] });
  });

  it('i bambini non superano gli ingressi', () => {
    expect(check({ children: 3, activities: [] })).toBeNull();
    expect(check({ children: 4, activities: [] })).toMatch(/più degli ingressi/);
    expect(check({ children: -1, activities: [] })).toMatch(/non valido/);
  });

  it('un’attività vale solo nei suoi giorni', () => {
    expect(check({ children: 1, activities: ['zucca_vaso'] })).toBeNull();
    expect(check({ children: 1, activities: ['zucca_vaso'] }, { sessionId: DOM })).toMatch(/non c’è nel giorno scelto/);
    expect(check({ children: 1, activities: ['zuccart'] }, { sessionId: DOM })).toBeNull();
  });

  it('le attività per bambini richiedono almeno un bambino', () => {
    expect(check({ children: 0, activities: ['zuccart'] })).toMatch(/per i bambini/);
    expect(check({ children: null, activities: ['caccia'] })).toBeNull();
  });

  it('posti: bambini per le attività dei bambini, ingressi per quelle di tutti', () => {
    expect(check({ children: 2, activities: ['zucca_vaso'] }, { used: { zucca_vaso: 58 } })).toBeNull();
    expect(check({ children: 3, activities: ['zucca_vaso'] }, { used: { zucca_vaso: 58 } })).toBe('“Zucca in Vaso”: restano 2 posti.');
    expect(check({ children: 1, activities: ['zucca_vaso'] }, { used: { zucca_vaso: 60 } })).toMatch(/al completo/);
    expect(check({ children: 0, activities: ['caccia'] }, { admissions: 3, used: { caccia: 8 } })).toMatch(/restano 2 posti/);
  });

  it('rifiuta attività inesistenti o ripetute', () => {
    expect(check({ children: 1, activities: ['boh'] })).toMatch(/non esiste più/);
    expect(check({ children: 1, activities: ['zuccart', 'zuccart'] })).toMatch(/due volte/);
  });
});

describe('risposte migrate', () => {
  it('il nome dell’attività vale come il codice', () => {
    expect(check({ children: 1, activities: ['zucca in vaso'] }, { sessionId: DOM })).toMatch(/non c’è nel giorno scelto/);
    expect(check({ children: 1, activities: ['Zuccart'] }, { sessionId: DOM })).toBeNull();
  });
});
