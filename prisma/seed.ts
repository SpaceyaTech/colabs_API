import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const user = await prisma.user.upsert({
    where: { githubId: '0000000' },
    update: {},
    create: {
      githubId: '0000000',
      username: 'spaceyatech',
      name: 'SpaceYaTech',
      email: 'hello@spaceyatech.com',
      bio: 'Africa\'s fastest growing open-source community',
      role: 'ADMIN',
    },
  });

  const project = await prisma.project.upsert({
    where: { githubRepoUrl: 'https://github.com/SpaceyaTech/CoLabs' },
    update: {},
    create: {
      githubRepoUrl: 'https://github.com/SpaceyaTech/CoLabs',
      name: 'SpaceyaTech/CoLabs',
      description: 'The Colabs platform — open-source collaboration meets freelance opportunity',
      language: 'TypeScript',
      topics: ['open-source', 'collaboration', 'africa'],
      ownerId: user.id,
    },
  });

  console.log(`✅ Seeded user: ${user.username}`);
  console.log(`✅ Seeded project: ${project.name}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
