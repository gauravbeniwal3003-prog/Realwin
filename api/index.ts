import app from '../server';

export default async function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL SERVERLESS ERROR]:', err);
    return res.status(500).json({
      error: `Serverless Function Error: ${err?.message || 'Internal Server Exception'}. Please check your Vercel Environment Variables (SUPABASE_URL, SUPABASE_ANON_KEY).`,
    });
  }
}
