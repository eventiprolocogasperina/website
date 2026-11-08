import { describe, expect, it } from 'vitest';
import { isRedesignedPath } from './redesign';

describe('isRedesignedPath', () => {
  it('covers the redesigned public pages', () => {
    for (const p of ['/', '/eventi', '/notizie/x', '/media', '/privacy', '/sponsor/']) expect(isRedesignedPath(p)).toBe(true);
  });
  it('leaves format pages, checkout, tickets and admin alone', () => {
    for (const p of ['/zuccaland', '/zuccaland/2026', '/assaggia-e-passeggia', '/eventi/la-baguette-da-record-2026', '/acquista/x', '/i-miei-biglietti/t', '/admin', '/eventi-x', null]) expect(isRedesignedPath(p)).toBe(false);
  });
});
