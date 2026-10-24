/**
 * Crea il primo titolare (owner) dell'admin, oppure dà il ruolo di titolare a un utente esistente.
 *
 *   npm run create-owner -- --email nome@esempio.it --name "Nome Cognome"
 *
 * La password si scrive quando la chiede (non resta nella cronologia della shell).
 * Usa POSTGRES_URL da .env.local: controlla di puntare al database giusto prima di confermare.
 */
import { config } from 'dotenv';
import { createInterface } from 'node:readline';
import { Client } from 'pg';
import { hashPassword, passwordProblem } from '../src/server/auth/password';

config({ path: '.env.local' });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    // Nasconde i caratteri digitati.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes(question)) process.stdout.write(s);
    };
  }
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    }),
  );
}

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL mancante in .env.local');
  const host = new URL(url).host;

  const email = (arg('email') ?? (await ask('Email: '))).toLowerCase();
  const name = arg('name') ?? (await ask('Nome e cognome: '));
  if (!email.includes('@') || name.length < 2) throw new Error('Email o nome non validi.');

  const password = await ask('Password (almeno 10 caratteri): ', true);
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  if ((await ask('Ripeti la password: ', true)) !== password) throw new Error('Le due password non coincidono.');

  const confirm = await ask(`Creo il titolare ${email} sul database ${host}. Scrivi "si" per confermare: `);
  if (confirm.toLowerCase() !== 'si') {
    console.log('Annullato.');
    return;
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    let id: string;
    if (existing.rows[0]) {
      id = existing.rows[0].id;
      await client.query('UPDATE users SET name = $2, password_hash = $3, active = true, updated_at = now() WHERE id = $1', [id, name, hashPassword(password)]);
    } else {
      const created = await client.query<{ id: string }>('INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id', [email, name, hashPassword(password)]);
      id = created.rows[0].id;
    }
    await client.query(
      `INSERT INTO role_assignments (user_id, role, edition_slug) VALUES ($1, 'owner', NULL)
       ON CONFLICT (user_id, role, coalesce(edition_slug, '')) DO NOTHING`,
      [id],
    );
    await client.query(
      `INSERT INTO audit_log (actor_label, action, entity_type, entity_id, after) VALUES ('riga di comando', 'user.created', 'user', $1, $2)`,
      [id, JSON.stringify({ name, email, roles: [{ role: 'owner', edition: null }] })],
    );
    await client.query('COMMIT');
    console.log(`Fatto: ${name} (${email}) è titolare. Ora puoi entrare da /login.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
