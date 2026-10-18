'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';

// L'accesso è verificato sul server (src/proxy.ts e requireAdmin nelle rotte API):
// qui arriva solo chi ha già una sessione admin valida.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="admin-layout">
      {/* Mobile Top Bar */}
      <div className="admin-topbar">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-heading)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <Menu size={24} />
          <span style={{ fontSize: '1rem', fontWeight: 500, fontFamily: 'var(--font-display)' }}>Admin Panel</span>
        </button>
      </div>

      <AdminSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <main 
        className="admin-main"
        onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)} // Close if user clicks main area while open
      >
        {children}
      </main>
    </div>
  );
}
