import { PrismaClient, RoleName } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed the 4 RBAC roles
  const roles: RoleName[] = ['ADMIN', 'MANAGER', 'AUDITOR', 'USER'];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`  ✅ Role seeded: ${name}`);
  }

  // Seed IndexerState singleton
  await prisma.indexerState.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', lastBlockNumber: BigInt(0) },
  });
  console.log('  ✅ IndexerState initialized');

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
