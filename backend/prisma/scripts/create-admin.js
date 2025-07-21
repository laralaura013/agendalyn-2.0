import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('A iniciar a criação do administrador...');

  // 1. Pega nos argumentos da linha de comando
  const args = process.argv.slice(2);
  const [companyName, adminName, adminEmail, adminPassword] = args;

  if (!companyName || !adminName || !adminEmail || !adminPassword) {
    console.error('❌ Erro: Todos os 4 argumentos são obrigatórios!');
    console.error('Uso: npm run db:create-admin "Nome da Empresa" "Nome do Admin" "email@admin.com" "senha"');
    process.exit(1);
  }

  // 2. Verifica se o utilizador já existe
  const userExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (userExists) {
    console.error(`❌ Erro: O email "${adminEmail}" já está em uso.`);
    process.exit(1);
  }

  // 3. Hash da senha
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);
  console.log('Senha encriptada com sucesso.');

  // 4. Cria a Empresa
  const newCompany = await prisma.company.create({
    data: { name: companyName },
  });
  console.log(`Empresa "${newCompany.name}" criada com o ID: ${newCompany.id}`);

  // 5. Encontra o Plano PRO (deve ter sido criado pelo `db seed`)
  const proPlan = await prisma.plan.findUnique({ where: { name: 'PRO' } });
  if (!proPlan) {
    console.error("❌ Erro CRÍTICO: O plano 'PRO' não foi encontrado. Execute 'npx prisma db seed' primeiro.");
    process.exit(1);
  }

  // 6. Cria a Assinatura com 14 dias de teste
  await prisma.subscription.create({
    data: {
      companyId: newCompany.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      currentPeriodEnd: addDays(new Date(), 14),
    },
  });
  console.log('Assinatura de teste de 14 dias criada com sucesso.');

  // 7. Cria o Utilizador Administrador
  const newUser = await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      companyId: newCompany.id,
      role: 'OWNER',
    },
  });
  console.log(`Utilizador "${newUser.name}" criado com sucesso.`);
  
  console.log('✅ Processo concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Ocorreu um erro durante a execução do script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });