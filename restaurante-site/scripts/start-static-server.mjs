import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStaticServer } from './serve-static-with-security.mjs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

startStaticServer({
  profile: 'site',
  rootDir: path.resolve(currentDir, '../out'),
  spaFallback: true,
});
