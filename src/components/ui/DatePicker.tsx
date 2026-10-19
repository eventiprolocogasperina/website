'use client';

import { CalendarDays } from 'lucide-react';
import { Input } from './Input';

export type DatePickerProps = {
  /** Data "YYYY-MM-DD" (o "YYYY-MM-DDTHH:mm" con `withTime`), sempre ora di Roma. Stringa vuota se assente. */
  value: string;
  onValueChange: (value: string) => void;
  /** Aggiunge l'ora (input datetime-local). */
  withTime?: boolean;
  /** Limiti nello stesso formato di `value`. */
  min?: string;
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  name?: string;
  className?: string;
};

/**
 * Selettore di data. Usa il calendario nativo del dispositivo: su telefono è il più comodo e
 * non richiede librerie aggiuntive. Il valore è in ora locale di Roma: convertilo con src/lib/dates.ts.
 */
export function DatePicker({ value, onValueChange, withTime, ...props }: DatePickerProps) {
  return (
    <Input
      type={withTime ? 'datetime-local' : 'date'}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      prefix={<CalendarDays size={16} aria-hidden />}
      {...props}
    />
  );
}
