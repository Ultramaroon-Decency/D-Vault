import { Request, Response, NextFunction } from 'express';
import * as roleService from '../services/role.service';
import { Errors } from '../middleware/error.middleware';
import { validate } from '../middleware/validation.middleware';
import { RoleName } from '@prisma/client';

export const assignRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    validate(req);
    const { walletAddress, role } = req.body;
    if (!req.user) throw Errors.unauthorized();

    const result = await roleService.assignRole(walletAddress, role as RoleName, req.user.walletAddress);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;
    if (!address) throw Errors.badRequest('address is required');
    const result = await roleService.getRoleByAddress(address);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
