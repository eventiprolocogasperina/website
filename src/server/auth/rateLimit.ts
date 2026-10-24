// Limite di tentativi in memoria (per istanza). Basta per il login ponte del prompt 02.
const attempts = new Map<string, number[]>();

export function isRateLimited(key: string, max = 5, windowMs = 15 * 60 * 1000, now = Date.now()): boolean {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  attempts.set(key, recent);
  return recent.length >= max;
}

export function recordFailure(key: string, now = Date.now()) {
  attempts.set(key, [...(attempts.get(key) ?? []), now]);
}

export function clearFailures(key: string) {
  attempts.delete(key);
}
