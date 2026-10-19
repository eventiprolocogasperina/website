'use client';

import AdminHeader from '@/components/admin/AdminHeader';
import DiscountManager from '@/components/admin/DiscountManager';

export default function AdminScontiPage() {
  return (
    <div>
      <AdminHeader title="Sconti A&P" subtitle="Gestione codici sconto per Assaggia & Passeggia" />
      <DiscountManager />
    </div>
  );
}
