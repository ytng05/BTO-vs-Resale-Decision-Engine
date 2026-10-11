import { env, checkSecrets } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';

async function main() {
  checkSecrets(); // stops here in production if JWT_SECRET is missing or weak
  await connectDb();
  createApp().listen(env.port, () => {
    console.log(`Server running at http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
