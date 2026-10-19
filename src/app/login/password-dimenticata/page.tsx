import type { Metadata } from 'next';
import { AuthCard } from '../AuthCard';
import { ForgotForm } from './ForgotForm';

export const metadata: Metadata = { title: 'Password dimenticata', robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Password dimenticata" subtitle="Ti mandiamo un link per sceglierne una nuova.">
      <ForgotForm />
    </AuthCard>
  );
}
