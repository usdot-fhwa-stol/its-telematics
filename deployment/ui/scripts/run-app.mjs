// Starts the app. By default it runs the Vite dev server and points Electron
// at it; with --built it opens the files from `vite build` instead.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const electronPath = require('electron');
const built = process.argv.includes('--built');

const env = { ...process.env };
// Set by VS Code; it would make Electron behave as plain Node.
delete env.ELECTRON_RUN_AS_NODE;

let server = null;
if (!built) {
  server = await createServer({ configFile: new URL('../vite.config.mjs', import.meta.url).pathname });
  await server.listen();
  env.VITE_DEV_SERVER_URL = server.resolvedUrls.local[0];
}

const app = spawn(electronPath, ['.'], { stdio: 'inherit', env });
app.on('close', async (code) => {
  if (server) await server.close();
  process.exit(code ?? 0);
});
