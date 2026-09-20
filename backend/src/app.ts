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
import securityRoutes from './routes/security.routes';

const app = express();

// =============================================
// Security Middleware
// =============================================

// SECURITY: Helmet with strict Content Security Policy (VULN-21)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com', 'https://lh4.googleusercontent.com', 'https://lh5.googleusercontent.com', 'https://gateway.pinata.cloud'],
        connectSrc: ["'self'", 'https://sepolia.infura.io', 'https://rpc.sepolia.org', 'https://api.pinata.cloud'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow external resources for Web3 wallets
  }),
);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// SECURITY: Global rate limiter — shared Redis store when available (VULN-16)
// Falls back to in-memory if REDIS_URL not configured
const buildRateLimiter = (max: number) => {
  const options: Parameters<typeof rateLimit>[0] = {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  };

  // Attach Redis store only if available
  if (env.REDIS_URL) {
    try {
      // Dynamic import to avoid hard dep when Redis not installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createClient } = require('redis');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { RedisStore } = require('rate-limit-redis');
      const client = createClient({ url: env.REDIS_URL });
      client.connect().catch(() => logger.warn('Redis connection failed — using in-memory rate limiter'));
      options.store = new RedisStore({ sendCommand: (...args: string[]) => client.sendCommand(args) });
      logger.info('Rate limiter: Redis store configured');
    } catch {
      logger.warn('rate-limit-redis not installed — using in-memory rate limiter (single instance only)');
    }
  }

  return rateLimit(options);
};

app.use(buildRateLimiter(env.RATE_LIMIT_MAX));

// =============================================
// Body Parsers — SECURITY: Small limits prevent DoS via large payloads (VULN-15)
// =============================================
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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
// Health Check — SECURITY: Strip env/version in production (VULN-13)
// =============================================
app.get('/health', (_req: Request, res: Response) => {
  const body: Record<string, unknown> = { success: true, status: 'ok' };
  if (env.NODE_ENV !== 'production') {
    body.environment = env.NODE_ENV;
    body.version = '1.0.0';
    body.blockchainMock = env.BLOCKCHAIN_MOCK;
    body.ipfsMock = env.IPFS_MOCK;
  }
  res.json(body);
});

// =============================================
// API Routes
// =============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/security', securityRoutes);

// =============================================
// Error Handling (must be last)
// =============================================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
