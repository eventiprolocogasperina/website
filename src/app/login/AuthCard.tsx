import Image from 'next/image';
import type { ReactNode } from 'react';

/** Cornice delle pagine di accesso: login, password dimenticata, nuova password, abbinamento. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="ui-root flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image src="/img/Logo_color_sm.png" alt="" width={48} height={48} className="h-12 w-12 object-contain" />
          <div>
            <p className="text-label font-medium text-muted">Pro Loco Gasperina</p>
            <h1 className="text-title font-semibold text-fg">{title}</h1>
            {subtitle && <p className="mt-1 text-body text-muted">{subtitle}</p>}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">{children}</div>
        {footer && <div className="mt-4 text-center text-label text-muted">{footer}</div>}
      </div>
    </div>
  );
}
