'use client';

import AdminHeader from '@/components/admin/AdminHeader';
import RefundManager from '@/components/admin/RefundManager';

export default function AdminRimborsiPage() {
  return (
    <div>
      <AdminHeader 
        title="Rimborsi" 
        subtitle="Monitoraggio e gestione delle richieste di rimborso per Zuccaland ed altri eventi" 
      />
      <RefundManager />
    </div>
  );
}
