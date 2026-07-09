'use client';

import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'gasperina2026';
const SESSION_KEY = 'admin_auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    setAuthenticated(stored === 'true');
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Small delay for UX
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        setAuthenticated(true);
      } else {
        setError('Password non corretta. Riprova.');
        setPassword('');
      }
      setLoading(false);
    }, 400);
  };

  // Loading state — check sessionStorage
  if (authenticated === null) return null;

  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--neutral-950)',
        padding: '1.5rem',
      }}>
        {/* Background pattern */}
        <div style={{
          position: 'fixed', inset: 0,
          backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(27,75,170,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(232,169,26,0.05) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          background: 'var(--neutral-900)',
          border: '1px solid var(--neutral-700)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem 2rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}>
          {/* Logo area */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--blue-700), var(--blue-900))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 8px 24px rgba(27,75,170,0.35)',
            }}>
              <Shield size={24} style={{ color: '#fff' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold-500)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Area riservata
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 400, color: 'var(--color-heading)', marginBottom: '0.35rem' }}>
              Admin Panel
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
              Pro Loco Gasperina APS
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.5rem', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--neutral-500)', pointerEvents: 'none',
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Inserisci la password"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.75rem 0.75rem 2.5rem',
                    background: 'var(--neutral-800)',
                    border: `1px solid ${error ? 'rgba(239,68,68,0.6)' : 'var(--neutral-600)'}`,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text)',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--neutral-500)', padding: '0.2rem',
                  }}
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {error && (
                <p style={{ fontSize: '0.75rem', color: 'rgba(239,68,68,0.9)', marginTop: '0.4rem' }}>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', opacity: loading || !password ? 0.6 : 1 }}
            >
              {loading ? 'Accesso...' : 'Accedi'}
            </button>
          </form>

          <div style={{
            marginTop: '1.75rem', paddingTop: '1.5rem',
            borderTop: '1px solid var(--neutral-700)',
            fontSize: '0.72rem', color: 'var(--neutral-500)', textAlign: 'center', lineHeight: 1.6,
          }}>
            Accesso riservato ai membri del direttivo.<br />
            Per recuperare la password contatta l&apos;amministratore del sito.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 0 }}>
      {children}
    </div>
  );
}
