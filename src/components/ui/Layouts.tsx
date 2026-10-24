import type { ReactNode } from 'react';
import { cn } from './cn';

export type AnnotatedSectionProps = {
  /** Titolo della sezione a sinistra. */
  title: ReactNode;
  /** Spiegazione: a cosa servono questi campi e cosa cambia per il pubblico. */
  description?: ReactNode;
  /** I campi, di solito dentro una Card. */
  children: ReactNode;
  className?: string;
};

/** Sezione di un modulo: titolo e descrizione a sinistra, campi a destra (stile Polaris, §11.3). */
export function AnnotatedSection({ title, description, children, className }: AnnotatedSectionProps) {
  return (
    <section className={cn('grid gap-4 border-b border-border py-6 first:pt-0 last:border-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-8', className)}>
      <div>
        <h2 className="text-section font-semibold text-fg">{title}</h2>
        {description && <p className="mt-1 text-body text-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export type TwoColumnLayoutProps = {
  /** Contenuto principale (2/3). */
  main: ReactNode;
  /** Metadati e relazioni (1/3); su mobile va dopo il principale. */
  aside: ReactNode;
  /** Cronologia o altro contenuto a tutta larghezza in fondo. */
  footer?: ReactNode;
  className?: string;
};

/** Due colonne del modello Dettaglio (§11.2). */
export function TwoColumnLayout({ main, aside, footer, className }: TwoColumnLayoutProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">{main}</div>
        <aside className="flex min-w-0 flex-col gap-4">{aside}</aside>
      </div>
      {footer}
    </div>
  );
}
