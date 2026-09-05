import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import roleRoutes from './routes/role.routes';
import assetRoutes from './routes/asset.routes';
import auditRoutes from './routes/audit.routes';

const app = express();

// =============================================
// Security Middleware
// =============================================
app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});
app.use(globalLimiter);

// =============================================
// Body Parsers
// =============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================
// Request Logger
// =============================================
app.use((req: Request, _res: express.Response, next: express.NextFunction) => {
  logger.debug(`→ ${req.method} ${req.path}`, {
    ip: req.ip,
    ua: req.get('user-agent')?.substring(0, 80),
  });
  next();
});

// =============================================
// Health Check
// =============================================
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// =============================================
// API Routes
// =============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/audit', auditRoutes);

// =============================================
// Error Handling (must be last)
// =============================================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
