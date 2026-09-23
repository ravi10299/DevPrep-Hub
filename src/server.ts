import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import cookieParser from 'cookie-parser';
import { join } from 'node:path';

import { initializeDatabase } from './server/db/database.js';
import { seedDatabase } from './server/db/seed.js';
import authRoutes from './server/routes/auth.routes.js';
import contentRoutes from './server/routes/content.routes.js';
import metadataRoutes from './server/routes/metadata.routes.js';

// Initialize and seed database on first load (works in both dev and prod)
await initializeDatabase();
await seedDatabase();

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api', metadataRoutes);

// Serve static files from /browser
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// Handle all other requests by rendering the Angular application.
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

// Start the server if this module is the main entry point, or it is ran via PM2.
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
export const reqHandler = createNodeRequestHandler(app);
