# Sito pubblico: menu, calendario, Trasparenza, SEO (prompt 17a + 17c)

## Interruttore `public_v2`
`site_settings.public_v2` (migrazione `0013`, spento). Si accende da **/admin/sito/navigazione** (owner/admin, nel registro). Spento, o con il database irraggiungibile, il sito è identico a prima.

| Con il flag acceso | Codice |
|---|---|
| Menu da `/admin/sito/navigazione` con tendina "Eventi" (Calendario + format con pagina pubblica) | `src/lib/public/nav.ts`, `src/server/domain/site/navigation.ts`, `src/components/layout/Navbar.tsx` + `NavDropdown.tsx` |
| `/eventi` dalle edizioni (non bozze né sospese), filtri `?categoria=` e `?mese=AAAA-MM` | `src/lib/public/calendar.ts`, `src/app/eventi/page.tsx` |
| Home "Prossimi eventi" dalle edizioni | `src/app/page.tsx` |
| `/eventi/[slug]`: 308 per le edizioni `landing`, 308 dal vecchio slug a quello dell'edizione, scheda nuova (`EditionDetail`) per le `generic` | `src/app/eventi/[slug]/page.tsx` |
| Sitemap con format e indirizzi delle edizioni | `src/app/sitemap.ts` |

La scheda nuova col catalogo e il pulsante verso `/acquista/<slug>` compare solo con `NUOVO_CHECKOUT=1`; altrimenti si vede la scheda di oggi (`EventDetailContent`).

## Regole degli indirizzi (`src/lib/public/editions.ts`)
- **Edizione corrente** di un format: la prima per data tra `published`, `on_sale`, `sold_out`, `live` (`currentEditionOf`). Il 17b la usa per `/zuccaland`.
- Card di un'edizione `landing`: `/<landing_path>` se è la corrente, `/<landing_path>/<anno>` per le altre; senza `landing_path` (Baguette) la pagina di oggi `/eventi/<slug di oggi>`; altrimenti `/eventi/<slug>`.
- Il menu si legge dalla cache (`unstable_cache`, tag `public-nav`, 5 minuti), che si svuota a ogni salvataggio: una nuova edizione pubblicata entra nella tendina entro 5 minuti.
- Categoria dell'edizione: `editions.category` (impostazioni dell'edizione), riempita dagli eventi di oggi.

## Redirect permanenti (`next.config.ts`)
`/assaggia-e-passeggia/edizione-2026` e `/…/edizione-2026/ticket` e `/assaggia-e-passeggia/ticket` → `/assaggia-e-passeggia/2026`; `/…/edizione-2026/tappa/:id` → `/assaggia-e-passeggia/tappa/:id` (URL stabile dei QR). `/…/edizione-2026/success` resta (link nelle email; con il checkout nuovo e ordine migrato porta alla conferma nuova, prompt 13). **Le destinazioni le crea il 17b**: questo branch va unito insieme al suo. `scripts/check-links.ts` ha l'elenco degli URL storici.

## Trasparenza (§13.6)
- `/trasparenza`: in breve, trattamenti (dati, finalità, base giuridica, conservazione), fornitori, cookie, diritti con modulo, storico. Link nel footer e da `/privacy`.
- Contenuti in `transparency_versions` (una riga per pubblicazione, mai modificata); senza righe vale `DEFAULT_TRANSPARENCY` (`src/lib/public/transparency.ts`).
- Modulo → `privacy_requests` (limite 5 ogni 15 minuti per IP, campo trappola) + allarme Telegram senza dati personali. Le richieste si gestiscono in `/admin/sito/trasparenza` (scheda Richieste, `customers.read`); i contenuti con `content.edit`.
- La correzione di `/privacy` è una proposta: `docs/proposte/privacy.md`.

## SEO (§13.5)
- `src/lib/seo/jsonld.ts`: `eventJsonLd` (stato da date e rinvii, offerte dal catalogo), `eventSeriesJsonLd`, `jsonLdText`.
- Immagine OG generata: `src/server/seo/og-image.tsx` (`editionOgCard`, `eventOgImage`), usata da `src/app/eventi/[slug]/opengraph-image.tsx`. Le pagine del format del 17b aggiungono il loro `opengraph-image.tsx` con `editionOgCard` e lo script `EventSeries`.
- `robots.ts` esclude admin, app da campo, checkout e pagine personali.
