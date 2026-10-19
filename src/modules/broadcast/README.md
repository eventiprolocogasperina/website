# Messaggi ai partecipanti (`broadcast`)

WhatsApp ed email a un gruppo di clienti con ordine pagato, filtrato per data e per ingresso (entrati / non entrati).

**Impostazioni** (`editions.module_settings["broadcast"]`, form generato dallo schema in `module.ts`): `whatsapp`, `email` (canali disponibili).

**Eventi ascoltati**: Nessuno.

**Tabelle proprie**: Nessuna.

**Dove compare**: Servizio `broadcastAudience` in `server.ts`: restituisce dati personali, quindi solo a un utente dell’admin con `orders.edit` sull’edizione, mai a un dispositivo o a un processo automatico. Fino al prompt 12 l’invio resta nella pagina Ordini (WhatsApp in blocco).

Spegnere il modulo non cancella dati né impostazioni.
