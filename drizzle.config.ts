import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

const databaseUrl = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env?.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set — check your .env file.');
}

export default defineConfig({
  schema: './src/main/db/schema.ts',
  out: './src/main/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});