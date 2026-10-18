/* eslint-disable */
// Proxy minimale che imita Neon per lo sviluppo locale.
// - POST /sql: le query HTTP del driver @neondatabase/serverless (funzione neon()).
// - WebSocket /v2: il tunnel usato da Pool/Client, girato in TCP verso Postgres.
const http = require('http');
const net = require('net');
const { WebSocketServer } = require('ws');
const { Pool, types } = require('pg');

// Restituisce sempre il testo grezzo: il driver Neon fa il parsing dei tipi lato client.
types.getTypeParser = () => (v) => v;

const pool = new Pool({ connectionString: process.env.PG_CONNECTION_STRING });

async function run(client, q) {
  const res = await client.query({ text: q.query, values: q.params ?? [], rowMode: 'array' });
  return {
    command: res.command,
    rowCount: res.rowCount,
    fields: (res.fields ?? []).map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
    rows: res.rows ?? [],
  };
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || !req.url.startsWith('/sql')) {
    res.writeHead(404).end();
    return;
  }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    const client = await pool.connect();
    try {
      const payload = JSON.parse(body);
      let out;
      if (Array.isArray(payload.queries)) {
        await client.query('BEGIN');
        const results = [];
        for (const q of payload.queries) results.push(await run(client, q));
        await client.query('COMMIT');
        out = { results };
      } else {
        out = await run(client, payload);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(out));
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      res.writeHead(400, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ message: err.message, code: err.code, detail: err.detail, hint: err.hint }));
    } finally {
      client.release();
    }
  });
});

const pgUrl = new URL(process.env.PG_CONNECTION_STRING);
const wss = new WebSocketServer({ server, path: '/v2' });
wss.on('connection', (ws) => {
  const tcp = net.connect(Number(pgUrl.port || 5432), pgUrl.hostname);
  ws.on('message', (data) => tcp.write(data));
  tcp.on('data', (data) => ws.send(data));
  ws.on('close', () => tcp.end());
  tcp.on('close', () => ws.close());
  tcp.on('error', () => ws.close());
  ws.on('error', () => tcp.destroy());
});

server.listen(4444, () => console.log('Neon proxy locale in ascolto su :4444'));
