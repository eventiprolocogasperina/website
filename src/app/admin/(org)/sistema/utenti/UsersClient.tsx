"use client";

import {
  KeyRound,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  QrCode,
  Smartphone,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  dataTableColumns,
  Dialog,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  IconButton,
  Input,
  Select,
  StatusBadge,
  Tabs,
  toast,
} from "@/components/ui";
import { pairDeviceAction, updateDeviceAction } from "@/app/admin/devices-actions";
import {
  EditDeviceDialog,
  PairDeviceDialog,
  permissionSummary,
} from "@/components/admin/devices/Pairing";
import { formatDateTime, formatRelative } from "@/lib/dates";
import type { RoleGrant } from "@/server/auth/permissions";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  USER_ROLES,
  type UserRole,
} from "@/server/auth/roles";
import type { DeviceRow, RegisterOption } from "@/server/domain/devices";
import type { UserRow } from "@/server/domain/users";
import {
  createUserAction,
  revokeDeviceAction,
  sendInviteAction,
  setActiveAction,
  setPinAction,
  updateUserAction,
  type ActionResult,
} from "./actions";

type EditionOption = { slug: string; title: string };

/** Ruoli che valgono sempre su tutta l'associazione (owner, admin, editor). */
const ORG_ONLY: readonly UserRole[] = ["owner", "admin", "editor"];

export type UsersClientProps = {
  users: UserRow[];
  devices: DeviceRow[];
  editions: EditionOption[];
  /** Casse di ogni edizione, per assegnarle ai dispositivi di cassa. */
  registersByEdition: Record<string, RegisterOption[]>;
  canUsers: boolean;
  canDevices: boolean;
  currentUserId: string | null;
  initialTab: "persone" | "dispositivi";
};

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  async function call<T>(
    fn: () => Promise<ActionResult<T>>,
    success?: string,
  ): Promise<ActionResult<T>> {
    const res = await fn();
    if (res.ok) {
      if (success) toast.success(success);
      start(() => router.refresh());
    } else {
      toast.error(res.error);
    }
    return res;
  }
  return { call, pending };
}

export function UsersClient({
  users,
  devices,
  editions,
  registersByEdition,
  canUsers,
  canDevices,
  currentUserId,
  initialTab,
}: UsersClientProps) {
  const [tab, setTab] = useState<string>(initialTab);
  const editionTitle = useMemo(
    () => new Map(editions.map((e) => [e.slug, e.title])),
    [editions],
  );
  const titleOf = useCallback(
    (slug: string | null) =>
      slug ? (editionTitle.get(slug) ?? slug) : "Tutta l’associazione",
    [editionTitle],
  );

  const items = [
    ...(canUsers
      ? [
          {
            value: "persone",
            label: "Persone",
            count: users.filter((u) => u.active).length,
            content: (
              <PeopleTab
                users={users}
                editions={editions}
                titleOf={titleOf}
                currentUserId={currentUserId}
              />
            ),
          },
        ]
      : []),
    ...(canDevices
      ? [
          {
            value: "dispositivi",
            label: "Dispositivi",
            count: devices.filter((d) => !d.revokedAt).length,
            content: (
              <DevicesTab
                devices={devices}
                editions={editions}
                registersByEdition={registersByEdition}
                titleOf={titleOf}
              />
            ),
          },
        ]
      : []),
  ];
  return (
    <Tabs
      items={items}
      value={tab}
      onValueChange={setTab}
      aria-label="Utenti e dispositivi"
    />
  );
}

// ─── Persone ────────────────────────────────────────────────────────────────

function roleText(g: RoleGrant, titleOf: (slug: string | null) => string) {
  return g.edition
    ? `${ROLE_LABELS[g.role]} · ${titleOf(g.edition)}`
    : ROLE_LABELS[g.role];
}

