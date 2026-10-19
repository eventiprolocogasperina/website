'use client';

import { KeyRound, LogOut, Moon, Sun, User } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Avatar, cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, focusRing } from '@/components/ui';

/** Menu utente: profilo, password, tema, esci (§10.2). Profilo e password arrivano con il prompt 07. */
export function UserMenu({ name = 'Amministratore' }: { name?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn('rounded-full', focusRing)} aria-label="Menu utente">
        <Avatar name={name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{name}</DropdownMenuLabel>
        <DropdownMenuItem icon={User} disabled shortcut="presto">
          Profilo
        </DropdownMenuItem>
        <DropdownMenuItem icon={KeyRound} disabled shortcut="presto">
          Cambia password
        </DropdownMenuItem>
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
