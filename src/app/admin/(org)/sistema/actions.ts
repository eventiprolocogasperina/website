'use server';

import { z } from 'zod';
import { runAction } from '@/server/admin/run-action';
import { can } from '@/server/auth/permissions';
import { withTransaction } from '@/server/db/client';
import { audit } from '@/server/domain/audit';
import { resetTemplate, saveTemplate } from '@/server/domain/email-templates';
import { DomainError } from '@/server/domain/errors';
import { saveEditionNotifications } from '@/server/domain/notifications/settings';
import { saveSettings, type SettingsSection } from '@/server/domain/settings';
import { previewTemplate, sendTestEmail, type DraftInput } from '@/server/email/template-preview';
import { testPaymentForm } from '@/server/integrations/nexi/test-payment';

// Server Action delle pagine di Sistema (prompt 18): sottili, chiamano i servizi di dominio.

const SECTIONS = ['general', 'legacy_notice', 'telegram', 'whatsapp'] as const satisfies readonly SettingsSection[];

export async function saveSettingsAction(section: SettingsSection, values: Record<string, unknown>) {
  const s = z.enum(SECTIONS).parse(section);
  return runAction(['/admin/sistema'], async (ctx) => {
    await saveSettings(ctx, s, values as never);
  });
}

export async function saveEditionNotificationsAction(edition: string, settings: Record<string, boolean>) {
  return runAction(['/admin/sistema/notifiche'], (ctx) => saveEditionNotifications(ctx, { edition, settings: settings as never }));
}

export async function saveTemplateAction(input: { key: string; edition: string | null; subject: string; body: string }) {
  return runAction(['/admin/sistema/email'], (ctx) => saveTemplate(ctx, input));
}

export async function resetTemplateAction(input: { key: string; edition: string | null }) {
  return runAction(['/admin/sistema/email'], (ctx) => resetTemplate(ctx, input));
}

export async function previewTemplateAction(input: DraftInput) {
  return runAction([], (ctx) => previewTemplate(ctx, input));
}

export async function sendTestEmailAction(input: DraftInput) {
  return runAction(['/admin/sistema/email'], (ctx) => sendTestEmail(ctx, input));
}

/** Modulo firmato per il pagamento di prova da 1 €: solo il titolare (settings.payments), nel registro. */
export async function testPaymentAction() {
  return runAction([], async (ctx) => {
    if (!can(ctx, 'settings.payments')) throw new DomainError('FORBIDDEN');
    let form;
    try {
      form = testPaymentForm();
    } catch {
      throw new DomainError('VALIDATION', { message: 'Nexi non è configurato: mancano NEXI_ALIAS o NEXI_MAC_KEY.' });
    }
    await withTransaction((tx) => audit(tx, ctx, 'payments.test_started', { entityType: 'payment', entityId: form.fields.codTrans, after: { amountCents: 100 } }));
    return form;
  });
}
