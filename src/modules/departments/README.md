# Reparti e comande (`departments`)

Reparti della cassa e comande (oggi `enableDepartments`). Schermo reparto `/cassa/reparto/[reparto]` e schermo pubblico `/cassa/pronti/[edizione]` (prompt 14).

**Impostazioni** (`editions.module_settings["departments"]`, form generato dallo schema in `module.ts`): `printTickets`, `kitchenScreen`, `readyScreen` (schermo "Pronti" pubblico, spento di default).

**Eventi ascoltati**: Nessuno.

**Tabelle proprie**: Nessuna per ora.

**Dove compare**: Azione della cassa “Manda in cucina”.

Spegnere il modulo non cancella dati né impostazioni.
