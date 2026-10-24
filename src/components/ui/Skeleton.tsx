import { cn } from './cn';

export type SkeletonProps = {
  /** Classi per forma e dimensione (es. "h-4 w-32"). */
  className?: string;
};

/** Segnaposto di caricamento con la forma del contenuto (§11.6: mai spinner a tutta pagina). */
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-border motion-reduce:animate-none', className)} />;
}

/** Righe di testo finte. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} role="status" aria-label="Caricamento">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
