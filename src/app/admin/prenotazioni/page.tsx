'use client';

import AdminHeader from '@/components/admin/AdminHeader';
import BookingManager from '@/components/admin/BookingManager';

export default function AdminPrenotazioniPage() {
  return (
    <div>
      <AdminHeader title="Prenotazioni" subtitle="Gestione prenotazioni eventi" />
      <BookingManager />
    </div>
  );
}
