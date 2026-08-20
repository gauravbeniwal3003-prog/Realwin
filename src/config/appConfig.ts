/**
 * ══════════════════════════════════════════════════════════════════════════
 *               🌐 REALWIN WEBSITE ACCESS SLUG CONFIGURATION
 * ══════════════════════════════════════════════════════════════════════════
 * 
 * ✏️ CHANGE THE SECRET SLUG BELOW TO ROTATE / EXPIRE YOUR WEBSITE LINK:
 * e.g. 'abc'    -> https://realwin.vercel.app/abc/game
 * e.g. 'win88'  -> https://realwin.vercel.app/win88/game
 * e.g. 'vip99'  -> https://realwin.vercel.app/vip99/game
 * 
 * • All internal links, pages, buttons, referral URLs, wallet, and admin
 *   will automatically open under this folder prefix!
 * • Any attempt to visit the old slug or base root will show a realistic
 *   "This website does not exist at all" 404 screen.
 */
export const APP_SECRET_SLUG = 'abc'; // <-- CHANGE THIS SINGLE VALUE TO ROTATE YOUR LINK!

/**
 * Helper to build internal application routes under the active slug.
 * Example: getAppPath('/game') -> '/abc/game'
 * Example: getAppPath('/wallet?tab=deposit') -> '/abc/wallet?tab=deposit'
 */
export function getAppPath(path: string = ''): string {
  const cleanSlug = APP_SECRET_SLUG.replace(/^\/+|\/+$/g, '').trim();
  if (!cleanSlug) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  const cleanSubPath = path.startsWith('/') ? path : `/${path}`;
  return `/${cleanSlug}${cleanSubPath}`;
}

/**
 * Helper to build absolute full URLs for sharing (e.g. referral links).
 * Example: buildAppUrl('/register?ref=123456') -> 'https://realwin.vercel.app/abc/register?ref=123456'
 */
export function buildAppUrl(path: string = ''): string {
  const appPath = getAppPath(path);
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${appPath}`;
  }
  return `https://realwin.vercel.app${appPath}`;
}
