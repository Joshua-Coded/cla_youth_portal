import { neon, type NeonQueryFunction, type NeonQueryFunctionInTransaction, type NeonQueryInTransaction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | undefined;

function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.');
  }
  return (client ??= neon(process.env.DATABASE_URL));
}

/** Tagged-template query against Neon, e.g. sql`SELECT * FROM members WHERE id = ${id}` */
export const sql = (strings: TemplateStringsArray, ...values: unknown[]) => db()(strings, ...values);

/** Run several queries atomically: transaction((sql) => [sql`...`, sql`...`]) */
export const transaction = (build: (q: NeonQueryFunctionInTransaction<false, false>) => NeonQueryInTransaction[]) =>
  db().transaction(build);

export const FOLLOW_UP_AFTER = Math.max(1, Number(process.env.FOLLOW_UP_AFTER) || 3);

/** Today's date (YYYY-MM-DD) in the church's timezone. */
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE || 'Africa/Lagos' }).format(new Date());
}
