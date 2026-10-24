'use client';

import { Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, cn } from '@/components/ui';

/** "Annulla ultimo" con i secondi che restano; dopo "Fai entrare N" annulla tutti gli N. */
export function UndoBar({ until, count = 1, onUndo, className }: { until: number; count?: number; onUndo: () => Promise<boolean | undefined | void>; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  if (!left) return null;
  return (
    <Button variant="secondary" icon={Undo2} className={cn('mx-auto w-full max-w-md', className)} onClick={() => void onUndo()}>
      {count > 1 ? `Annulla gli ultimi ${count} ingressi` : 'Annulla ultimo ingresso'} ({left} s)
    </Button>
  );
}
