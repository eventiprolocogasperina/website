'use client';

import { Bell, Settings, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminHeader({ title, subtitle, actions }: AdminHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 400, color: 'var(--color-heading)' }}>
          {title}
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)' }}>
          {subtitle || 'Pro Loco Gasperina APS · Area Amministrativa'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', position: 'relative' }}>
        {actions && <div>{actions}</div>}

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }}
            style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-full)', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: showNotifications ? 'var(--blue-400)' : 'var(--neutral-400)', transition: 'all 0.2s' }}
          >
            <Bell size={16} />
          </button>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, background: 'var(--red-500)', border: '2px solid var(--background)', borderRadius: '50%' }} />
          {showNotifications && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '320px', background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', zIndex: 100, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              <h4 style={{ color: 'var(--color-heading)', fontSize: '0.95rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--neutral-800)' }}>Notifiche</h4>
              <p style={{ color: 'var(--neutral-500)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>Nessuna nuova notifica</p>
            </div>
          )}
        </div>

        {/* Settings */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); }}
            style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-full)', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: showSettings ? 'var(--blue-400)' : 'var(--neutral-400)', transition: 'all 0.2s' }}
          >
            <Settings size={16} />
          </button>
          {showSettings && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '220px', background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: 'var(--radius-lg)', padding: '0.5rem', zIndex: 100, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--neutral-800)', marginBottom: '0.5rem' }}>
                <p style={{ color: 'var(--color-heading)', fontSize: '0.85rem', fontWeight: 600 }}>Admin Pro Loco</p>
                <p style={{ color: 'var(--neutral-400)', fontSize: '0.75rem' }}>admin@prolocogasperina.it</p>
              </div>
              <button
                onClick={toggleTheme}
                style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', color: 'var(--neutral-300)', fontSize: '0.85rem', cursor: 'pointer', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                Tema: {theme === 'dark' ? 'Chiaro' : 'Scuro'}
              </button>
              <div style={{ height: 1, background: 'var(--neutral-800)', margin: '0.5rem 0' }} />
              <button
                onClick={() => { sessionStorage.removeItem('admin_auth'); window.location.reload(); }}
                style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', color: 'var(--red-400)', fontSize: '0.85rem', cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
              >
                Log out
              </button>
            </div>
          )}
        </div>

        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', background: 'var(--blue-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>
          A
        </div>
      </div>
    </div>
  );
}
