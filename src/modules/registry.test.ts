import { describe, expect, it } from 'vitest';
import { dependencyProblems, dependents, extensionPoints, getModule, MODULES, moduleSettings } from './registry';
import { settingsFields } from './settings-form';

describe('registro dei moduli', () => {
  it('chiavi uniche, dipendenze verso moduli esistenti, default validi', () => {
    expect(new Set(MODULES.map((m) => m.key)).size).toBe(MODULES.length);
    for (const m of MODULES) {
      for (const d of m.dependsOn ?? []) expect(getModule(d)).not.toBeNull();
      expect(m.settingsSchema.safeParse({}).success).toBe(true);
    }
  });

  it('impostazioni non valide tornano ai default', () => {
    expect(moduleSettings('paylink', { paylink: { validityHours: 9999 } })).toEqual({ validityHours: 48 });
    expect(moduleSettings('paylink', { paylink: { validityHours: 6 } })).toEqual({ validityHours: 6 });
    expect(moduleSettings('paylink', null)).toEqual({ validityHours: 48 });
  });

  it('dipendenze', () => {
    expect(dependencyProblems(['postponement'])).toEqual([{ module: 'postponement', missing: 'time-slots' }]);
    expect(dependencyProblems(['postponement', 'time-slots'])).toEqual([]);
    expect(dependents('time-slots', ['time-slots', 'postponement']).map((m) => m.key)).toEqual(['postponement']);
  });

  it('i punti di estensione raccolgono solo i moduli attivi', () => {
    const none = { enabledModules: [], moduleSettings: {} };
    for (const point of Object.values(extensionPoints)) expect(point(none)).toEqual([]);
    const zucca = {
      enabledModules: ['time-slots', 'activities', 'postponement', 'paylink', 'visitor-photos', 'chiave-rimossa'],
      moduleSettings: { activities: { scannerCounters: [{ label: '+1 Bambino', questionKey: 'bambini', increment: 1 }] } },
    };
    expect(extensionPoints.scannerActions(zucca)).toEqual([{ key: 'counter-0', label: '+1 Bambino', questionKey: 'bambini', increment: 1 }]);
    expect(extensionPoints.orderActions(zucca).map((a) => a.key)).toEqual(expect.arrayContaining(['move-session', 'paylink']));
    expect(extensionPoints.nav(zucca).map((n) => n.key)).toEqual(['activities', 'postponement', 'visitor-photos']);
  });
});

describe('form delle impostazioni dallo schema', () => {
  it('campi semplici con etichette e limiti', () => {
    expect(settingsFields(getModule('time-slots')!)).toEqual([
      { key: 'showRemaining', kind: 'boolean', label: 'Mostra i posti rimasti', help: 'Nel checkout, accanto a ogni data.' },
      { key: 'lowThreshold', kind: 'number', label: 'Avviso “ultimi posti” sotto', help: 'Numero di posti.', min: 0, max: 1000, integer: true },
      { key: 'closeMinutesBefore', kind: 'number', label: 'Chiudi la vendita online prima dell’inizio', help: 'Minuti. 0 = fino all’inizio.', min: 0, max: 1440, integer: true },
    ]);
  });

  it('liste di oggetti diventano un elenco ripetibile con scelte e default', () => {
    const fields = settingsFields(getModule('activities')!);
    const list = fields.find((f) => f.key === 'activities')!;
    expect(list).toMatchObject({ kind: 'list', label: 'Attività gratuite', maxItems: 30 });
    if (list.kind !== 'list') throw new Error();
    expect(list.item.find((f) => f.key === 'target')).toMatchObject({ kind: 'enum', label: 'Per chi', options: ['bambini', 'tutti'] });
    expect(list.item.find((f) => f.key === 'sessionIds')).toEqual({ key: 'sessionIds', kind: 'sessions', label: 'Giorni', help: 'Nessuno selezionato = tutti i giorni.' });
    expect(list.itemDefaults).toMatchObject({ target: 'bambini', sessionIds: [], maxPlaces: 0, details: '' });
    expect(fields.find((f) => f.key === 'labProductId')).toMatchObject({ kind: 'product', label: 'Laboratorio a pagamento' });
  });

  it('ogni modulo ha un form disegnabile ed etichette per tutti i campi', () => {
    for (const m of MODULES) {
      const fields = settingsFields(m);
      const labelled = (fs: typeof fields): boolean => fs.every((f) => f.label !== f.key && (f.kind !== 'list' || labelled(f.item)));
      expect(labelled(fields), m.key).toBe(true);
    }
  });
});
