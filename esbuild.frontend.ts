import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const htmlPath = path.join(process.cwd(), 'src/index.html');
const publicHtmlPath = path.join(publicDir, 'index.html');
fs.copyFileSync(htmlPath, publicHtmlPath);

esbuild.build({
  entryPoints: ['./src/index.tsx'],
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
    'process.env.LLM_API_KEY': JSON.stringify(process.env.LLM_API_KEY || ''),
    'process.env.ETH_RPC_URL': JSON.stringify(process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/cRrLtE5RwGjA6xFJu4piL'),
    'process.env': '{}',
    global: 'window',
  },
});