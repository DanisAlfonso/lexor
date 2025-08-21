import { defineConfig } from 'drizzle-kit';
import { config } from './src/utils/config';

export default defineConfig({
  schema: './src/models/index.ts',
  out: './database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    ssl: config.database.ssl,
  },
  verbose: true,
  strict: true,
});