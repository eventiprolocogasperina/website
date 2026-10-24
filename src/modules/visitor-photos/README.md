# Foto dei visitatori (`visitor-photos`)

Caricamento pubblico delle foto, moderazione e galleria.

**Impostazioni** (`editions.module_settings["visitor-photos"]`, form generato dallo schema in `module.ts`): `uploadsOpen` (caricamento aperto), `frames` (cornici).

**Eventi ascoltati**: Nessuno.

**Tabelle proprie**: `zuccaland_photos`.

**Dove compare**: Voce “Foto dei visitatori” nella scheda edizione, con il numero di foto da moderare. **Tabella**: resta `zuccaland_photos` per ora e diventa `mod_visitor_photos_items` con il prompt 19, insieme alle altre tabelle di oggi: rinominarla adesso romperebbe il caricamento pubblico di Zuccaland, che è in vendita (§18.10).

Spegnere il modulo non cancella dati né impostazioni.
