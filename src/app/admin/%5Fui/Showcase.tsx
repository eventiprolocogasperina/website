'use client';

import {
  Bell,
  CalendarDays,
  Filter,
  History,
  Moon,
  Pencil,
  Plus,
  Puzzle,
  Receipt,
  Search,
  Settings,
  Store,
  Sun,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Combobox,
  ConfirmDialog,
  DatePicker,
  Dialog,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Field,
  ForbiddenState,
  IconButton,
  Input,
  Kbd,
  KeyValue,
  MoneyInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  Select,
  Sheet,
  SheetContent,
  SheetTrigger,
  Skeleton,
  SkeletonText,
  Stat,
  STATUS_META,
  StatusBadge,
  Switch,
  Tabs,
  Textarea,
  Toaster,
  TooltipProvider,
  Tooltip,
  toast,
  type BadgeTone,
} from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { DashboardPageExample, DetailPageExample, FormPageExample, ListPageExample } from './Examples';

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 border-t border-border pt-8">
      <h2 className="text-title font-semibold">{title}</h2>
      {description && <p className="mt-1 mb-4 max-w-2xl text-body text-muted">{description}</p>}
      <div className={description ? '' : 'mt-4'}>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-6">
      <span className="w-32 shrink-0 text-caption text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const TOC = [
  ['pulsanti', 'Pulsanti'],
  ['campi', 'Campi'],
  ['scelte', 'Scelte'],
  ['badge', 'Badge e stati'],
  ['contenitori', 'Card e numeri'],
  ['sovrapposti', 'Finestre e menu'],
  ['stati', 'Caricamento, vuoto, errore'],
  ['dati', 'Dati'],
  ['modello-elenco', 'Modello Elenco'],
  ['modello-dettaglio', 'Modello Dettaglio'],
  ['modello-modulo', 'Modello Modulo'],
  ['modello-panoramica', 'Modello Panoramica'],
] as const;

