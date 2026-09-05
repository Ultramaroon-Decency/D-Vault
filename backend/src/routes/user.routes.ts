import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

// GET /api/users/:address        — Any authenticated
router.get('/:address', authenticate, userController.getUser);

// GET /api/users/:address/did    — Any authenticated
router.get('/:address/did', authenticate, userController.getUserDID);

export default router;
