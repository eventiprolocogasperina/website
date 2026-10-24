# Inviti e omaggi (`invites`)

Ordini a 0 € con canale `invite`, uno per invitato, anche in blocco. Occupano i posti come i biglietti venduti. Sostituisce `/admin/zuccaland-inviti` (la pagina di oggi resta raggiungibile da Moduli → Inviti finché il prompt 12 non la ridisegna).

**Impostazioni** (`editions.module_settings["invites"]`, form generato dallo schema in `module.ts`): `maxPerRecipient` (biglietti al massimo per invitato), `message` (testo dell’invito).

**Eventi ascoltati**: Nessuno.

**Tabelle proprie**: Nessuna.

**Dove compare**: Servizio `sendInvites` in `server.ts`: rilanciare lo stesso invio (`batchKey`) non crea ordini doppi. Senza il modulo, `createOrder` rifiuta il canale `invite`.

Spegnere il modulo non cancella dati né impostazioni.
