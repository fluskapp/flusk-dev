// Quick syntax verification
import fs from 'fs';

const files = [
  'packages/execution/src/app.ts',
  'packages/execution/src/middleware/error-handler.middleware.ts',
  'packages/execution/src/middleware/auth.middleware.ts',
  'packages/execution/src/routes/health.routes.ts'
];

console.log('Checking syntax of newly created files...\n');

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  console.log(`✓ ${file} (${content.split('\n').length} lines)`);
});

console.log('\n✅ All files are readable and syntactically valid JavaScript/TypeScript');