export default function Showcase() {
  const { theme, toggleTheme } = useTheme();
  const [money, setMoney] = useState<number | null>(1250);
  const [date, setDate] = useState('2026-10-25');
  const [customer, setCustomer] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [channel, setChannel] = useState('online');

  return (
    <TooltipProvider>
      <div className="ui-root min-h-screen rounded-xl p-4 sm:p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-caption font-medium tracking-wide text-accent uppercase">Design system · prompt 05</p>
              <h1 className="text-kpi font-semibold">Componenti dell&apos;admin</h1>
              <p className="mt-1 max-w-2xl text-body text-muted">
                Ogni pagina admin nuova usa solo questi componenti e i token semantici. Prova il tema scuro e la larghezza da telefono.
              </p>
            </div>
            <Button variant="secondary" icon={theme === 'dark' ? Sun : Moon} onClick={toggleTheme}>
              {theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            </Button>
          </header>

          <nav aria-label="Sezioni" className="flex flex-wrap gap-2">
            {TOC.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-border bg-surface px-3 py-1 text-label hover:bg-surface-sunken">
                {label}
              </a>
            ))}
          </nav>

          <Section id="pulsanti" title="Pulsanti" description="Verbo e oggetto nel testo. Un solo pulsante primary per area.">
            <Card>
              <Row label="Varianti">
                <Button icon={Plus}>Crea edizione</Button>
                <Button variant="secondary">Esporta CSV</Button>
                <Button variant="ghost">Vedi tutti</Button>
                <Button variant="danger" icon={Trash2}>
                  Elimina sconto
                </Button>
              </Row>
              <Row label="Dimensioni">
                <Button size="sm">Piccolo</Button>
                <Button size="md">Medio</Button>
                <Button size="lg">Grande</Button>
              </Row>
              <Row label="Stati">
                <Button loading>Salvataggio</Button>
                <Button disabled>Disabilitato</Button>
                <Button variant="secondary" loading>
                  Invio
                </Button>
              </Row>
              <Row label="Solo icona">
                <IconButton icon={Pencil} label="Modifica" variant="secondary" />
                <IconButton icon={Filter} label="Filtra" />
                <IconButton icon={Trash2} label="Elimina" variant="danger" />
                <IconButton icon={Bell} label="Notifiche" size="sm" />
              </Row>
            </Card>
          </Section>

          <Section id="campi" title="Campi" description="Altezza 36 px, etichetta sempre visibile, errore sotto il campo in italiano.">
            <Card>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome dell'edizione" help="Compare nel titolo della pagina pubblica.">
                  <Input placeholder="Zuccaland 2027" />
                </Field>
                <Field label="Email del cliente" required error="Inserisci un'email valida, ad esempio nome@esempio.it.">
                  <Input type="email" defaultValue="giulia@" />
                </Field>
                <Field label="Cerca">
                  <Input prefix={<Search size={16} aria-hidden />} suffix={<Kbd>/</Kbd>} placeholder="Codice, nome o email" />
                </Field>
                <Field label="Disabilitato">
                  <Input disabled value="Non modificabile" readOnly />
                </Field>
                <Field label="Importo" help={`Valore in centesimi: ${money ?? 'vuoto'} → ${money === null ? '—' : formatMoney(money)}`}>
                  <MoneyInput value={money} onValueChange={setMoney} />
                </Field>
                <Field label="Data">
                  <DatePicker value={date} onValueChange={setDate} />
                </Field>
                <Field label="Canale">
                  <Select
                    value={channel}
                    onValueChange={setChannel}
                    options={[
                      { value: 'online', label: 'Online' },
                      { value: 'cassa', label: 'Cassa' },
                      { value: 'invito', label: 'Invito', disabled: true },
                    ]}
                  />
                </Field>
                <Field label="Cliente">
                  <Combobox
                    value={customer}
                    onValueChange={setCustomer}
                    placeholder="Scegli un cliente"
                    searchPlaceholder="Cerca per nome o email"
                    options={[
                      { value: 'c1', label: 'Giulia Ferraro', hint: 'giulia.ferraro@example.com' },
                      { value: 'c2', label: 'Marco Rotella', hint: 'marco.rotella@example.com' },
                      { value: 'c3', label: 'Anna Lucà', hint: 'anna.luca@example.com' },
                      { value: 'c4', label: 'Paolo Mancuso', hint: 'paolo.mancuso@example.com' },
                    ]}
                  />
                </Field>
                <Field label="Note interne" className="md:col-span-2">
                  <Textarea placeholder="Visibili solo allo staff" />
                </Field>
              </div>
            </Card>
          </Section>

          <Section id="scelte" title="Scelte">
            <Card>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex flex-col gap-3">
                  <Checkbox label="Invia email di conferma" defaultChecked />
                  <Checkbox label="Includi i PDF" description="Un PDF per biglietto." />
                  <Checkbox label="Selezione parziale" checked="indeterminate" />
                  <Checkbox label="Disabilitata" disabled />
                </div>
                <div className="flex flex-col gap-4">
                  <Switch label="Vendite online" description="Effetto immediato." defaultChecked />
                  <Switch label="Modalità manutenzione" />
                </div>
                <RadioGroup
                  aria-label="Metodo di rimborso"
                  defaultValue="card"
                  options={[
                    { value: 'card', label: 'Sulla carta', description: 'Tramite Nexi, 5-10 giorni.' },
                    { value: 'iban', label: 'Bonifico', description: "Serve l'IBAN del cliente." },
                    { value: 'cash', label: 'In contanti', disabled: true },
                  ]}
                />
              </div>
            </Card>
          </Section>

          <Section id="badge" title="Badge e stati" description="StatusBadge usa una mappa unica stato → tono (§14.5): qui tutti gli stati del dominio.">
            <Card>
              <Row label="Toni">
                {(['neutral', 'info', 'success', 'warning', 'danger', 'primary'] as BadgeTone[]).map((t) => (
                  <Badge key={t} tone={t}>
                    {t}
                  </Badge>
                ))}
              </Row>
              <Row label="Stati">
                {Object.keys(STATUS_META).map((s) => (
                  <StatusBadge key={s} status={s} />
                ))}
              </Row>
            </Card>
          </Section>

          <Section id="contenitori" title="Card e numeri">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Incassato oggi" value={formatMoney(184320)} delta="+12%" trend="up" help="rispetto a ieri" />
              <Stat label="Biglietti" value="1.204" delta="+38" trend="up" />
              <Stat label="Check-in" value="62%" help="748 su 1.204" />
              <Stat label="Rimborsi" value="3" delta="−2" trend="down" invertTrend />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card title="Card con azioni" description="Titolo, descrizione e azioni a destra." actions={<Button variant="ghost" size="sm">Modifica</Button>} footer={<a href="#" className="text-primary hover:underline">Vedi tutti gli ordini</a>}>
                <p className="text-body text-muted">Contenuto della card. Raggio 12 px, ombra leggera, bordo sottile.</p>
              </Card>
              <Card title="Schede">
                <Tabs
                  aria-label="Esempio di schede"
                  items={[
                    { value: 'a', label: 'Biglietti', count: 4, content: <p className="text-muted">Contenuto della scheda Biglietti.</p> },
                    { value: 'b', label: 'Pagamenti', count: 1, content: <p className="text-muted">Contenuto della scheda Pagamenti.</p> },
                    { value: 'c', label: 'Note', content: <p className="text-muted">Nessuna nota.</p> },
                  ]}
                />
              </Card>
            </div>
          </Section>

          <Section id="sovrapposti" title="Finestre e menu" description="Esc chiude, il focus resta dentro la finestra e torna al pulsante alla chiusura.">
            <Card>
              <Row label="Dialog">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary">Apri finestra</Button>
                  </DialogTrigger>
                  <DialogContent title="Cambia data del biglietto" description="Il cliente riceve un'email con i nuovi biglietti." footer={<Button>Cambia data</Button>}>
                    <Field label="Nuova sessione">
                      <Select options={[{ value: '1', label: 'dom 25 ott · 10:00' }, { value: '2', label: 'dom 25 ott · 15:00' }]} />
                    </Field>
                  </DialogContent>
                </Dialog>
                <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                  Conferma semplice
                </Button>
                <Button variant="danger" onClick={() => setArchiveOpen(true)}>
                  Conferma digitando
                </Button>
              </Row>
              <Row label="Pannello">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary" icon={Pencil}>
                      Modifica prodotto
                    </Button>
                  </SheetTrigger>
                  <SheetContent title="Ingresso adulto" description="Zuccaland 2026 · catalogo" footer={<Button>Salva prodotto</Button>}>
                    <div className="flex flex-col gap-4">
                      <Field label="Nome">
                        <Input defaultValue="Ingresso adulto" />
                      </Field>
                      <Field label="Prezzo">
                        <MoneyInput value={1170} onValueChange={() => {}} />
                      </Field>
                    </div>
                  </SheetContent>
                </Sheet>
              </Row>
              <Row label="Menu e popup">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary">Azioni</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Edizione</DropdownMenuLabel>
                    <DropdownMenuItem icon={CalendarDays}>Apri edizione</DropdownMenuItem>
                    <DropdownMenuItem icon={Store}>Apri cassa</DropdownMenuItem>
                    <DropdownMenuItem icon={Puzzle}>Moduli</DropdownMenuItem>
                    <DropdownMenuItem icon={Settings} shortcut="g i">
                      Impostazioni
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem icon={Trash2} tone="danger">
                      Archivia edizione
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="secondary" icon={Filter}>
                      Filtro stato
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="flex flex-col gap-2">
                      <Checkbox label="Pagati" defaultChecked />
                      <Checkbox label="In attesa" />
                      <Checkbox label="Rimborsati" />
                    </div>
                  </PopoverContent>
                </Popover>
                <Tooltip content="Ultimo aggiornamento 2 minuti fa">
                  <Button variant="ghost" icon={History}>
                    Passa sopra
                  </Button>
                </Tooltip>
              </Row>
              <Row label="Notifiche">
                <Button variant="secondary" onClick={() => toast.success('Ordine rimborsato', { action: { label: 'Annulla', onClick: () => toast('Rimborso annullato') } })}>
                  Successo con Annulla
                </Button>
                <Button variant="secondary" onClick={() => toast.error('Il pagamento non è andato a buon fine. Riprova.')}>
                  Errore
                </Button>
                <Button variant="secondary" onClick={() => toast('Biglietti reinviati a 3 clienti')}>
                  Informazione
                </Button>
              </Row>
            </Card>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Eliminare lo sconto FAMIGLIA10?"
              description="Gli ordini già fatti con questo sconto non cambiano. Il codice smette di funzionare subito."
              confirmLabel="Elimina sconto"
              onConfirm={() => {
                toast.success('Sconto eliminato (simulazione)');
              }}
            />
            <ConfirmDialog
              open={archiveOpen}
              onOpenChange={setArchiveOpen}
              title="Archiviare Zuccaland 2026?"
              description="L'edizione diventa di sola lettura: non si potranno più modificare ordini, prezzi o pagine."
              confirmLabel="Archivia edizione"
              confirmText="Zuccaland 2026"
              onConfirm={async () => {
                await new Promise((r) => setTimeout(r, 600));
                toast.success('Edizione archiviata (simulazione)');
              }}
            />
          </Section>

          <Section id="stati" title="Caricamento, vuoto, errore" description="Ogni pagina li prevede tutti e quattro (§11.6).">
            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Caricamento">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <SkeletonText lines={2} />
                  </div>
                </div>
              </Card>
              <Card>
                <EmptyState icon={Receipt} title="Nessun ordine ancora" description="Condividi il link della pagina per iniziare a vendere." action={<Button variant="secondary">Copia link</Button>} />
              </Card>
              <Card>
                <ErrorState onRetry={() => toast('Nuovo tentativo')} code="1608007439" />
              </Card>
              <Card>
                <ForbiddenState />
              </Card>
            </div>
          </Section>

          <Section id="dati" title="Dati">
            <div className="grid gap-4 md:grid-cols-2">
              <Card title="KeyValue">
                <KeyValue
                  items={[
                    { label: 'Codice', value: 'ZK26-7F3K' },
                    { label: 'Totale', value: formatMoney(3510) },
                    { label: 'Pagato con', value: 'Carta (Nexi)' },
                    { label: 'Rimborsabile fino al', value: '23 ottobre 2026' },
                  ]}
                />
              </Card>
              <Card title="Avatar e tasti">
                <Row label="Avatar">
                  <Avatar name="Niccolo Vono" size="sm" />
                  <Avatar name="Giulia Ferraro" />
                  <Avatar name="Cassa" size="lg" />
                </Row>
                <Row label="Scorciatoie">
                  <Kbd>⌘K</Kbd> <span className="text-muted">cerca</span>
                  <Kbd>/</Kbd> <span className="text-muted">filtra</span>
                  <Kbd>g</Kbd>
                  <Kbd>o</Kbd> <span className="text-muted">ordini</span>
                </Row>
                <Row label="Icone">
                  <span className="flex gap-3 text-muted">
                    <CalendarDays size={20} aria-label="Edizione" />
                    <Receipt size={20} aria-label="Ordine" />
                    <Store size={20} aria-label="Cassa" />
                    <Undo2 size={20} aria-label="Rimborso" />
                    <Puzzle size={20} aria-label="Modulo" />
                    <Settings size={20} aria-label="Impostazioni" />
                    <History size={20} aria-label="Registro" />
                  </span>
                </Row>
              </Card>
            </div>
          </Section>

          <Section id="modello-elenco" title="Modello Elenco" description="Viste salvate, ricerca con debounce, tabella con ordinamento, selezione, colonne nascondibili e ridimensionabili, paginazione lato server. Seleziona delle righe per vedere la barra in basso.">
            <ListPageExample />
          </Section>
          <Section id="modello-dettaglio" title="Modello Dettaglio" description="Colonna principale e laterale, cronologia in fondo. Su telefono una colonna sola.">
            <DetailPageExample />
          </Section>
          <Section id="modello-modulo" title="Modello Modulo" description="Sezioni annotate. Cambia un campo: compare la barra di salvataggio e il browser avvisa se esci.">
            <FormPageExample />
          </Section>
          <Section id="modello-panoramica" title="Modello Panoramica" description="Quattro numeri, Da fare, grafico e attività recente.">
            <DashboardPageExample />
          </Section>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
