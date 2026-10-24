import { Camera, Clock, Undo2, type LucideIcon } from 'lucide-react';
import type { TodoCounts } from '@/server/admin/todo';

export type TodoRow = { key: string; icon: LucideIcon; count: number; text: (n: number) => string; href: string };

/** Elenco delle cose da fare, condiviso da campanella e Panoramica. */
export function todoRows(counts: TodoCounts): TodoRow[] {
  return [
    { key: 'refunds', icon: Undo2, count: counts.refunds, text: (n) => (n === 1 ? '1 richiesta di rimborso da gestire' : `${n} richieste di rimborso da gestire`), href: '/admin/rimborsi' },
    { key: 'photos', icon: Camera, count: counts.photos, text: (n) => (n === 1 ? '1 foto da moderare' : `${n} foto da moderare`), href: '/admin/e/zuccaland-2026/m/visitor-photos' },
    { key: 'pending', icon: Clock, count: counts.stalePending, text: (n) => (n === 1 ? '1 ordine in attesa da più di un’ora' : `${n} ordini in attesa da più di un’ora`), href: '/admin/ordini' },
  ];
}
