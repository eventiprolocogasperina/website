# Fasce orarie (`time-slots`)

Scelta della data nel checkout e capienza per data (`sessions.capacity`). Sostituisce `dateLimits` e il `dayKey` scritto nelle note degli ordini di Zuccaland.

**Impostazioni** (`editions.module_settings["time-slots"]`, form generato dallo schema in `module.ts`): `showRemaining` (mostra i posti rimasti), `lowThreshold` (soglia “ultimi posti”), `closeMinutesBefore` (chiusura della vendita online prima dell’inizio).

**Eventi ascoltati**: Nessuno.

**Tabelle proprie**: Nessuna: usa `sessions` e le quote del nucleo.

**Dove compare**: Pannello “Data” nella pagina ordine, passo “Scegli la data” nel checkout, controllo di chiusura “date chiuse o passate”. Lo usano: `postponement`.

Spegnere il modulo non cancella dati né impostazioni.
