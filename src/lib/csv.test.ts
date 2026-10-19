import { describe, expect, it } from 'vitest';
import { csvMoney, toCsv } from './csv';

describe('toCsv', () => {
  it('separa con il punto e virgola, mette le virgolette e disinnesca le formule', () => {
    const out = toCsv(['Nome', 'Nota'], [['Rossi; Mario', '=HYPERLINK("x")'], ['-12,50', null], [true, 3]]);
    expect(out).toBe('﻿Nome;Nota\r\n"Rossi; Mario";"\'=HYPERLINK(""x"")"\r\n-12,50;\r\nsì;3\r\n');
    expect(csvMoney(1050)).toBe('10,50');
  });
});
