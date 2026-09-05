import { prisma } from '../db/prisma';
import { getUserDID } from './blockchain.service';
import { Errors } from '../middleware/error.middleware';
import { RoleName } from '@prisma/client';

const ROLE_PRIORITY: RoleName[] = ['ADMIN', 'MANAGER', 'AUDITOR', 'USER'];

export const getUserByAddress = async (walletAddress: string) => {
  const address = walletAddress.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { walletAddress: address },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user) throw Errors.notFound(`User ${address} not found`);

  const roles = user.userRoles.map((ur) => ur.role.name as RoleName);
  const primaryRole = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? 'USER';

  return {
    id: user.id,
    walletAddress: user.walletAddress,
    did: user.did,
    displayName: user.displayName,
    roles,
    primaryRole,
    createdAt: user.createdAt,
  };
};

export const getUserDIDInfo = async (walletAddress: string) => {
  const address = walletAddress.toLowerCase();

  // Try DB first, then fallback to contract read
  const user = await prisma.user.findUnique({ where: { walletAddress: address } });
  let did = user?.did ?? null;

  if (!did) {
    did = await getUserDID(address);
    // Cache in DB if resolved from chain
    if (did && user) {
      await prisma.user.update({ where: { walletAddress: address }, data: { did } });
    }
  }

  return { walletAddress: address, did };
};
