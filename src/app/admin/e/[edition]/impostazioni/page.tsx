import { ComingSoon } from '@/components/admin/shell/ComingSoon';

export const metadata = { title: 'Impostazioni' };

export default function Page() {
  return <ComingSoon title="Impostazioni" description="Nome, date, stato e moduli attivi di questa edizione." when="con la fase 2" meanwhile={{ href: "/admin/edizioni", label: "Vai alle edizioni" }} />;
}
