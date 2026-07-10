'use client';

import AdminHeader from '@/components/admin/AdminHeader';
import OrderManager from '@/components/admin/OrderManager';

export default function AdminOrdiniPage() {
  return (
    <div>
      <AdminHeader title="Ordini A&P" subtitle="Gestione ordini per Assaggia & Passeggia" />
      <OrderManager />
    </div>
  );
}
