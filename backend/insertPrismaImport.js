// insertPrismaImport.js
import fs from 'fs';
import path from 'path';

const dir = './src/controllers';
const importLine = `import prisma from '../prismaClient.js';`;

fs.readdirSync(dir).forEach((file) => {
  if (file.endsWith('.js')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    if (!content.includes('import prisma')) {
      const lines = content.split('\n');
      // Encontra a primeira linha que não seja comentário vazio
      const insertIndex = lines.findIndex((line) => !line.trim().startsWith('//') && line.trim() !== '');
      lines.splice(insertIndex, 0, importLine);
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      console.log(`✅ Adicionado em: ${file}`);
    } else {
      console.log(`🔁 Já existia em: ${file}`);
    }
  }
});
