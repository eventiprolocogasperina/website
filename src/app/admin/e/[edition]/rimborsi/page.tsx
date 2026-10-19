import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Rimborsi' };

export default function Page() {
  return <ComingSoon title="Rimborsi" description="Le richieste di rimborso di questa sola edizione." when="con la fase 2" meanwhile={{ href: "/admin/rimborsi", label: "Vai a tutti i rimborsi" }} />;
}
