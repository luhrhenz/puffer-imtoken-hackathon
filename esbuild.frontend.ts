import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

// Ensure public directory exists
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy index.html to public
const htmlPath = path.join(process.cwd(), 'src/index.html');
const publicHtmlPath = path.join(publicDir, 'index.html');
fs.copyFileSync(htmlPath, publicHtmlPath);

esbuild.build({
  entryPoints: ['./src/frontend/index.tsx'],
  bundle: true,
  outfile: 'public/bundle.js',
  platform: 'browser',
  target: 'es2020',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.css': 'css',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    global: 'window',
  },
  globalName: 'PufferApp',
});