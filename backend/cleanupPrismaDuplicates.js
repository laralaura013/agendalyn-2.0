// cleanupPrismaDuplicates.js
import fs from 'fs';
import path from 'path';

const dir = './src/controllers';

fs.readdirSync(dir).forEach((file) => {
  if (file.endsWith('.js')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    const original = content;

    // Remove declarações duplicadas do Prisma
    content = content.replace(/import\s+\{\s*PrismaClient\s*\}\s+from\s+['"]@prisma\/client['"];\s*/g, '');
    content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\(\);\s*/g, '');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Corrigido: ${file}`);
    } else {
      console.log(`🔁 Sem alterações: ${file}`);
    }
  }
});
