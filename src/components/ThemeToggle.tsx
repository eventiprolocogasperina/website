'use client';

import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <button className={`p-2 rounded-full bg-neutral-800 text-transparent border border-neutral-700 shadow-sm ${className}`} aria-hidden="true"><Sun size={18} /></button>;
  }

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors flex items-center justify-center border border-neutral-700 shadow-sm ${className}`}
      aria-label="Toggle dark mode"
      title={theme === 'dark' ? "Passa a modalità chiara" : "Passa a modalità scura"}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
