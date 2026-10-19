// Solo sviluppo locale: indirizza il driver Neon al database Docker in dev/.
// Si attiva unicamente con LOCAL_DB=1 e fuori da production, quindi su Vercel non fa nulla.
export async function register() {
  if (process.env.LOCAL_DB !== '1' || process.env.NODE_ENV === 'production') return;
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { neonConfig } = await import('@neondatabase/serverless');
  // LOCAL_DB_PROXY (es. localhost:4453) per lavorare in parallelo con un proprio proxy e un proprio database.
  const proxy = process.env.LOCAL_DB_PROXY || 'localhost:4444';
  neonConfig.fetchEndpoint = () => `http://${proxy}/sql`; // neon()
  neonConfig.wsProxy = () => `${proxy}/v2`; // Pool e Client
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
  console.log(`[LOCAL_DB] Database locale attivo: le query vanno a http://${proxy}`);
}
