import type { Metadata } from 'next';
import { AuthCard } from './AuthCard';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Accesso area riservata',
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; password?: string }> }) {
  const { next, password } = await searchParams;
  return (
    <AuthCard title="Area riservata" footer="Accesso riservato ai volontari e al direttivo.">
      <LoginForm next={typeof next === 'string' ? next : '/admin'} notice={password === 'ok' ? 'Password salvata. Ora puoi entrare.' : undefined} />
    </AuthCard>
  );
}
