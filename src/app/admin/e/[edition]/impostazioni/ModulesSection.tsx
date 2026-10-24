"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import {
  Button,
  Checkbox,
  Field,
  IconButton,
  Input,
  Select,
  Switch,
  Textarea,
  toast,
} from "@/components/ui";
import type { SettingsField } from "@/modules/settings-form";
import type { ModuleView } from "@/server/domain/editions/modules";
import { saveModuleSettingsAction, setModuleEnabledAction } from "../actions";

type Values = Record<string, unknown>;
export type ModuleFieldOptions = {
  sessions: Array<{ id: string; label: string }>;
  products: Array<{ id: string; name: string }>;
  registers: Array<{ id: string; name: string }>;
};

/** Date e prodotti dell'edizione, per i campi che li scelgono (es. i giorni di un'attività). */
const OptionsContext = createContext<ModuleFieldOptions>({
  sessions: [],
  products: [],
  registers: [],
});
const NO_PRODUCT = "__nessuno";

/** Elenco dei moduli con interruttore; quelli attivi aprono il form generato dal loro schema. */
export function ModulesSection({
  edition,
  modules,
  options,
  disabled,
}: {
  edition: string;
  modules: ModuleView[];
  options: ModuleFieldOptions;
  disabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function toggle(m: ModuleView, enabled: boolean) {
    setBusy(m.key);
    const res = await setModuleEnabledAction(edition, m.key, enabled);
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(enabled ? `${m.name}: attivato` : `${m.name}: spento`);
    if (!enabled && open === m.key) setOpen(null);
    router.refresh();
  }

  return (
    <OptionsContext.Provider value={options}>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {modules.map((m) => {
          const missing = m.dependsOn.filter(
            (d) => !modules.find((x) => x.key === d.key)?.enabled,
          );
          return (
            <li key={m.key} className="flex flex-col gap-3 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-body font-medium text-fg">{m.name}</p>
                  <p className="text-label text-muted">{m.description}</p>
                  {!m.enabled && missing.length > 0 && (
                    <p className="text-label text-muted">
                      Richiede: {missing.map((d) => d.name).join(", ")}.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.enabled && m.fields.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpen(open === m.key ? null : m.key)}
                    >
                      {open === m.key ? "Chiudi" : "Impostazioni"}
                    </Button>
                  )}
                  <Switch
                    aria-label={m.name}
                    checked={m.enabled}
                    onCheckedChange={(v) => toggle(m, v)}
                    disabled={
                      disabled ||
                      busy === m.key ||
                      (!m.enabled && missing.length > 0)
                    }
                  />
                </div>
              </div>
              {open === m.key && (
                <ModuleSettingsForm
                  edition={edition}
                  module={m}
                  disabled={disabled}
                  onSaved={() => router.refresh()}
                />
              )}
            </li>
          );
        })}
      </ul>
    </OptionsContext.Provider>
  );
}

