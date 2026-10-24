require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);
async function run() {
  const configJson = JSON.stringify({ tagline: "Test tagline 123", extraSections: [] });
  const result = await sql`UPDATE events SET config = ${configJson}::jsonb WHERE id = '9' RETURNING id, config`;
  console.log(result);
}
run().catch(console.error);
