// Mappa del sistema in admin: ogni errore del log finisce sul nodo giusto, il colore segue l'età.
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { errorLevel, nodeForError } = await import('./systemMap');

describe('mappa del sistema', () => {
  it('collega i testi dei log ai nodi', () => {
    expect(nodeForError('Nexi: firma non valida, pagamento non confermato')).toBe('pagamenti');
    expect(nodeForError('Email del link di pagamento non inviata')).toBe('email');
    expect(nodeForError('Email dei biglietti non inviata · ResendError')).toBe('email');
    expect(nodeForError('Scanner: richiesta non riuscita')).toBe('ingresso');
    expect(nodeForError('Errore nelle rotte della cassa')).toBe('cassa');
    expect(nodeForError('Coda rimborsi non caricata')).toBe('rimborsi');
    expect(nodeForError('Scadenza degli ordini non riuscita')).toBe('automatismi');
    expect(nodeForError('Elenco ordini non caricato')).toBe('ordini');
    expect(nodeForError('Sitemap: eventi non disponibili')).toBe('sito');
    expect(nodeForError('login: AUTH_SECRET non impostato')).toBe('accessi');
    expect(nodeForError('qualcosa di nuovo')).toBe('altro');
  });

  it('rosso nell’ultima ora, poi giallo', () => {
    const now = new Date('2026-11-09T12:00:00Z');
    expect(errorLevel(new Date('2026-11-09T11:30:00Z'), now)).toBe('error');
    expect(errorLevel(new Date('2026-11-08T12:00:00Z'), now)).toBe('warn');
  });
});
