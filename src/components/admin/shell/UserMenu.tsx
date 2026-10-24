'use client';

import { KeyRound, LogOut, Moon, Sun, User } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Avatar, cn, DropdownMenu, toast, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, focusRing } from '@/components/ui';

export type ShellUser = { name: string; email: string | null; legacy: boolean };

/** Menu utente: profilo, password, tema, esci (§10.2). */
export function UserMenu({ user }: { user: ShellUser }) {
  const { theme, toggleTheme } = useTheme();
  const name = user.name;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn('rounded-full', focusRing)} aria-label="Menu utente">
        <Avatar name={name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block">{name}</span>
          {user.email && <span className="block text-caption font-normal text-muted">{user.email}</span>}
        </DropdownMenuLabel>
        {!user.legacy && (
          <DropdownMenuItem icon={User} onSelect={() => (window.location.href = '/admin/profilo')}>
            Profilo e PIN
          </DropdownMenuItem>
        )}
        {!user.legacy && user.email && (
          <DropdownMenuItem
            icon={KeyRound}
            onSelect={async () => {
              const res = await fetch('/api/auth/password-link', { method: 'POST' });
              if (res.ok) toast.success('Ti abbiamo mandato un link per cambiare la password.');
              else toast.error('Non è stato possibile mandare il link. Riprova.');
            }}
          >
            Cambia password
          </DropdownMenuItem>
        )}
        <DropdownMenuItem icon={theme === 'dark' ? Sun : Moon} onSelect={toggleTheme}>
          {theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          icon={LogOut}
          tone="danger"
          onSelect={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
        >
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
