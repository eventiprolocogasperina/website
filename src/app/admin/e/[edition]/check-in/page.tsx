import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Check-in' };

export default function Page() {
  return <ComingSoon title="Check-in" description="Gli ingressi registrati per questa edizione." when="con la fase 3" meanwhile={{ href: "/scanner", label: "Apri lo scanner" }} />;
}
