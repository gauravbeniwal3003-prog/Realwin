import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let serverApp: any;

const distPath = path.resolve(process.cwd(), 'dist', 'server.cjs');

if (fs.existsSync(distPath)) {
  serverApp = require(distPath);
} else {
  try {
    serverApp = require('../server.ts');
  } catch (err) {
    console.error('Failed to load raw server module:', err);
  }
}

export default function handler(req: any, res: any) {
  let app: any = serverApp;

  // Recursively unwrap ESM/CommonJS default export wrapper if nested
  while (app && typeof app !== 'function' && app.default) {
    app = app.default;
  }

  if (typeof app !== 'function') {
    console.error('[SERVERLESS ERROR]: Express application failed to initialize', typeof app, app);
    return res.status(500).json({
      error: 'Express application server failed to initialize on serverless runtime',
      receivedType: typeof app,
      distExists: fs.existsSync(distPath)
    });
  }

  return app(req, res);
}