function ModuleSettingsForm({
  edition,
  module: m,
  disabled,
  onSaved,
}: {
  edition: string;
  module: ModuleView;
  disabled: boolean;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Values>(m.settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(values) !== JSON.stringify(m.settings);

  async function save() {
    setSaving(true);
    setError("");
    const res = await saveModuleSettingsAction(edition, m.key, values);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    toast.success(`${m.name}: impostazioni salvate`);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-surface-sunken p-3">
      {error && (
        <p role="alert" className="whitespace-pre-line text-label text-danger">
          {error}
        </p>
      )}
      <Fields
        fields={m.fields}
        values={values}
        onChange={setValues}
        disabled={disabled}
      />
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={!dirty || saving}
          onClick={() => (setValues(m.settings), setError(""))}
        >
          Annulla
        </Button>
        <Button
          size="sm"
          disabled={!dirty || disabled}
          loading={saving}
          onClick={save}
        >
          Salva
        </Button>
      </div>
    </div>
  );
}

function Fields({
  fields,
  values,
  onChange,
  disabled,
}: {
  fields: SettingsField[];
  values: Values;
  onChange: (v: Values) => void;
  disabled: boolean;
}) {
  const options = useContext(OptionsContext);
  const set = (key: string, v: unknown) => onChange({ ...values, [key]: v });
  return (
    <>
      {fields.map((f) => {
        const v = values[f.key];
        switch (f.kind) {
          case "boolean":
            return (
              <Checkbox
                key={f.key}
                label={f.label}
                description={f.help}
                checked={v === true}
                onCheckedChange={(c) => set(f.key, c)}
                disabled={disabled}
              />
            );
          case "number":
            return (
              <Field key={f.key} label={f.label} help={f.help}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={f.min}
                  max={f.max}
                  step={f.integer ? 1 : "any"}
                  value={v === null || v === undefined ? "" : String(v)}
                  onChange={(e) =>
                    set(
                      f.key,
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  disabled={disabled}
                  className="max-w-40"
                />
              </Field>
            );
          case "text":
            return (
              <Field key={f.key} label={f.label} help={f.help}>
                {f.multiline ? (
                  <Textarea
                    value={String(v ?? "")}
                    maxLength={f.maxLength}
                    rows={3}
                    onChange={(e) => set(f.key, e.target.value)}
                    disabled={disabled}
                  />
                ) : (
                  <Input
                    value={String(v ?? "")}
                    maxLength={f.maxLength}
                    onChange={(e) => set(f.key, e.target.value)}
                    disabled={disabled}
                  />
                )}
              </Field>
            );
          case "enum":
            return (
              <Field key={f.key} label={f.label} help={f.help}>
                <Select
                  value={String(v ?? "")}
                  onValueChange={(x) => set(f.key, x)}
                  disabled={disabled}
                  options={f.options.map((o) => ({ value: o, label: o }))}
                />
              </Field>
            );
          case "sessions": {
            const selected = Array.isArray(v) ? (v as string[]) : [];
            return (
              <fieldset
                key={f.key}
                className="flex flex-col gap-1.5 sm:col-span-2"
              >
                <legend className="text-label font-medium text-fg">
                  {f.label}
                </legend>
                {f.help && <p className="text-label text-muted">{f.help}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {options.sessions.map((s) => (
                    <Checkbox
                      key={s.id}
                      label={s.label}
                      checked={selected.includes(s.id)}
                      onCheckedChange={(c) =>
                        set(
                          f.key,
                          c
                            ? [...selected, s.id]
                            : selected.filter((x) => x !== s.id),
                        )
                      }
                      disabled={disabled}
                    />
                  ))}
                </div>
              </fieldset>
            );
          }
          case "product":
          case "register": {
            const items = f.kind === "product" ? options.products : options.registers;
            return (
              <Field key={f.key} label={f.label} help={f.help}>
                <Select
                  value={typeof v === "string" ? v : NO_PRODUCT}
                  onValueChange={(x) => set(f.key, x === NO_PRODUCT ? null : x)}
                  disabled={disabled}
                  options={[
                    { value: NO_PRODUCT, label: f.kind === "product" ? "Nessuno" : "Nessuna" },
                    ...items.map((p) => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                />
              </Field>
            );
          }
          case "list": {
            const items = Array.isArray(v) ? (v as Values[]) : [];
            const full = f.maxItems !== undefined && items.length >= f.maxItems;
            return (
              <fieldset key={f.key} className="flex flex-col gap-2">
                <legend className="text-body font-medium text-fg">
                  {f.label}
                </legend>
                {f.help && <p className="text-label text-muted">{f.help}</p>}
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3"
                  >
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <Fields
                        fields={f.item}
                        values={item}
                        onChange={(next) =>
                          set(
                            f.key,
                            items.map((x, j) => (j === i ? next : x)),
                          )
                        }
                        disabled={disabled}
                      />
                    </div>
                    <IconButton
                      label="Rimuovi"
                      icon={Trash2}
                      variant="ghost"
                      onClick={() =>
                        set(
                          f.key,
                          items.filter((_, j) => j !== i),
                        )
                      }
                      disabled={disabled}
                    />
                  </div>
                ))}
                <div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() =>
                      set(f.key, [...items, { ...f.itemDefaults }])
                    }
                    disabled={disabled || full}
                  >
                    Aggiungi
                  </Button>
                </div>
              </fieldset>
            );
          }
        }
      })}
    </>
  );
}
