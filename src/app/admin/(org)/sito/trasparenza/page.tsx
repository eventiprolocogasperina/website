import { pageDenied } from '@/server/auth/guard';
import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Trasparenza' };

export default async function Page() {
  const denied = await pageDenied('content.edit');
  if (denied) return denied;
  return <ComingSoon title="Trasparenza" description="La pagina pubblica sul trattamento dei dati personali." when="con la fase 4" />;
}
