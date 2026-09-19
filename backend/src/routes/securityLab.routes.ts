import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/rbac.middleware';
import { env } from '../config/env';

// Lazy prisma load to avoid testing issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const getDb = () => require('../db/prisma').prisma;

const router = Router();

// Early middleware: 404 if in production
router.use((req: Request, res: Response, next: NextFunction) => {
  if (env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
});

// GET /api/security-lab/health
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OPERATIONAL', timestamp: new Date().toISOString() });
});

// POST /api/security-lab/log-attempt
router.post('/log-attempt', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attackType, outcome, detail } = req.body;
    const actorAddress = req.user!.walletAddress;
    const eventIdentity = `security_${uuidv4()}`;

    await getDb().auditEvent.create({
      data: {
        eventType: 'SECURITY_ALERT',
        actorAddress: actorAddress.toLowerCase(),
        dataJson: { attackType, outcome, detail },
        eventIdentity,
        timestamp: new Date(),
      },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
