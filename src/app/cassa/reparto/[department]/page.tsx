import { DepartmentBoard } from '@/components/field/cassa/DepartmentBoard';

export const dynamic = 'force-dynamic';

/** Schermo di un reparto (cucina, griglia, bar…), modulo `departments` (§12.2). */
export default async function DepartmentPage({ params, searchParams }: { params: Promise<{ department: string }>; searchParams: Promise<{ edizione?: string }> }) {
  const department = decodeURIComponent((await params).department).slice(0, 80);
  const { edizione } = await searchParams;
  return <DepartmentBoard department={department} adminEdition={edizione && /^[a-z0-9-]{1,80}$/.test(edizione) ? edizione : null} />;
}
