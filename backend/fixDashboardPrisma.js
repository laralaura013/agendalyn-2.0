// fixDashboardPrisma.js
import fs from 'fs';
import path from 'path';

const filePath = './src/controllers/dashboardController.js';

if (!fs.existsSync(filePath)) {
  console.error('❌ Arquivo dashboardController.js não encontrado.');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf-8');
const original = content;

// Remove as duplicações de prisma
content = content.replace(/import\s+\{\s*PrismaClient\s*\}\s+from\s+['"]@prisma\/client['"];\s*/g, '');
content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\(\);\s*/g, '');

if (content !== original) {
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('✅ Duplicação de Prisma removida de dashboardController.js');
} else {
  console.log('🔁 Nada foi alterado. O arquivo já estava limpo.');
}
