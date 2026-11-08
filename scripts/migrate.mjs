import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local first.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const statements = fs
  .readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter(Boolean);

for (const statement of statements) await sql.query(statement);
console.log(`✓ Database ready (${statements.length} statements applied)`);
