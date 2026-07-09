require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.POSTGRES_URL);
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS discounts (
        id            VARCHAR(255) PRIMARY KEY,
        code          VARCHAR(255) NOT NULL UNIQUE,
        type          VARCHAR(50)  NOT NULL,
        value         DECIMAL(10,2) NOT NULL,
        max_uses      INTEGER      DEFAULT 0,
        current_uses  INTEGER      DEFAULT 0,
        expiry_date   TIMESTAMPTZ,
        active        BOOLEAN      DEFAULT TRUE,
        created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
        applies_to    VARCHAR(50)  DEFAULT 'ALL'
      );
    `;
    console.log('table created or exists');
    await sql`ALTER TABLE discounts ADD COLUMN IF NOT EXISTS applies_to VARCHAR(50) DEFAULT 'ALL';`;
    console.log('column added');
  } catch(e) {
    console.error(e);
  }
}
run();