function PeopleTab({
  users,
  editions,
  titleOf,
  currentUserId,
}: {
  users: UserRow[];
  editions: EditionOption[];
  titleOf: (s: string | null) => string;
  currentUserId: string | null;
}) {
  const { call } = useAction();
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);
  const [pinFor, setPinFor] = useState<UserRow | null>(null);
  const [deactivate, setDeactivate] = useState<UserRow | null>(null);

  const columns = useMemo(() => {
    const col = dataTableColumns<UserRow>();
    return [
      col.accessor("name", {
        header: "Nome",
        meta: { label: "Nome" },
        size: 240,
        enableHiding: false,
        cell: (c) => (
          <span className="flex flex-col">
            <span className="font-medium">
              {c.getValue()}
              {c.row.original.id === currentUserId && (
                <span className="font-normal text-muted"> (tu)</span>
              )}
            </span>
            {c.row.original.email && (
              <span className="text-caption text-muted">
                {c.row.original.email}
              </span>
            )}
          </span>
        ),
      }),
      col.accessor("roles", {
        header: "Ruoli",
        meta: { label: "Ruoli" },
        size: 300,
        enableSorting: false,
        cell: (c) =>
          c.getValue().length === 0 ? (
            <span className="text-muted">Nessun ruolo</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {c.getValue().map((g) => (
                <Badge
                  key={`${g.role}:${g.edition}`}
                  tone={g.role === "owner" ? "info" : "neutral"}
                >
                  {roleText(g, titleOf)}
                </Badge>
              ))}
            </span>
          ),
      }),
      col.display({
        id: "access",
        header: "Accesso",
        meta: { label: "Accesso" },
        size: 170,
        cell: (c) => {
          const u = c.row.original;
          return (
            <span className="flex flex-wrap gap-1">
              {u.hasPassword ? (
                <Badge tone="success">Password</Badge>
              ) : u.email ? (
                <Badge tone="warning">Invito in attesa</Badge>
              ) : null}
              {u.pinLocked ? (
                <Badge tone="danger">PIN bloccato</Badge>
              ) : u.hasPin ? (
                <Badge tone="success">PIN</Badge>
              ) : null}
              {!u.hasPassword && !u.email && !u.hasPin && (
                <span className="text-muted">Nessuno</span>
              )}
            </span>
          );
        },
      }),
      col.accessor("lastLoginAt", {
        header: "Ultimo accesso",
        meta: { label: "Ultimo accesso" },
        size: 150,
        cell: (c) => {
          const v = c.getValue();
          return v ? (
            <span title={formatDateTime(v)} className="text-muted">
              {formatRelative(v, new Date())}
            </span>
          ) : (
            <span className="text-muted">Mai</span>
          );
        },
      }),
      col.accessor("active", {
        header: "Stato",
        meta: { label: "Stato" },
        size: 110,
        cell: (c) =>
          c.getValue() ? (
            <StatusBadge status="valid" label="Attivo" />
          ) : (
            <StatusBadge status="expired" label="Disattivato" />
          ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">Azioni</span>,
        size: 56,
        enableHiding: false,
        cell: (c) => {
          const u = c.row.original;
          return (
            <div
              className="flex justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton
                    icon={MoreHorizontal}
                    label={`Azioni per ${u.name}`}
                    variant="ghost"
                    size="sm"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    icon={Pencil}
                    onSelect={() => setEditing(u)}
                  >
                    Modifica nome e ruoli
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    icon={KeyRound}
                    onSelect={() => setPinFor(u)}
                  >
                    {u.hasPin
                      ? u.pinLocked
                        ? "Sblocca e reimposta il PIN"
                        : "Cambia PIN"
                      : "Imposta PIN"}
                  </DropdownMenuItem>
                  {u.email && !u.hasPassword && u.active && (
                    <DropdownMenuItem
                      icon={Mail}
                      onSelect={() =>
                        call(
                          () => sendInviteAction(u.id),
                          `Invito rimandato a ${u.email}.`,
                        )
                      }
                    >
                      Rimanda l’invito
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {u.active ? (
                    <DropdownMenuItem
                      icon={UserX}
                      tone="danger"
                      disabled={u.id === currentUserId}
                      onSelect={() => setDeactivate(u)}
                    >
                      Disattiva
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      icon={UserCheck}
                      onSelect={() =>
                        call(
                          () => setActiveAction(u.id, true),
                          `${u.name} è di nuovo attivo.`,
                        )
                      }
                    >
                      Riattiva
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, titleOf]);

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => setEditing("new")}>
          Nuovo utente
        </Button>
      </div>
      <DataTable
        label="Utenti"
        data={users}
        columns={columns}
        getRowId={(u) => u.id}
        onRowClick={(u) => setEditing(u)}
        empty={
          <EmptyState
            icon={Users}
            title="Nessun utente"
            description="Aggiungi le persone che usano l’admin, la cassa o lo scanner."
          />
        }
      />
      {editing && (
        <UserDialog
          user={editing === "new" ? null : editing}
          editions={editions}
          onClose={() => setEditing(null)}
        />
      )}
      {pinFor && <PinDialog user={pinFor} onClose={() => setPinFor(null)} />}
      <ConfirmDialog
        open={!!deactivate}
        onOpenChange={(open) => !open && setDeactivate(null)}
        title={`Disattivare ${deactivate?.name}?`}
        description="Non potrà più entrare nell’admin né usare il PIN. Le sessioni aperte si chiudono subito. Puoi riattivarlo quando vuoi."
        confirmLabel="Disattiva"
        tone="danger"
        onConfirm={async () => {
          if (!deactivate) return;
          const res = await call(
            () => setActiveAction(deactivate.id, false),
            `${deactivate.name} è stato disattivato.`,
          );
          if (!res.ok) throw new Error(res.error);
        }}
      />
    </div>
  );
}

function UserDialog({
  user,
  editions,
  onClose,
}: {
  user: UserRow | null;
  editions: EditionOption[];
  onClose: () => void;
}) {
  const { call } = useAction();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [roles, setRoles] = useState<RoleGrant[]>(
    user?.roles.length
      ? user.roles
      : [{ role: "cashier", edition: editions[0]?.slug ?? null }],
  );
  const [invite, setInvite] = useState(true);
  const [saving, setSaving] = useState(false);

  const editionOptions = [
    { value: "__all", label: "Tutta l’associazione" },
    ...editions.map((e) => ({ value: e.slug, label: e.title })),
  ];
  const roleOptions = USER_ROLES.map((r) => ({
    value: r,
    label: ROLE_LABELS[r],
  }));
  const setRole = (i: number, patch: Partial<RoleGrant>) =>
    setRoles((rs) =>
      rs.map((r, j) =>
        j === i
          ? {
              ...r,
              ...patch,
              ...(patch.role && ORG_ONLY.includes(patch.role)
                ? { edition: null }
                : {}),
            }
          : r,
      ),
    );

  async function save() {
    setSaving(true);
    const input = { name, email, roles };
    const res = user
      ? await call(() => updateUserAction(user.id, input), "Utente salvato.")
      : await call(
          () => createUserAction(input, invite && !!email),
          email && invite
            ? `Utente creato. Invito mandato a ${email}.`
            : "Utente creato.",
        );
    setSaving(false);
    if (res.ok) onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={user ? `Modifica ${user.name}` : "Nuovo utente"}
        description="I volontari di cassa e ingresso possono non avere un’email: usano il dispositivo abbinato col QR."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Annulla
            </Button>
            <Button onClick={save} loading={saving}>
              {user ? "Salva" : "Crea utente"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome e cognome" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </Field>
            <Field
              label="Email"
              help="Serve per entrare nell’admin con la password."
            >
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label font-medium text-fg">
              Ruoli
            </legend>
            {roles.map((r, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-start"
              >
                <div className="flex-1">
                  <Select
                    aria-label="Ruolo"
                    value={r.role}
                    onValueChange={(v) => setRole(i, { role: v as UserRole })}
                    options={roleOptions}
                  />
                  <p className="mt-1 text-caption text-muted">
                    {ROLE_DESCRIPTIONS[r.role]}
                  </p>
                </div>
                <div className="flex-1">
                  <Select
                    aria-label="Dove vale"
                    value={r.edition ?? "__all"}
                    disabled={ORG_ONLY.includes(r.role)}
                    onValueChange={(v) =>
                      setRole(i, { edition: v === "__all" ? null : v })
                    }
                    options={editionOptions}
                  />
                </div>
                <IconButton
                  icon={Trash2}
                  label="Togli questo ruolo"
                  variant="ghost"
                  onClick={() => setRoles((rs) => rs.filter((_, j) => j !== i))}
                />
              </div>
            ))}
            <Button
              variant="ghost"
              icon={Plus}
              className="self-start"
              onClick={() =>
                setRoles((rs) => [
                  ...rs,
                  { role: "gate", edition: editions[0]?.slug ?? null },
                ])
              }
            >
              Aggiungi un ruolo
            </Button>
          </fieldset>
          {!user && email && (
            <Checkbox
              checked={invite}
              onCheckedChange={setInvite}
              label="Manda un invito via email per scegliere la password"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PinDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const { call } = useAction();
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const valid = /^\d{4,6}$/.test(pin);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={`PIN di ${user.name}`}
        description="Da 4 a 6 cifre. È il PIN da responsabile per autorizzare gli annulli in cassa; ognuno può cambiarlo anche da Profilo. Dopo 5 errori si blocca."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Annulla
            </Button>
            <Button
              disabled={!valid}
              loading={saving}
              onClick={async () => {
                setSaving(true);
                const res = await call(
                  () => setPinAction(user.id, pin),
                  "PIN salvato. Comunicalo di persona.",
                );
                setSaving(false);
                if (res.ok) onClose();
              }}
            >
              Salva PIN
            </Button>
          </>
        }
      >
        <Field
          label="Nuovo PIN"
          help="Non lo mandiamo da nessuna parte: comunicalo tu alla persona."
        >
          <Input
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            autoFocus
            className="tracking-[0.3em]"
          />
        </Field>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dispositivi ────────────────────────────────────────────────────────────

const KIND_LABEL = { pos: "Cassa", scanner: "Varco" } as const;

function DevicesTab({
  devices,
  editions,
  registersByEdition,
  titleOf,
}: {
  devices: DeviceRow[];
  editions: EditionOption[];
  registersByEdition: Record<string, RegisterOption[]>;
  titleOf: (s: string | null) => string;
}) {
  const { call } = useAction();
  const [pairing, setPairing] = useState(false);
  const [editing, setEditing] = useState<DeviceRow | null>(null);
  const [revoke, setRevoke] = useState<DeviceRow | null>(null);

  const columns = useMemo(() => {
    const col = dataTableColumns<DeviceRow>();
    return [
      col.accessor("name", {
        header: "Nome",
        meta: { label: "Nome" },
        size: 180,
        enableHiding: false,
        cell: (c) => <span className="font-medium">{c.getValue()}</span>,
      }),
      col.accessor("kind", {
        header: "Tipo",
        meta: { label: "Tipo" },
        size: 100,
        cell: (c) => KIND_LABEL[c.getValue()],
      }),
      col.accessor("edition", {
        header: "Edizione",
        meta: { label: "Edizione" },
        size: 220,
        cell: (c) => titleOf(c.getValue()),
      }),
      col.accessor("holderName", {
        header: "Affidato a",
        meta: { label: "Affidato a" },
        size: 170,
        cell: (c) => {
          const d = c.row.original;
          return d.holderName ? (
            <span>
              {d.holderName}
              {d.holderPhone && (
                <span className="block text-caption text-muted">
                  {d.holderPhone}
                </span>
              )}
            </span>
          ) : (
            "—"
          );
        },
      }),
      col.accessor("permissions", {
        header: "Può fare",
        meta: { label: "Può fare" },
        size: 260,
        enableSorting: false,
        cell: (c) => {
          const d = c.row.original;
          return (
            <span className="text-muted">
              {d.registerName ? `${d.registerName} · ` : ""}
              {permissionSummary(d.kind, d.permissions)}
            </span>
          );
        },
      }),
      col.accessor("pairedBy", {
        header: "Abbinato da",
        meta: { label: "Abbinato da" },
        size: 150,
        cell: (c) => c.getValue() ?? "—",
      }),
      col.accessor("createdAt", {
        header: "Abbinato il",
        meta: { label: "Abbinato il" },
        size: 170,
        cell: (c) => (
          <span className="text-muted">{formatDateTime(c.getValue())}</span>
        ),
      }),
      col.accessor("lastSeenAt", {
        header: "Ultimo uso",
        meta: { label: "Ultimo uso" },
        size: 130,
        cell: (c) => {
          const v = c.getValue();
          return (
            <span className="text-muted">
              {v ? formatRelative(v, new Date()) : "Mai"}
            </span>
          );
        },
      }),
      col.accessor("revokedAt", {
        header: "Stato",
        meta: { label: "Stato" },
        size: 110,
        cell: (c) =>
          c.getValue() ? (
            <StatusBadge status="void" label="Revocato" />
          ) : (
            <StatusBadge status="valid" label="Attivo" />
          ),
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">Azioni</span>,
        size: 190,
        enableHiding: false,
        cell: (c) =>
          c.row.original.revokedAt ? null : (
            <div className="flex justify-end gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditing(c.row.original)}
              >
                Modifica
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevoke(c.row.original)}
                className="text-danger"
              >
                Revoca
              </Button>
            </div>
          ),
      }),
    ];
  }, [titleOf]);

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex justify-end">
        <Button
          icon={QrCode}
          onClick={() => setPairing(true)}
          disabled={editions.length === 0}
        >
          Abbina dispositivo
        </Button>
      </div>
      <DataTable
        label="Dispositivi"
        data={devices}
        columns={columns}
        getRowId={(d) => d.id}
        empty={
          <EmptyState
            icon={Smartphone}
            title="Nessun dispositivo abbinato"
            description="Abbina i telefoni o i tablet che useranno la cassa o lo scanner all’evento."
          />
        }
      />
      {pairing && (
        <PairDeviceDialog
          editions={editions}
          registersByEdition={registersByEdition}
          defaultKind="pos"
          onPair={(input) => call(() => pairDeviceAction(input))}
          onClose={() => setPairing(false)}
        />
      )}
      {editing && (
        <EditDeviceDialog
          device={editing}
          registers={registersByEdition[editing.edition] ?? []}
          onSave={(input) =>
            call(
              () => updateDeviceAction(editing.id, editing.edition, input, false),
              `“${input.name}” aggiornato: vale da subito.`,
            )
          }
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={!!revoke}
        onOpenChange={(open) => !open && setRevoke(null)}
        title={`Revocare “${revoke?.name}”?`}
        description="Il dispositivo esce subito da cassa o scanner e non potrà rientrare. Per usarlo di nuovo va abbinato con un nuovo QR."
        confirmLabel="Revoca dispositivo"
        tone="danger"
        onConfirm={async () => {
          if (!revoke) return;
          const res = await call(
            () => revokeDeviceAction(revoke.id),
            `“${revoke.name}” è stato revocato.`,
          );
          if (!res.ok) throw new Error(res.error);
        }}
      />
    </div>
  );
}
