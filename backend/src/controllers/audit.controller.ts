import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { Errors } from '../middleware/error.middleware';

// SECURITY: Allowlist for eventType filter (VULN-20)
// Prevents blind probing of internal event type strings
const VALID_EVENT_TYPES = ['DIDCreated', 'RoleAssigned', 'NFTMinted', 'Transfer', 'PermissionUpdated', 'AuthFailure', 'AuthorizationFailure'];

// =============================================
// GET /api/audit — AUDITOR or ADMIN
// =============================================
export const getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const eventType = req.query.eventType as string | undefined;
    const actorAddress = req.query.actorAddress as string | undefined;

    // SECURITY: Validate eventType against allowlist (VULN-20)
    if (eventType && !VALID_EVENT_TYPES.includes(eventType)) {
      throw Errors.badRequest(`Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
    }

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

    const serializedEvents = events.map((event) => ({
      ...event,
      blockNumber: event.blockNumber != null ? event.blockNumber.toString() : null,
    }));

    res.status(200).json({
      success: true,
      data: serializedEvents,
      meta: { page, limit, total },
    });
  } catch (err) {
    next(err);
  }
};
