import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { requireManager } from '../middleware/rbac.middleware';
import { validateAssetMetadata, validatePagination, checkValidation } from '../middleware/validation.middleware';
import { validateUploadedFile } from '../middleware/fileValidation.middleware';
import { Errors } from '../middleware/error.middleware';
import * as assetController from '../controllers/asset.controller';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const router = Router();

const assetUploadLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.ASSET_UPLOAD_RATE_LIMIT_MAX,
  keyGenerator: (req) => (req.headers['x-test-ip'] as string) || req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many asset uploads. Try again later.' },
  },
});

// Multer: memory storage, 10MB limit, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Errors.badRequest('Only image/PDF files are allowed'));
    }
  },
});

// POST /api/assets/metadata — MANAGER or ADMIN
router.post(
  '/metadata',
  authenticate,
  requireManager,
  assetUploadLimiter,
  upload.single('file'),
  validateUploadedFile,
  validateAssetMetadata,
  checkValidation,
  assetController.prepareMetadata,
);

// GET /api/assets — Any authenticated user
router.get('/', authenticate, validatePagination, assetController.listAssets);

// GET /api/assets/:tokenId — Any authenticated user
router.get('/:tokenId', authenticate, assetController.getAsset);

// GET /api/assets/:tokenId/history — Any authenticated user
router.get('/:tokenId/history', authenticate, assetController.getAssetHistory);

export default router;
