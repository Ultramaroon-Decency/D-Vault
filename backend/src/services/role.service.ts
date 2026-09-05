import { prisma } from '../db/prisma';
import { Errors } from '../middleware/error.middleware';
import { RoleName } from '@prisma/client';

const ROLE_PRIORITY: RoleName[] = ['ADMIN', 'MANAGER', 'AUDITOR', 'USER'];

export const assignRole = async (
  walletAddress: string,
  roleName: RoleName,
  assignedBy: string,
) => {
  const address = walletAddress.toLowerCase();

  // Upsert user
  const user = await prisma.user.upsert({
    where: { walletAddress: address },
    update: {},
    create: { walletAddress: address },
  });

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw Errors.notFound(`Role ${roleName} not found`);

  // Remove existing roles and assign new one (single-role model for simplicity)
  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: role.id,
      assignedBy: assignedBy.toLowerCase(),
    },
  });

  return { walletAddress: address, role: roleName, assignedBy };
};

export const getRoleByAddress = async (walletAddress: string) => {
  const address = walletAddress.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { walletAddress: address },
    include: { userRoles: { include: { role: true } } },
  });

  const roles = user?.userRoles.map((ur) => ur.role.name as RoleName) ?? [];
  const primaryRole = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? 'USER';

  return { walletAddress: address, roles, primaryRole };
};
