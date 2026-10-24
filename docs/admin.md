# Admin: mappa e shell (prompt 06)

La shell è in `src/components/admin/shell/` e ha due livelli (§10 di ARCHITETTURA.md):

- **Associazione** (`/admin/…`): panoramica, edizioni, vendite, clienti, soci, sito, sistema.
- **Edizione** (`/admin/e/<edizione>/…`): panoramica, date, catalogo, ordini, partecipanti, check-in, cassa, rimborsi, statistiche, pagina pubblica, moduli attivi e impostazioni.

Le voci di menu stanno tutte in `nav.config.ts`; sidebar, breadcrumb, palette ⌘K e scorciatoie `g x` leggono da lì.
Le edizioni vengono dalle tabelle `series` ed `editions` (prompt 08, vedi `docs/edizioni.md`). Quelle importate dal vecchio sistema sono collegate alle tabelle di oggi tramite `legacy_id_map`.

## Pagine precedenti al rifacimento

Le pagine di prima sono in `src/components/admin/legacy/` e vengono montate così come sono nelle nuove rotte.
Restano fuori da `.ui-root` (usano gli stili di `globals.css`); le pagine nuove si avvolgono in `AdminPage`, che attiva il design system.
Le pagine legacy di cassa, partecipanti e statistiche mostrano ancora i dati di tutte le edizioni insieme.
Ordini e scanner su mobile escono di qualche pixel dallo schermo come prima: si rifanno nei prompt 12 e 15.

Le sezioni non ancora costruite mostrano `ComingSoon` con un collegamento a dove si fa oggi la stessa cosa.

## Edizione corrente

`src/proxy.ts` salva nel cookie `pl_edition` l'ultima edizione aperta. `/admin/vai/<sezione>` porta alla stessa sezione di quell'edizione (o della prima attiva) e serve ai vecchi indirizzi senza edizione.

## Vecchi indirizzi

I redirect permanenti sono in `next.config.ts`:

| Prima | Ora |
| --- | --- |
| `/admin/eventi` | `/admin/edizioni` |
| `/admin/notizie` | `/admin/sito/notizie` |
| `/admin/media` | `/admin/sito/galleria` |
| `/admin/recensioni` | `/admin/e/zuccaland-2026/m/reviews` |
| `/admin/zuccaland-inviti` | `/admin/e/zuccaland-2026/m/invites` |
| `/admin/zuccaland-photos` | `/admin/e/zuccaland-2026/m/visitor-photos` |
| `/admin/cassa` | `/admin/vai/cassa` |
| `/admin/prenotazioni` | pagina di prima finché il flag `orders_v2` è spento, poi `/admin/vai/partecipanti` (vedi docs/admin-ordini.md) |
| `/admin/analytics` | `/admin/vai/statistiche` |
| `/admin/pagine/zuccaland` | `/admin/e/zuccaland-2026/pagina` |
| `/admin/pagine/sponsor` | `/admin/sito/sponsor` |
| `/admin/pagine/associazione` | `/admin/sito/pagine` |
| `/admin/pagine/archiviate/assaggia-2026` | `/admin/e/assaggia-e-passeggia-2026/pagina` |
| `/admin/impostazioni` | `/admin/sistema/impostazioni` |
| `/admin/email-preview` | `/admin/sistema/email` |
| `/admin/scanner` | `/scanner` (protetto come l'admin) |

Ordini, rimborsi, sconti e soci mantengono lo stesso indirizzo.

## Scorciatoie

`⌘K` / `Ctrl+K` apre la ricerca. `g d` panoramica, `g e` edizioni, `g o` ordini, `g r` rimborsi, `g i` impostazioni, `g c` cassa dell'edizione corrente. `/` mette il cursore nel filtro della pagina.
