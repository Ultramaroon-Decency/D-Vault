import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { requireManager } from '../middleware/rbac.middleware';
import { validateAssetMetadata, validatePagination, checkValidation } from '../middleware/validation.middleware';
import * as assetController from '../controllers/asset.controller';

const router = Router();

// Multer: memory storage, 10MB limit, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image/PDF files are allowed'));
    }
  },
});

// POST /api/assets/metadata — MANAGER or ADMIN
router.post(
  '/metadata',
  authenticate,
  requireManager,
  upload.single('file'),
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
