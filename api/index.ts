import serverApp from '../server.ts';

export default function handler(req: any, res: any) {
  let app: any = serverApp;
  
  // Recursively unwrap ESM/CommonJS default wrapper objects if present
  while (app && typeof app !== 'function' && app.default) {
    app = app.default;
  }

  if (typeof app !== 'function') {
    console.error('[SERVERLESS ERROR]: Express application target is not callable', typeof app, app);
    return res.status(500).json({
      error: 'Express application server failed to load properly',
      receivedType: typeof app,
      keys: app && typeof app === 'object' ? Object.keys(app) : []
    });
  }

  return app(req, res);
}
