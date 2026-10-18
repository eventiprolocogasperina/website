// Solo sviluppo locale: indirizza il driver Neon al database Docker in dev/.
// Si attiva unicamente con LOCAL_DB=1 e fuori da production, quindi su Vercel non fa nulla.
export async function register() {
  if (process.env.LOCAL_DB !== '1' || process.env.NODE_ENV === 'production') return;
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { neonConfig } = await import('@neondatabase/serverless');
  neonConfig.fetchEndpoint = () => 'http://localhost:4444/sql'; // neon()
  neonConfig.wsProxy = () => 'localhost:4444/v2'; // Pool e Client
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
  console.log('[LOCAL_DB] Database locale attivo: le query vanno a http://localhost:4444');
}
