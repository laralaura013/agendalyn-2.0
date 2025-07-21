import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('A iniciar o processo de seeding...');

  // Cria o Plano PRO se ele não existir
  const proPlan = await prisma.plan.upsert({
    where: { name: 'PRO' },
    update: {},
    create: {
      name: 'PRO',
      price: 99.90,
      stripePriceId: 'price_1PgZ5yRxz3dGgEnTz4f3f3f3', // ID de exemplo, pode ser qualquer um
      features: {
        users: 10,
        clients: 'unlimited',
        schedule: true,
      },
    },
  });

  console.log(`Plano '${proPlan.name}' criado/atualizado com sucesso.`);
  console.log('Seeding concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });