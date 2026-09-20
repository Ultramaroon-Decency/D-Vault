import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { requireManager } from '../middleware/rbac.middleware';
import { validateAssetMetadata, validatePagination, checkValidation } from '../middleware/validation.middleware';
import * as assetController from '../controllers/asset.controller';
import { UPLOADS_DIR, buildSafeFilename } from '../services/storage.service';

const router = Router();

// =============================================
// Multer: disk storage, 50 MB limit
// Allowed: images + common document types
// =============================================
const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',                                                      // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',                                                // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  'text/plain',                                                               // .txt
  'text/csv',                                                                 // .csv
]);

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safe = buildSafeFilename(file.originalname);
    cb(null, safe);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed`));
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
