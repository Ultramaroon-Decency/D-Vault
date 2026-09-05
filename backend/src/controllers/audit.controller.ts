import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { Errors } from '../middleware/error.middleware';

// =============================================
// GET /api/audit — AUDITOR or ADMIN
// =============================================
export const getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const eventType = req.query.eventType as string | undefined;
    const actorAddress = req.query.actorAddress as string | undefined;

    const where = {
      ...(eventType && { eventType }),
      ...(actorAddress && { actorAddress: actorAddress.toLowerCase() }),
    };

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { blockNumber: 'desc' },
        select: {
          id: true,
          eventType: true,
          actorAddress: true,
          tokenId: true,
          txHash: true,
          blockNumber: true,
          timestamp: true,
          dataJson: true,
          createdAt: true,
        },
      }),
      prisma.auditEvent.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: events,
      meta: { page, limit, total },
    });
  } catch (err) {
    next(err);
  }
};
