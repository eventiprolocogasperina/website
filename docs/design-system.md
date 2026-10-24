# Design system dell'admin (prompt 05)

Componenti in `src/components/ui/` (importali da `@/components/ui`), token in `src/styles/tokens.css`,
vetrina su **`/admin/_ui`** (richiede l'accesso admin). Riferimento: ARCHITETTURA §11 e §14.

## Regole

- Nei componenti nuovi: solo classi Tailwind con i token (`bg-surface`, `text-muted`, `border-border`,
  `bg-primary`, `text-danger`…), nessun colore esadecimale e nessuno `style={}`. Uniche eccezioni,
  perché calcolate a runtime: larghezza delle colonne in `DataTable` e altezza delle barre nei grafici.
- Ogni pagina admin nuova sta dentro un contenitore `.ui-root` (lo farà la shell del prompt 06):
  imposta DM Sans, colori di base e la tipografia a 14 px. I popup in portale hanno già `.ui-root`.
- Scala tipografica: `text-caption` 12 · `text-label` 13 · `text-body` 14 · `text-section` 16 ·
  `text-title` 20 · `text-kpi` 28. Importi sempre con `tabular-nums` e `formatMoney(cents)`.
- Raggi: `rounded-md` 6 (campi, badge), `rounded-lg` 8 (pulsanti), `rounded-xl` 12 (card, dialog).
- Focus: `focusRing` da `cn.ts` (2 px `--ui-focus-ring`), animazioni ≤ 150 ms, `prefers-reduced-motion` rispettato.

## Convivenza con il sito pubblico

`globals.css` usa già nomi come `--surface`, `--color-primary`, `--radius-lg`, `--shadow-lg` per il sito
pubblico. Per non toccarlo:

- le variabili dell'admin hanno il prefisso `--ui-`;
- `@theme inline` scrive i valori direttamente nelle utility, quindi le variabili omonime del sito
  pubblico non le influenzano (e viceversa);
- il reset `* { margin: 0; padding: 0 }` e gli stili di `h1…h6`, `p`, `a` di `globals.css` non sono in
  un layer e annullerebbero le utility Tailwind: ora escludono `.ui-root` con `:where(:not(…))`, che
  mantiene la specificità originale.

Verifica: screenshot di home, `/zuccaland` ed `/eventi` a 375 e 1440 px, tema chiaro e scuro, prima e
dopo le modifiche: identici pixel per pixel (le uniche differenze su `/zuccaland` sono sotto la soglia
di rumore e compaiono anche confrontando due catture dello stesso codice).

## Contrasto (WCAG AA)

Testo almeno 4,5:1, bordi dei campi e anello di focus almeno 3:1. Rispetto al §14.1 sono stati scuriti
`text-subtle` (chiaro `#666d80`, scuro `#7c8399`), `accent` chiaro (`#9a6a08`) e `border-strong`
(chiaro `#858c9f`, scuro `#5e6680`): con i valori originali erano sotto soglia.

| Coppia | Uso | Chiaro | Scuro |
|---|---|---|---|
| `text` su `surface` | Testo principale | 17.29:1 ✅ | 14.99:1 ✅ |
| `text` su `bg` | Testo su sfondo pagina | 16.15:1 ✅ | 16.06:1 ✅ |
| `text-muted` su `surface` | Testo secondario | 6.01:1 ✅ | 6.98:1 ✅ |
| `text-muted` su `bg` | Testo secondario su sfondo | 5.61:1 ✅ | 7.48:1 ✅ |
| `text-subtle` su `surface` | Segnaposto, contatori | 5.17:1 ✅ | 4.77:1 ✅ |
| `primary` su `surface` | Link e accenti | 7.97:1 ✅ | 4.83:1 ✅ |
| `primary-fg` su `primary` | Pulsante primario | 7.97:1 ✅ | 5.17:1 ✅ |
| `surface` su `danger` | Pulsante danger | 6.47:1 ✅ | 6.51:1 ✅ |
| `accent` su `surface` | Etichetta oro | 4.73:1 ✅ | 8.68:1 ✅ |
| `success` su `success-bg` | Badge success | 4.57:1 ✅ | 7.80:1 ✅ |
| `warning` su `warning-bg` | Badge warning | 4.51:1 ✅ | 8.08:1 ✅ |
| `danger` su `danger-bg` | Badge danger | 5.30:1 ✅ | 5.36:1 ✅ |
| `info` su `info-bg` | Badge info | 5.55:1 ✅ | 6.74:1 ✅ |
| `primary-fg` su `primary` | Badge primary (pieno), avatar usa `info` su `info-bg` | 7.97:1 ✅ | 5.17:1 ✅ |
| `text-muted` su `surface-sunken` | Badge neutro, intestazioni tabella | 5.27:1 ✅ | 7.62:1 ✅ |
| `danger` su `surface` | Messaggi di errore | 6.47:1 ✅ | 6.51:1 ✅ |
| `border-strong` su `surface` | Bordo dei campi (non testo, min. 3:1) | 3.36:1 ✅ | 3.16:1 ✅ |
| `focus-ring` su `surface` | Anello di focus (non testo, min. 3:1) | 4.63:1 ✅ | 6.10:1 ✅ |

Rapporti calcolati con la formula WCAG 2.x sui valori di `tokens.css`; i fondi semitrasparenti del tema
scuro sono composti sopra `surface`.

## Componenti

`Button`/`ButtonLink`, `IconButton` (etichetta obbligatoria), `Input`, `Textarea`, `Select`, `Combobox`,
`Checkbox` (anche indeterminata), `Switch`, `RadioGroup`, `DatePicker` (calendario nativo),
`MoneyInput` (centesimi), `Field`, `Badge`, `StatusBadge` (mappa unica stato → tono), `Card`, `Stat`,
`Tabs`, `Dialog`, `ConfirmDialog` (anche "scrivi X per confermare"), `Sheet`, `DropdownMenu`,
`Popover`, `Tooltip`, `Toaster`/`toast`, `Skeleton`, `EmptyState`, `ErrorState`, `ForbiddenState`,
`PageHeader`, `FilterBar` (debounce 300 ms, `/` per cercare), `DataTable`, `BulkActionBar`,
`ContextualSaveBar`, `AnnotatedSection`, `TwoColumnLayout`, `Timeline`, `KeyValue`, `Avatar`, `Kbd`.

`DataTable` usa TanStack Table **v9** (`useTable` + `tableFeatures`): ordinamento (manuale se passi
`onSortingChange`), selezione, colonne nascondibili e ridimensionabili, skeleton, stato vuoto,
paginazione lato server tramite `pagination`. Le colonne si scrivono con `dataTableColumns<Riga>()`;
in `meta.label` va il nome per il menu "Colonne", in `meta.align: 'right'` gli importi.

`formatMoney` non usa più `Intl`: Node e Chrome hanno dati ICU diversi (Node scrive "1234,56 €",
Chrome "1.234,56 €") e la differenza rompeva l'idratazione di React.
