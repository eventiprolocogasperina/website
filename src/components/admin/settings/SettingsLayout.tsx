import type { ReactNode } from 'react';
import { cn } from '@/components/ui';

export type SettingsSectionLink = { id: string; label: string };

/**
 * Modello Impostazioni (§11.4): sezioni a sinistra, modulo a destra. Su mobile le sezioni diventano
 * una riga di collegamenti scorrevole sopra il contenuto.
 */
export function SettingsLayout({ sections, children, className }: { sections: SettingsSectionLink[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,1fr)]', className)}>
      <nav aria-label="Sezioni" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {sections.map((s) => (
            <li key={s.id} className="shrink-0">
              <a href={`#${s.id}`} className="block rounded-md px-3 py-2 text-body text-muted hover:bg-surface-sunken hover:text-fg focus-visible:outline-2 focus-visible:outline-primary">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </div>
  );
}
