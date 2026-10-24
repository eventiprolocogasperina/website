'use client';

import { ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AnnotatedSection, Checkbox, ContextualSaveBar, Field, Input, PageHeader, Switch, toast } from '@/components/ui';
import { NavConfig, resolveNav, type NavFormat } from '@/lib/public/nav';
import { saveNavigationAction, setPublicV2Action } from './actions';
import { NavItemsEditor } from './NavItemsEditor';

type Props = { initial: NavConfig; formats: NavFormat[]; flag: { enabled: boolean; canToggle: boolean } };

/** /admin/sito/navigazione: voci del menu pubblico, tendina Eventi, pulsante in evidenza e interruttore del sito nuovo. */
export function NavigationClient({ initial, formats, flag }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<NavConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(flag.enabled);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const preview = useMemo(() => {
    const parsed = NavConfig.safeParse(form);
    return parsed.success ? resolveNav(parsed.data, formats) : null;
  }, [form, formats]);

  async function save() {
    setSaving(true);
    setError('');
    const res = await saveNavigationAction(form);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast.success('Menu salvato');
    router.refresh();
  }

  async function toggle(on: boolean) {
    setEnabled(on);
    const res = await setPublicV2Action(on);
    if (!res.ok) {
      setEnabled(!on);
      return toast.error(res.error);
    }
    toast.success(on ? 'Menu e calendario nuovi attivi sul sito' : 'Il sito usa di nuovo menu e calendario di prima');
  }

  return (
    <>
      <PageHeader title="Navigazione" subtitle="Le voci del menu del sito pubblico. La tendina “Eventi” mostra da sola i format con una pagina pubblica." />
      <ContextualSaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => (setForm(initial), setError(''))} />
      {error && (
        <p role="alert" className="mb-4 rounded-md border border-danger bg-surface p-3 text-body text-danger">
          {error}
        </p>
      )}

      <AnnotatedSection
        title="Sito nuovo"
        description="Accende insieme il menu di questa pagina, il calendario /eventi con i filtri e le schede delle edizioni. Spento, il sito resta quello di prima."
      >
        <Switch
          label="Menu e calendario nuovi"
          description={flag.canToggle ? 'Effetto immediato per tutti i visitatori.' : 'Solo il titolare e gli amministratori possono cambiarlo.'}
          checked={enabled}
          onCheckedChange={toggle}
          disabled={!flag.canToggle}
        />
      </AnnotatedSection>

      <AnnotatedSection title="Voci del menu" description="Nell’ordine in cui compaiono. Una voce con sottovoci diventa una tendina (su telefono si apre a fisarmonica).">
        <NavItemsEditor items={form.items} onChange={(items) => setForm((f) => ({ ...f, items }))} />
      </AnnotatedSection>

      <AnnotatedSection title="Format nella tendina" description="I format con una pagina pubblica e almeno un’edizione pubblicata. Togli il segno per nasconderne uno.">
        {formats.length ? (
          <div className="flex flex-col gap-2">
            {formats.map((f) => (
              <Checkbox
                key={f.slug}
                label={`${f.name} (${f.href})`}
                checked={!form.hiddenFormats.includes(f.slug)}
                onCheckedChange={(on) =>
                  setForm((x) => ({ ...x, hiddenFormats: on ? x.hiddenFormats.filter((s) => s !== f.slug) : [...x.hiddenFormats, f.slug] }))
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-body text-muted">Nessun format ha ancora una pagina pubblica. Si imposta in Edizioni › Format.</p>
        )}
      </AnnotatedSection>

      <AnnotatedSection title="Pulsante in evidenza" description="Il pulsante dorato a destra del menu.">
        <div className="flex flex-col gap-3">
          <Checkbox label="Mostra il pulsante" checked={!!form.cta} onCheckedChange={(on) => setForm((f) => ({ ...f, cta: on ? (initial.cta ?? { label: 'Diventa socio', href: '/iscriviti' }) : null }))} />
          {form.cta && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Testo">
                <Input value={form.cta.label} onChange={(e) => setForm((f) => ({ ...f, cta: { ...f.cta!, label: e.target.value } }))} />
              </Field>
              <Field label="Indirizzo">
                <Input value={form.cta.href} onChange={(e) => setForm((f) => ({ ...f, cta: { ...f.cta!, href: e.target.value } }))} />
              </Field>
            </div>
          )}
        </div>
      </AnnotatedSection>

      <AnnotatedSection title="Anteprima" description="Come apparirà il menu dopo il salvataggio.">
        {preview ? (
          <ul className="flex flex-col gap-1 text-body" aria-label="Anteprima del menu">
            {preview.items.map((it) => (
              <li key={it.href + it.label}>
                <span className="font-medium text-fg">{it.label}</span> <span className="text-muted">{it.href}</span>
                {it.children.length > 0 && (
                  <ul className="ml-4 list-disc pl-4 text-muted">
                    {it.children.map((c) => (
                      <li key={c.href}>
                        {c.label} · {c.href}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {preview.cta && <li className="mt-2 text-label text-muted">Pulsante: {preview.cta.label}</li>}
          </ul>
        ) : (
          <p className="text-body text-warning">Completa i campi vuoti o correggi gli indirizzi per vedere l’anteprima.</p>
        )}
        <a href="/" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-label text-primary underline-offset-2 hover:underline">
          Apri il sito <ExternalLink size={14} aria-hidden />
        </a>
      </AnnotatedSection>
    </>
  );
}
