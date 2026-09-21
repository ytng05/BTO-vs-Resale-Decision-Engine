import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import scenarioRoutes from './routes/scenarios.js';
import analysisRoutes from './routes/analysis.js';
import dataRoutes from './routes/data.js';
import { errorHandler } from './middleware/errorHandler.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/scenarios', scenarioRoutes);
  app.use('/api', analysisRoutes);
  app.use('/api/data', dataRoutes);

  // Unknown /api routes return JSON, not the SPA page.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown API route' } });
  });

  // Serve the built Vue app from the root so http://localhost:[port] loads the index page (module requirement).
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
