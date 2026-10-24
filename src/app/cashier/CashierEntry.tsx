'use client';

import { FieldGate } from '@/components/field/FieldGate';
import CashierClient from './CashierClient';

/** Cassa: con un dispositivo abbinato si entra con il PIN, altrimenti con il codice evento (flag legacy_event_code). */
export default function CashierEntry() {
  return <FieldGate kind="pos">{(session, logout) => <CashierClient field={session.user ? { operatorName: session.user.name, logout } : null} />}</FieldGate>;
}
