// Loads environment variables from the repo-root .env (if present).
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });

export const env = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
  datagovApiKey: process.env.DATAGOV_API_KEY || '',
  datagovBaseUrl: process.env.DATAGOV_BASE_URL || '',
  onemapEmail: process.env.ONEMAP_EMAIL || '',
  onemapPassword: process.env.ONEMAP_PASSWORD || '',
};
