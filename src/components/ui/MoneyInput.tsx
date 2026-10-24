'use client';

import { useState } from 'react';
import { Input, type InputProps } from './Input';

export type MoneyInputProps = Omit<InputProps, 'value' | 'onChange' | 'type' | 'prefix' | 'defaultValue'> & {
  /** Importo in centesimi; null se il campo è vuoto. */
  value: number | null;
  /** Riceve i centesimi (interi) o null; mai euro decimali. */
  onValueChange: (cents: number | null) => void;
  /** Ammette importi negativi (rettifiche). Default: no. */
  allowNegative?: boolean;
};

function formatCents(cents: number | null): string {
  if (cents === null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

/** Converte "12,5", "12.50", "1.234,56" in centesimi. Restituisce undefined se il testo non è un importo. */
export function parseMoneyInput(text: string, allowNegative = false): number | null | undefined {
  const t = text.trim().replace(/\s|€/g, '');
  if (t === '') return null;
  // Con virgola decimale i punti sono separatori delle migliaia; senza virgola il punto è decimale.
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  if (!/^-?\d+(\.\d{0,2})?$/.test(normalized)) return undefined;
  const [int, dec = ''] = normalized.replace('-', '').split('.');
  const cents = Number(int) * 100 + Number(dec.padEnd(2, '0'));
  const signed = normalized.startsWith('-') ? -cents : cents;
  if (signed < 0 && !allowNegative) return undefined;
  return signed;
}

/** Campo importo in euro che lavora in centesimi (§14.5). Formatta "12,50" quando perde il focus. */
export function MoneyInput({ value, onValueChange, allowNegative = false, onBlur, invalid, ...props }: MoneyInputProps) {
  const [text, setText] = useState(() => formatCents(value));
  const [lastValue, setLastValue] = useState(value);
  const [bad, setBad] = useState(false);

  // Se il valore cambia da fuori (reset del modulo), riallinea il testo.
  if (value !== lastValue) {
    setLastValue(value);
    if (parseMoneyInput(text, allowNegative) !== value) setText(formatCents(value));
  }

  return (
    <Input
      inputMode="decimal"
      autoComplete="off"
      {...props}
      invalid={invalid || bad}
      value={text}
      prefix={<span aria-hidden>€</span>}
      className={['tabular-nums', props.className].filter(Boolean).join(' ')}
      onChange={(e) => {
        setText(e.target.value);
        const cents = parseMoneyInput(e.target.value, allowNegative);
        setBad(cents === undefined);
        if (cents !== undefined) {
          setLastValue(cents);
          onValueChange(cents);
        }
      }}
      onBlur={(e) => {
        const cents = parseMoneyInput(text, allowNegative);
        if (cents !== undefined) setText(formatCents(cents));
        onBlur?.(e);
      }}
    />
  );
}
