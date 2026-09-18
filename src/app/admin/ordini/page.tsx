'use client';

import AdminHeader from '@/components/admin/AdminHeader';
import OrderManager from '@/components/admin/OrderManager';

export default function AdminOrdiniPage() {
  return (
    <div>
      <AdminHeader title="Ordini" subtitle="Panoramica vendite, analisi statistiche e gestione ordini per tutti gli eventi" />
      <OrderManager />
    </div>
  );
}
