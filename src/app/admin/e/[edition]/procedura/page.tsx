import { redirect } from 'next/navigation';
import { firstOpenStep } from '@/lib/edition-setup';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { getSetupChecklist } from '@/server/domain/editions/setup';
import type { EditionParams } from '@/server/domain/editions/page-params';

/** Riprende la procedura dal primo passo ancora da fare. */
export default async function SetupStartPage({ params }: EditionParams) {
  const { edition } = await params;
  const denied = await pageDenied('editions.edit', { edition });
  if (denied) return denied;
  const list = await getSetupChecklist((await getAdminCtx())!, edition);
  redirect(`/admin/e/${edition}/procedura/${firstOpenStep(list).path}`);
}
