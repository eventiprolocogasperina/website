import { AdminPage } from '@/components/admin/shell/AdminPage';
import { pageDenied } from '@/server/auth/guard';
import { listEditionNotifications, NOTIFICATION_TYPES } from '@/server/domain/notifications/settings';
import { getSettings, readSettings, secretStatus } from '@/server/domain/settings';
import { NotificationsClient } from './NotificationsClient';

export const metadata = { title: 'Notifiche' };

/** Sistema → Notifiche (§10.3): Telegram allo staff e WhatsApp ai partecipanti. Nessun segreto in chiaro. */
export default async function NotificationsPage() {
  const denied = await pageDenied('settings.manage');
  if (denied) return denied;
  const [telegram, whatsapp, editions, legacy] = await Promise.all([
    getSettings('telegram'),
    getSettings('whatsapp'),
    listEditionNotifications(),
    readSettings(['wa_access_token', 'wa_webhook_verify_token']),
  ]);
  const env = secretStatus(['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_CHAT_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_APP_SECRET', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']);
  return (
    <AdminPage>
      <NotificationsClient
        initial={{ telegram, whatsapp }}
        editions={editions}
        types={NOTIFICATION_TYPES.map((t) => ({ key: t.key, label: t.label, description: t.description }))}
        secrets={{ ...env, legacyAccessToken: !!legacy.wa_access_token, legacyVerifyToken: !!legacy.wa_webhook_verify_token }}
      />
    </AdminPage>
  );
}
