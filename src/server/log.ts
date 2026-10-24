// Logger JSON su stdout (letto dai log di Vercel). Maschera email, telefoni, IBAN e token
// prima di scrivere: nei log non devono finire dati personali in chiaro (§18).

type Level = 'debug' | 'info' | 'warn' | 'error';
type Context = Record<string, unknown>;

const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const IBAN = /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}\b/g;
const PHONE = /(?<![\w-])\+?\d(?:[\s.]?\d){7,13}(?![\w-])/g;
const SENSITIVE_KEYS = /pass(word)?|secret|token|authorization|cookie|mac|iban|apikey|api_key/i;

export function maskString(value: string): string {
  return value
    .replace(EMAIL, (_m, first: string, domain: string) => `${first}***@${domain}`)
    .replace(IBAN, (m) => `${m.slice(0, 4)}…${m.replace(/\s/g, '').slice(-2)}`)
    .replace(PHONE, (m) => `***${m.replace(/\D/g, '').slice(-3)}`);
}

export function maskValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return maskString(value);
  if (value instanceof Error) {
    return { name: value.name, message: maskString(value.message), stack: value.stack && maskString(value.stack) };
  }
  if (depth > 5 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => maskValue(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = SENSITIVE_KEYS.test(key) ? '[nascosto]' : maskValue(v, depth + 1);
  }
  return out;
}

function write(level: Level, msg: string, context?: Context) {
  const entry = { level, time: new Date().toISOString(), msg: maskString(msg), ...(maskValue(context ?? {}) as Context) };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, context?: Context) => {
    if (process.env.NODE_ENV !== 'production') write('debug', msg, context);
  },
  info: (msg: string, context?: Context) => write('info', msg, context),
  warn: (msg: string, context?: Context) => write('warn', msg, context),
  /** Errore: va nei log e, raggruppato, su Telegram alla chat admin (`alerts.ts`, solo con il bot configurato). */
  error: (msg: string, context?: Context) => {
    write('error', msg, context);
    const sink = (globalThis as { [ERROR_SINK]?: ErrorSink })[ERROR_SINK];
    if (sink) void sink(msg, context).catch(() => {});
  },
};

/**
 * Destinazione degli allarmi di errore. La registra `src/instrumentation.ts` sul server (alerts.ts):
 * questo file lo importano anche moduli che finiscono nei componenti client, quindi non può
 * importare il database. Si usa globalThis perché Next carica più copie di questo modulo.
 */
type ErrorSink = (msg: string, context?: Context) => Promise<unknown>;
const ERROR_SINK = '__prolocoErrorSink';
export function setErrorSink(sink: ErrorSink | null): void {
  (globalThis as { [ERROR_SINK]?: ErrorSink | null })[ERROR_SINK] = sink;
}
