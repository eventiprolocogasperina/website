# Messaggi ai partecipanti (`broadcast`)

WhatsApp ed email a un gruppo di clienti con ordine pagato, filtrato per data e per ingresso (entrati / non entrati).

**Impostazioni** (`editions.module_settings["broadcast"]`, form generato dallo schema in `module.ts`): `whatsapp`, `email` (canali disponibili).

**Eventi ascoltati**: Nessuno.

**Tabelle proprie**: `whatsapp_broadcasts`, `whatsapp_messages` (invii WhatsApp: codici ordine e numeri mascherati).

**Dove compare**: Servizio `broadcastAudience` in `server.ts`: restituisce dati personali, quindi solo a un utente dell’admin con `orders.edit` sull’edizione, mai a un dispositivo o a un processo automatico. Pagina “Messaggi” (`/admin/e/<edizione>/m/broadcast`, prompt 18): invio WhatsApp con un modello approvato a un segmento, anteprima del numero di destinatari e conferma (`whatsapp.ts`). Vedi `docs/notifiche.md`.

Spegnere il modulo non cancella dati né impostazioni.
