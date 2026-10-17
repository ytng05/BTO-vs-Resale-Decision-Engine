// Loads environment variables from the repo-root .env (if present).
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });

// Fallback so `npm run dev` works without a .env. checkSecrets() refuses it in production.
const DEV_JWT_SECRET = 'dev-only-secret';
const MIN_JWT_SECRET_LENGTH = 32;

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || DEV_JWT_SECRET,
  datagovApiKey: process.env.DATAGOV_API_KEY || '',
  datagovBaseUrl: process.env.DATAGOV_BASE_URL || '',
  onemapEmail: process.env.ONEMAP_EMAIL || '',
  onemapPassword: process.env.ONEMAP_PASSWORD || '',
};

/**
 * Called once at startup. In production a missing, default or short JWT_SECRET stops the server,
 * because anyone who knows the secret can forge a login token. In development it only warns.
 * @param {{ nodeEnv: string, jwtSecret: string }} [config]
 */
export function checkSecrets({ nodeEnv, jwtSecret } = env) {
  const problem =
    jwtSecret === DEV_JWT_SECRET ? 'JWT_SECRET is not set'
      : jwtSecret.length < MIN_JWT_SECRET_LENGTH ? `JWT_SECRET is shorter than ${MIN_JWT_SECRET_LENGTH} characters`
        : null;
  if (!problem) return;
  if (nodeEnv === 'production') {
    throw new Error(`${problem}. Set a long random value before starting in production.`);
  }
  console.warn(`[env] ${problem}: using it for development only. Never deploy like this.`);
}
