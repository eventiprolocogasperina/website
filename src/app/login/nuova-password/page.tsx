import type { Metadata } from 'next';
import Link from 'next/link';
import { checkPasswordLink } from '@/server/domain/users';
import { AuthCard } from '../AuthCard';
import { NewPasswordForm } from './NewPasswordForm';

export const metadata: Metadata = { title: 'Scegli la password', robots: { index: false, follow: false } };

export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const link = typeof t === 'string' ? await checkPasswordLink(t) : null;
  if (!link) {
    return (
      <AuthCard title="Link non valido">
        <div className="flex flex-col gap-4 text-body">
          <p>Il link è scaduto o è già stato usato.</p>
          <Link href="/login/password-dimenticata" className="rounded text-label text-primary hover:underline">
            Chiedi un nuovo link
          </Link>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard title={link.purpose === 'invite' ? `Benvenuto, ${link.name}` : 'Nuova password'} subtitle="Scegli una password di almeno 10 caratteri.">
      <NewPasswordForm token={t as string} />
    </AuthCard>
  );
}
