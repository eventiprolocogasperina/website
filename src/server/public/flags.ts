import 'server-only';

/**
 * Il checkout nuovo sostituisce i componenti d'acquisto di oggi (Zuccaland, A&P) e i vecchi URL di
 * successo portano alla conferma nuova solo con NUOVO_CHECKOUT=1. Spento di default: §18.10, niente
 * cambi all'acquisto di Zuccaland mentre vende.
 */
export const newCheckoutEnabled = () => process.env.NUOVO_CHECKOUT === '1';
