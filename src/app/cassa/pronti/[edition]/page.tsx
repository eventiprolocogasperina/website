import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReadyScreen } from '@/components/field/cassa/ReadyScreen';
import { readyNumbers } from '@/server/domain/cash/departments';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Pronti', robots: { index: false, follow: false } };

/**
 * Schermo pubblico "Pronti" (§12.2), da proiettare vicino al ritiro: solo numeri, nessun dato
 * personale. Esiste solo se il modulo reparti ha lo schermo acceso.
 */
export default async function ReadyPage({ params }: { params: Promise<{ edition: string }> }) {
  const slug = (await params).edition;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const initial = await readyNumbers(slug);
  if (!initial) notFound();
  return <ReadyScreen slug={slug} initial={initial} />;
}
