import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { Errors } from '../middleware/error.middleware';

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;
    if (!address) throw Errors.badRequest('address is required');
    const user = await userService.getUserByAddress(address);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const getUserDID = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;
    if (!address) throw Errors.badRequest('address is required');
    const did = await userService.getUserDIDInfo(address);
    res.status(200).json({ success: true, data: did });
  } catch (err) {
    next(err);
  }
};
