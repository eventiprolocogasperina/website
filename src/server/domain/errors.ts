// Errori di dominio: un codice stabile per il codice chiamante e un messaggio in italiano per l'utente.

export const DOMAIN_ERROR_MESSAGES = {
  NOT_FOUND: 'Non abbiamo trovato quello che cerchi.',
  UNAUTHORIZED: 'Accedi per continuare.',
  FORBIDDEN: 'Non hai i permessi per questa operazione.',
  VALIDATION: 'Alcuni dati non sono validi. Controlla i campi e riprova.',
  CONFLICT: 'I dati sono cambiati nel frattempo. Ricarica la pagina e riprova.',
  SOLD_OUT: 'I posti disponibili sono esauriti.',
  SALES_CLOSED: 'Le vendite per questo evento sono chiuse.',
  PRICE_CHANGED: 'Il prezzo è cambiato. Controlla il riepilogo e riprova.',
  DISCOUNT_INVALID: 'Il codice sconto non è valido o è scaduto.',
  PAYMENT_FAILED: 'Il pagamento non è andato a buon fine. Riprova o scegli un altro metodo.',
  EDITION_ARCHIVED: "L'edizione è archiviata e non si può modificare.",
  RATE_LIMITED: 'Troppi tentativi. Aspetta qualche minuto e riprova.',
  INTERNAL: 'Si è verificato un errore. Riprova tra poco.',
} as const;

export type DomainErrorCode = keyof typeof DOMAIN_ERROR_MESSAGES;

const HTTP_STATUS: Record<DomainErrorCode, number> = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION: 400,
  CONFLICT: 409,
  SOLD_OUT: 409,
  SALES_CLOSED: 409,
  PRICE_CHANGED: 409,
  DISCOUNT_INVALID: 400,
  PAYMENT_FAILED: 402,
  EDITION_ARCHIVED: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  /** Dettagli tecnici per i log, mai mostrati all'utente. */
  readonly details?: Record<string, unknown>;

  constructor(code: DomainErrorCode, options?: { message?: string; details?: Record<string, unknown>; cause?: unknown }) {
    super(options?.message ?? DOMAIN_ERROR_MESSAGES[code], { cause: options?.cause });
    this.name = 'DomainError';
    this.code = code;
    this.details = options?.details;
  }

  get status(): number {
    return HTTP_STATUS[this.code];
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/** Corpo JSON da restituire al client: codice e messaggio in italiano, niente stack né dettagli. */
export function toErrorBody(error: unknown): { status: number; body: { code: DomainErrorCode; error: string } } {
  if (isDomainError(error)) return { status: error.status, body: { code: error.code, error: error.message } };
  return { status: 500, body: { code: 'INTERNAL', error: DOMAIN_ERROR_MESSAGES.INTERNAL } };
}
