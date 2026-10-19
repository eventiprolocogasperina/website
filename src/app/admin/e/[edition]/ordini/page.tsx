import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Ordini' };

export default function Page() {
  return <ComingSoon title="Ordini" description="Gli ordini di questa sola edizione." when="con la fase 2" meanwhile={{ href: "/admin/ordini", label: "Vai a tutti gli ordini" }} />;
}
