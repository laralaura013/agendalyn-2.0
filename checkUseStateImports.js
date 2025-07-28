// checkUseStateImports.js
import fs from 'fs';
import path from 'path';

const baseDir = './src';

const checkFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('useState') && !content.includes('useState' && 'import')) {
    console.log(`⚠️  Verifique: ${filePath} — contém useState mas não tem import.`);
  } else if (content.includes('useState') && !content.match(/import\s+.*\{[^}]*useState[^}]*\}/)) {
    console.log(`⚠️  Falta o import de useState em: ${filePath}`);
  }
};

const walkDir = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.jsx')) {
      checkFile(fullPath);
    }
  }
};

console.log('🔍 Verificando arquivos que usam useState...\n');
walkDir(baseDir);
console.log('\n✅ Verificação concluída.');
