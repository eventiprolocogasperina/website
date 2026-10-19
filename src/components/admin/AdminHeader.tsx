'use client';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

// Intestazione delle pagine admin precedenti al rifacimento. Campanella, tema, profilo ed "Esci"
// ora stanno nella barra in alto della shell (src/components/admin/shell), quindi qui restano
// solo titolo, sottotitolo e azioni. Le pagine nuove usano PageHeader del design system.
export default function AdminHeader({ title, subtitle, actions }: AdminHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 400, color: 'var(--color-heading)' }}>
          {title}
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)' }}>
          {subtitle || 'Pro Loco Gasperina APS · Area Amministrativa'}
        </p>
      </div>
      {actions && <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
