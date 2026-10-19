import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Registro attività' };

export default function Page() {
  return <ComingSoon title="Registro attività" description="Chi ha fatto cosa nell’admin, in sola lettura." when="con il prossimo passo di questa fase" />;
}
