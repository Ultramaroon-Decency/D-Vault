import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAuditor } from '../middleware/rbac.middleware';
import { validatePagination } from '../middleware/validation.middleware';
import * as auditController from '../controllers/audit.controller';

const router = Router();

// GET /api/audit — AUDITOR or ADMIN
router.get('/', authenticate, requireAuditor, validatePagination, auditController.getAuditLog);

export default router;
