import { AdminPage } from '@/components/admin/shell/AdminPage';
import { Badge, Card, PageHeader } from '@/components/ui';
import { getAdminCtx } from '@/server/auth/context';
import { ROLE_LABELS } from '@/server/auth/roles';
import { getOwnProfile } from '@/server/domain/users';
import { PinForm } from './PinForm';

export const metadata = { title: 'Profilo' };

/** Il proprio profilo: ruoli e PIN personale (quello che il responsabile digita per autorizzare un annullo in cassa). */
export default async function ProfilePage() {
  const ctx = await getAdminCtx();
  if (!ctx?.user || ctx.legacy) {
    return (
      <AdminPage className="max-w-2xl">
        <PageHeader title="Profilo" subtitle="Il profilo c'è solo per chi entra con la propria email." />
      </AdminPage>
    );
  }
  const me = await getOwnProfile(ctx);
  return (
    <AdminPage className="max-w-2xl">
      <PageHeader title="Profilo" subtitle={me.email ?? me.name} />
      <Card title={me.name} description="I tuoi ruoli: li cambia chi gestisce gli utenti, da Sistema → Utenti.">
        <div className="flex flex-wrap gap-2">
          {me.grants.map((g) => (
            <Badge key={`${g.role}:${g.edition ?? ''}`}>{ROLE_LABELS[g.role]}{g.edition ? ` · ${g.edition}` : ''}</Badge>
          ))}
        </div>
      </Card>
      <Card
        title="Il tuo PIN"
        description="Da 4 a 6 cifre. Lo digiti sul telefono della cassa quando un cassiere deve annullare una vendita: è la tua autorizzazione da responsabile. Dopo 5 errori si blocca e va reimpostato."
        className="mt-4"
      >
        <PinForm hasPin={me.hasPin} locked={me.pinLocked} />
      </Card>
    </AdminPage>
  );
}
