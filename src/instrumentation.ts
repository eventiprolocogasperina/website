// Solo sviluppo locale: indirizza il driver Neon al database Docker in dev/.
// Si attiva unicamente con LOCAL_DB=1 e fuori da production, quindi su Vercel non fa nulla.
export async function register() {
  if (process.env.LOCAL_DB !== '1' || process.env.NODE_ENV === 'production') return;
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { neonConfig } = await import('@neondatabase/serverless');
  // LOCAL_DB_PORT: un secondo proxy per i test end-to-end (e2e/), su un database separato.
  const port = process.env.LOCAL_DB_PORT || '4444';
  neonConfig.fetchEndpoint = () => `http://localhost:${port}/sql`; // neon()
  neonConfig.wsProxy = () => `localhost:${port}/v2`; // Pool e Client
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
  console.log(`[LOCAL_DB] Database locale attivo: le query vanno a http://localhost:${port}`);
}
