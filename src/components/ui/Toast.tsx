'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';
import { useTheme } from '@/components/ThemeProvider';

/**
 * Notifiche in basso a destra (§11.7). Montare una volta nel layout.
 * Uso: `toast.success('Ordine rimborsato', { action: { label: 'Annulla', onClick } })`.
 */
export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-right"
      duration={5000}
      closeButton
      toastOptions={{
        classNames: {
          toast: 'ui-root !rounded-xl !border !border-border !bg-surface-raised !text-fg !shadow-lg !font-ui',
          description: '!text-muted',
          actionButton: '!bg-primary !text-primary-fg',
          cancelButton: '!bg-surface-sunken !text-fg',
          error: '!text-danger',
          success: '!text-success',
        },
      }}
    />
  );
}

export { toast };
