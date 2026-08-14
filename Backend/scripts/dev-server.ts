/**
 * No-Docker dev launcher. Starts an embedded PostgreSQL (real Postgres binary, no Docker),
 * pushes the Prisma schema, seeds on first run, switches Redis to the in-process shim, then
 * boots the Nest API. Run with `npm run dev:local` (or the root `npm run dev`).
 *
 * Data persists in Backend/.devdata/pg (gitignored). Delete that folder to reset.
 */
import EmbeddedPostgres from 'embedded-postgres';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';

const DATA_DIR = path.resolve(__dirname, '../.devdata/pg');
const PORT = 5433;
const DB = 'aurum';
const DATABASE_URL = `postgresql://postgres:postgres@localhost:${PORT}/${DB}?schema=public`;

async function main(): Promise<void> {
  const fresh = !existsSync(path.join(DATA_DIR, 'postgresql.conf'));
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: true,
  });

  if (fresh) {
    console.log('› Initialising embedded PostgreSQL (first run)…');
    await pg.initialise();
  }
  console.log('› Starting embedded PostgreSQL on port', PORT);
  await pg.start();
  if (fresh) {
    try {
      await pg.createDatabase(DB);
    } catch {
      /* already exists */
    }
  }

  // Env for Prisma + Nest: point at the embedded DB and use the in-process Redis shim.
  const env = { ...process.env, DATABASE_URL, REDIS_DRIVER: 'memory', PORT: process.env.PORT ?? '4000' };
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.REDIS_DRIVER = 'memory';
  process.env.PORT = env.PORT;

  console.log('› Syncing schema (prisma db push)…');
  execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit', env });

  if (fresh) {
    console.log('› Seeding demo data…');
    execSync('npx ts-node --transpile-only prisma/seed.ts', { stdio: 'inherit', env });
  }

  const shutdown = async (): Promise<void> => {
    console.log('\n› Stopping embedded PostgreSQL…');
    try {
      await pg.stop();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  console.log('› Booting Aurum API…\n');
  await import('../src/main');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
