// Dati inventati per la vetrina: nessun cliente reale.

export type FakeOrder = {
  id: string;
  code: string;
  customer: string;
  email: string;
  edition: string;
  session: string;
  tickets: number;
  totalCents: number;
  status: 'paid' | 'pending' | 'refunded' | 'cancelled' | 'partially_refunded' | 'expired';
  createdAt: string;
};

const NAMES = ['Giulia Ferraro', 'Marco Rotella', 'Anna Lucà', 'Paolo Mancuso', 'Sara Gatto', 'Luca Procopio', 'Elena Critelli', 'Davide Talarico', 'Chiara Fiorentino', 'Antonio Scalise', 'Francesca Mazza', 'Giorgio Bruno'];
const STATUSES: FakeOrder['status'][] = ['paid', 'paid', 'paid', 'pending', 'paid', 'refunded', 'paid', 'cancelled', 'paid', 'partially_refunded', 'paid', 'expired'];
const SESSIONS = ['sab 24 ott · 10:00', 'sab 24 ott · 15:00', 'dom 25 ott · 10:00', 'dom 25 ott · 15:00'];
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

// Generatore deterministico: la vetrina mostra sempre gli stessi dati.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

export const FAKE_ORDERS: FakeOrder[] = (() => {
  const r = rng(20261019);
  return Array.from({ length: 137 }, (_, i) => {
    const name = NAMES[i % NAMES.length];
    const tickets = 1 + Math.floor(r() * 5);
    const code = 'ZK26-' + Array.from({ length: 4 }, () => ALPHABET[Math.floor(r() * ALPHABET.length)]).join('');
    const minutesAgo = Math.floor(i * 97 + r() * 60);
    return {
      id: `ord_${i + 1}`,
      code,
      customer: name,
      email: name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com',
      edition: 'Zuccaland 2026',
      session: SESSIONS[i % SESSIONS.length],
      tickets,
      totalCents: tickets * 1170,
      status: STATUSES[(i * 7) % STATUSES.length],
      createdAt: new Date(Date.UTC(2026, 9, 19, 10, 0) - minutesAgo * 60_000).toISOString(),
    };
  });
})();
