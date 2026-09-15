import express from 'express';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from '../src/server/db/database.js';
import { seedDatabase } from '../src/server/db/seed.js';
import authRoutes from '../src/server/routes/auth.routes.js';
import contentRoutes from '../src/server/routes/content.routes.js';
import metadataRoutes from '../src/server/routes/metadata.routes.js';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

let initialized = false;
app.use(async (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
  if (!initialized) {
    try {
      initializeDatabase();
      await seedDatabase();
      initialized = true;
    } catch (err) {
      console.error('Database initialization error:', err);
    }
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api', metadataRoutes);

export default app;
