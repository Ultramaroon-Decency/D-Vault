import { Request, Response, NextFunction } from 'express';
import * as assetService from '../services/asset.service';
import { Errors } from '../middleware/error.middleware';
import { validate } from '../middleware/validation.middleware';

// =============================================
// POST /api/assets/metadata
// MANAGER role required (enforced in route)
// =============================================
export const prepareMetadata = async (req: Request, res: Response, next: NextFunction) => {
  try {
    validate(req);

    const { name, description, assetType, ownerDID } = req.body;

    // Handle optional file upload (multer populates req.file)
    const file = (req as any).file as Express.Multer.File | undefined;

    const result = await assetService.prepareMetadata(
      { name, description, assetType, ownerDID },
      file?.buffer,
      file?.originalname,
      file?.mimetype,
    );

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// =============================================
// GET /api/assets
// =============================================
export const listAssets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const ownerAddress = req.query.ownerAddress as string | undefined;

    const { assets, total } = await assetService.listAssets(page, limit, ownerAddress);

    res.status(200).json({
      success: true,
      data: assets,
      meta: { page, limit, total },
    });
  } catch (err) {
    next(err);
  }
};

// =============================================
// GET /api/assets/:tokenId
// =============================================
export const getAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokenId } = req.params;
    if (!tokenId) throw Errors.badRequest('tokenId is required');

    const asset = await assetService.getAssetByTokenId(tokenId);
    res.status(200).json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
};

// =============================================
// GET /api/assets/:tokenId/history
// =============================================
export const getAssetHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokenId } = req.params;
    if (!tokenId) throw Errors.badRequest('tokenId is required');

    const history = await assetService.getAssetHistory(tokenId);
    res.status(200).json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};
