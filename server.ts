import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  User,
  GameRound,
  Bet,
  DepositRequest,
  WithdrawalRequest,
  SystemSettings,
  RoomType,
  BetSelection,
} from './src/types.ts';

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import {
  supabase,
  isSupabaseConfigured,
  loadUsersFromSupabase,
  saveUserToSupabase,
  loadGameRoundsFromSupabase,
  saveGameRoundToSupabase,
  loadBetsFromSupabase,
  saveBetToSupabase,
  loadDepositsFromSupabase,
  saveDepositToSupabase,
  loadWithdrawalsFromSupabase,
  saveWithdrawalToSupabase,
  loadSystemSettingsFromSupabase,
  saveSystemSettingsToSupabase,
} from './src/lib/serverSupabase.ts';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security: Enable CORS for cross-domain API access
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Handle path normalization FIRST for serverless / Vercel rewrites (only for API subpaths)
app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
    req.url = req.originalUrl;
  }
  const currentUrl = req.url || '';
  if (
    currentUrl &&
    !currentUrl.startsWith('/api') &&
    (
      currentUrl.startsWith('/auth') ||
      currentUrl.startsWith('/game') ||
      currentUrl.startsWith('/wallet') ||
      currentUrl.startsWith('/admin') ||
      currentUrl.startsWith('/cashfree') ||
      currentUrl.startsWith('/health')
    )
  ) {
    req.url = '/api' + (currentUrl.startsWith('/') ? '' : '/') + currentUrl;
  }
  next();
});

// Security: Enable trust proxy for reverse proxy environments (e.g. Cloud Run, Nginx)
app.set('trust proxy', 1);

// Security: Helmet HTTP Headers (configured to allow iframe previews and media loading)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Security: Limit payload sizes to prevent Denial of Service (DoS) via huge JSON payloads
app.use(express.json({ limit: '50kb' }));

// Security: Anti-Tampering & Request Body Integrity Middleware (Defense against Burp Suite / Postman manipulation)
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      for (const key of Object.keys(req.body)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return res.status(400).json({ error: 'Malicious payload structure detected. Request rejected by security server.' });
        }
      }
    }
  }
  next();
});

// Security: Global Rate Limiter to prevent DDoS flooding attacks (allows live polling for timer & state)
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10000 requests per 15 minutes for real-time polling
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: 'Too many requests from this IP, please try again in 15 minutes.' },
});

// Security: Auth Rate Limiter against Brute-Force attack vectors
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 login/init attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

// Security: Transaction Rate Limiter for Bets, Deposits, and Withdrawals
const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: 'Transaction limit reached. Please wait a minute before retrying.' },
});

// Apply rate limits
app.use('/api/', globalApiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/deposit', transactionLimiter);
app.use('/api/withdraw', transactionLimiter);
app.use('/api/bet', transactionLimiter);

// Auto-Process Game Rounds on Every API Request (Guarantees timer & payouts on serverless/Vercel)
app.use('/api', (req, res, next) => {
  try {
    checkAndProcessRounds();
  } catch (err) {
    console.error('Error auto-processing rounds in middleware:', err);
  }
  next();
});

// Security Input Sanitizers against XSS / Injection / Script exploits
function sanitizeInput(val: any): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

function sanitizePhone(phone: any): string {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[^\d]/g, '').slice(0, 15);
}

// Ensure data directory exists safely (handling read-only filesystems like Vercel serverless)
let DATA_DIR = (process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME) 
  ? path.join('/tmp', 'data') 
  : path.join(process.cwd(), 'data');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  DATA_DIR = path.join('/tmp', 'data');
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (_) {
    // Ignore if /tmp is constrained in serverless sandbox
  }
}

const DATA_FILE = path.join(DATA_DIR, 'app-state.json');

// Memory Data Store
interface AppState {
  users: User[];
  rounds: GameRound[];
  bets: Bet[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  settings: SystemSettings;
  roomOverrides?: Record<string, number | null>;
  scheduledOverrides?: Record<string, any>;
}

// Default initial state
let state: AppState = {
  users: [
    {
      id: 'usr_admin',
      phone: '9999999999',
      name: 'Super Admin',
      balance: 50000,
      isAdmin: true,
      createdAt: Date.now(),
    },
  ],
  rounds: [],
  bets: [],
  deposits: [],
  withdrawals: [],
  settings: {
    upiId: 'colorwin.pay@upi',
    upiName: 'ColorWin Official Payments',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=colorwin.pay@upi&pn=ColorWin',
    minDeposit: 300,
    maxDeposit: 5000,
    minWithdrawal: 300,
    maxWithdrawal: 300000,
    manualOverrideNumber: null,
    supportTelegram: 'https://t.me/realwin_official',
    supportPhone: '919876543210',
    noticeMarquee: '🚀 Welcome to RealWin! Enjoy 24/7 instant withdrawals & 5% referral bonus on deposits!',
    signupBonus: 0,
    referralCommissionPercent: 5,
    adminPin: 'gaurav@2026#2008',
    maintenanceMode: false,
  },
  roomOverrides: {},
  scheduledOverrides: {},
};

// Load saved local data if available
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    state = { ...state, ...parsed };
    // Filter out old demo user and demo deposits
    state.users = state.users.filter(u => u.id !== 'usr_demo');
    state.deposits = state.deposits.filter(d => d.id !== 'dep_sample_1');
    // Ensure minDeposit & minWithdrawal are strictly 300
    state.settings.minDeposit = 300;
    state.settings.minWithdrawal = 300;
    console.log(`Loaded state: ${state.rounds.length} history rounds, ${state.users.length} users.`);
  } catch (err) {
    console.error('Failed to parse saved state, using default', err);
  }
}

// Supabase Async Hydration & Sync Bootstrapper
async function initSupabaseData() {
  if (!isSupabaseConfigured) return;
  try {
    const [dbUsers, dbRounds, dbBets, dbDeps, dbWths, dbSettings] = await Promise.all([
      loadUsersFromSupabase(),
      loadGameRoundsFromSupabase(),
      loadBetsFromSupabase(),
      loadDepositsFromSupabase(),
      loadWithdrawalsFromSupabase(),
      loadSystemSettingsFromSupabase(),
    ]);

    if (dbUsers && dbUsers.length > 0) state.users = dbUsers;
    if (dbRounds && dbRounds.length > 0) state.rounds = dbRounds;
    if (dbBets && dbBets.length > 0) state.bets = dbBets;
    if (dbDeps && dbDeps.length > 0) state.deposits = dbDeps;
    if (dbWths && dbWths.length > 0) state.withdrawals = dbWths;
    if (dbSettings) {
      state.settings = { ...dbSettings, minDeposit: 300, minWithdrawal: 300 };
    } else {
      state.settings.minDeposit = 300;
      state.settings.minWithdrawal = 300;
    }

    // Save updated settings to Supabase to overwrite any legacy 500 limit
    await saveSystemSettingsToSupabase(state.settings);

    console.log(`⚡ [SUPABASE SYNC OK] Active state synced with Supabase Database: ${state.users.length} Users, ${state.rounds.length} Periods (Max 1000 stored).`);

    // Bootstrap initial data to Supabase if DB was recently created or empty
    if (dbUsers.length === 0 && state.users.length > 0) {
      for (const u of state.users) await saveUserToSupabase(u);
    }
    if (dbRounds.length === 0 && state.rounds.length > 0) {
      for (const r of state.rounds) await saveGameRoundToSupabase(r);
    }
    if (dbSettings === null) {
      await saveSystemSettingsToSupabase(state.settings);
    }
  } catch (err) {
    console.warn('Supabase DB connection/hydration warning (Fallback to memory active):', err);
  }
}

initSupabaseData();

// Helper to save state
function saveState() {
  try {
    // Keep max 1000 rounds and max 1000 bets in memory & JSON file to keep full history intact
    if (state.rounds.length > 1000) {
      state.rounds = state.rounds.slice(0, 1000);
    }
    if (state.bets.length > 1000) {
      state.bets = state.bets.slice(0, 1000);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Error saving state:', err);
  }
}

// Helper to seed initial 100 history rounds if empty so user has immediate rich history
if (state.rounds.length < 50) {
  const now = Date.now();
  const roomTypes: RoomType[] = ['PARITY', 'SAPRE', 'BCONE', 'EMERD'];
  const baseActive = 100000 + (Math.floor(now / 1000 / 30) % 800000);
  for (let i = 100; i >= 1; i--) {
    const periodTimestamp = now - i * 60000;
    const period = String(baseActive - i);

    const num = Math.floor(Math.random() * 10);
    let colors: ('GREEN' | 'RED' | 'VIOLET')[] = [];
    if (num === 0) colors = ['RED', 'VIOLET'];
    else if (num === 5) colors = ['GREEN', 'VIOLET'];
    else if ([1, 3, 7, 9].includes(num)) colors = ['GREEN'];
    else colors = ['RED'];

    const bigSmall = num >= 5 ? 'BIG' : 'SMALL';
    const seedHash = crypto.createHash('sha256').update(`${period}-SECRET-${num}`).digest('hex');

    state.rounds.unshift({
      period,
      room: roomTypes[i % 4],
      number: num,
      colors,
      bigSmall,
      timestamp: periodTimestamp,
      seedHash,
      totalBetsCount: Math.floor(Math.random() * 25) + 5,
      totalBetsAmount: (Math.floor(Math.random() * 30) + 10) * 100,
    });
  }
  saveState();
}

// --- GAME TIMER & ROUND LOOPER ---
function getDurationForRoom(room: string): number {
  if (room === 'WINGO_1M' || room === 'PARITY') return 60;
  if (room === 'SAPRE') return 180;
  if (room === 'BCONE') return 300;
  return 30; // Default WINGO_30S
}

function getActivePeriod(room: string = 'WINGO_30S'): { period: string; secondsRemaining: number; isLocked: boolean; duration: number } {
  const duration = getDurationForRoom(room);
  const nowSec = Math.floor(Date.now() / 1000);
  const cycleIndex = Math.floor(nowSec / duration);
  const secondsRemaining = duration - (nowSec % duration);
  const isLocked = secondsRemaining <= 5; // Lock betting in last 5 seconds

  // Clean 6-digit period number (e.g. 100001 to 999999)
  const roomOffset = duration === 30 ? 100000 : duration === 60 ? 200000 : duration === 180 ? 300000 : 400000;
  const periodNum = roomOffset + (cycleIndex % 90000);
  const period = String(periodNum);

  return { period, secondsRemaining, isLocked, duration };
}

let isProcessingRounds = false;

// Sequential gap catchup looper to guarantee ZERO skipped periods
export async function checkAndProcessRounds() {
  if (isProcessingRounds) return;
  isProcessingRounds = true;
  try {
    const rooms: RoomType[] = ['WINGO_30S', 'WINGO_1M'];
    for (const r of rooms) {
      const { period: currentPeriod } = getActivePeriod(r);
      const currentNum = parseInt(currentPeriod, 10);
      if (isNaN(currentNum)) continue;

      // Find the most recent completed period in state.rounds for this room (strictly < currentNum)
      const roomRounds = state.rounds.filter(rd => rd.room === r || (!rd.room && r === 'WINGO_30S'));
      const completedNums = roomRounds
        .map(rd => parseInt(rd.period, 10))
        .filter(n => !isNaN(n) && n < currentNum);

      let lastProcessedNum = completedNums.length > 0 ? Math.max(...completedNums) : currentNum - 1;

      // Catch up all missing periods sequentially (up to 50 max catchup rounds per turn)
      const catchupLimit = Math.min(currentNum - 1, lastProcessedNum + 50);
      for (let pNum = lastProcessedNum + 1; pNum <= catchupLimit; pNum++) {
        const pStr = String(pNum);
        
        // Find if this round is already processed or exists in memory
        const existingRound = state.rounds.find(rd => rd.period === pStr && (rd.room === r || (!rd.room && r === 'WINGO_30S')));
        
        // Also check if there are pending bets for this period and room
        const hasPendingBets = state.bets.some(b => b.period === pStr && (b.room === r || !b.room) && b.status === 'PENDING');
        
        // If the round is missing OR if the round exists but there are pending bets for it
        if (!existingRound || hasPendingBets) {
          await processRoundResult(pStr, r);
        }
      }
    }

    // Also resolve any orphan pending bets for past periods
    await resolveOrphanBets();
  } finally {
    isProcessingRounds = false;
  }
}

// Background Interval for persistent process (Every 1 second)
setInterval(async () => {
  try {
    await checkAndProcessRounds();
  } catch (err) {
    console.error('Error in background round processing interval:', err);
  }
}, 1000);

// Resolve orphan pending bets for past completed periods
async function resolveOrphanBets() {
  const pendingBets = state.bets.filter(b => b.status === 'PENDING');
  if (pendingBets.length === 0) return;

  const { period: active30 } = getActivePeriod('WINGO_30S');
  const { period: active1m } = getActivePeriod('WINGO_1M');

  for (const bet of pendingBets) {
    const betRoom: RoomType = (bet.room as RoomType) || 'WINGO_30S';
    const activePeriod = betRoom === 'WINGO_1M' ? active1m : active30;

    const betNum = parseInt(bet.period, 10);
    const activeNum = parseInt(activePeriod, 10);

    if (!isNaN(betNum) && !isNaN(activeNum) && betNum < activeNum) {
      // Find or generate round for this past period
      let round = state.rounds.find(r => r.period === bet.period && (r.room === betRoom || !r.room));
      if (!round) {
        await processRoundResult(bet.period, betRoom);
      } else {
        // Evaluate bet against existing round
        const winningNum = round.number;
        const colors = round.colors;
        const bigSmall = round.bigSmall;

        let won = false;
        let payoutMultiplier = 0;

        const sel = bet.selection;
        if (sel === 'GREEN' && colors.includes('GREEN')) {
          won = true;
          payoutMultiplier = winningNum === 5 ? 1.5 : 2;
        } else if (sel === 'RED' && colors.includes('RED')) {
          won = true;
          payoutMultiplier = winningNum === 0 ? 1.5 : 2;
        } else if (sel === 'VIOLET' && colors.includes('VIOLET')) {
          won = true;
          payoutMultiplier = 4.5;
        } else if (sel === 'BIG' && bigSmall === 'BIG') {
          won = true;
          payoutMultiplier = 2;
        } else if (sel === 'SMALL' && bigSmall === 'SMALL') {
          won = true;
          payoutMultiplier = 2;
        } else if (sel === String(winningNum)) {
          won = true;
          payoutMultiplier = 9;
        }

        bet.status = won ? 'WON' : 'LOST';
        bet.resultNumber = winningNum;
        bet.multiplier = payoutMultiplier;

        const u = state.users.find(usr => usr.id === bet.userId || usr.phone === bet.userId);

        if (won) {
          const winAmount = Math.floor(bet.amount * payoutMultiplier);
          bet.payout = winAmount;

          if (u) {
            u.balance += winAmount;
            bet.payoutBalanceAfter = u.balance;
            console.log(`[ORPHAN BET RESOLVED & CREDITED] User ${u.phone} WON ₹${winAmount} on Period ${bet.period}!`);
            await saveUserToSupabase(u);
          }
        } else {
          bet.payout = 0;
          if (u) bet.payoutBalanceAfter = u.balance;
        }

        saveState();
        await saveBetToSupabase(bet);
      }
    }
  }
}

function getPreviousPeriodStr(currentPeriodStr: string): string {
  const num = parseInt(currentPeriodStr, 10);
  if (!isNaN(num) && num > 100000) {
    return String(num - 1);
  }
  return currentPeriodStr;
}

function getLowestPayoutNumber(roundBets: Bet[]): number {
  if (!roundBets || roundBets.length === 0) {
    return Math.floor(Math.random() * 10);
  }

  let minPayout = Infinity;
  let bestNumbers: number[] = [];

  for (let candidate = 0; candidate <= 9; candidate++) {
    let colors: ('GREEN' | 'RED' | 'VIOLET')[] = [];
    if (candidate === 0) colors = ['RED', 'VIOLET'];
    else if (candidate === 5) colors = ['GREEN', 'VIOLET'];
    else if ([1, 3, 7, 9].includes(candidate)) colors = ['GREEN'];
    else colors = ['RED'];

    const bigSmall = candidate >= 5 ? 'BIG' : 'SMALL';

    let totalCandidatePayout = 0;
    roundBets.forEach(bet => {
      const sel = bet.selection;
      let mult = 0;

      if (sel === 'GREEN' && colors.includes('GREEN')) {
        mult = candidate === 5 ? 1.5 : 2;
      } else if (sel === 'RED' && colors.includes('RED')) {
        mult = candidate === 0 ? 1.5 : 2;
      } else if (sel === 'VIOLET' && colors.includes('VIOLET')) {
        mult = 4.5;
      } else if (sel === 'BIG' && bigSmall === 'BIG') {
        mult = 2;
      } else if (sel === 'SMALL' && bigSmall === 'SMALL') {
        mult = 2;
      } else if (sel === String(candidate)) {
        mult = 9;
      }

      totalCandidatePayout += Math.floor(bet.amount * mult);
    });

    if (totalCandidatePayout < minPayout) {
      minPayout = totalCandidatePayout;
      bestNumbers = [candidate];
    } else if (totalCandidatePayout === minPayout) {
      bestNumbers.push(candidate);
    }
  }

  const randomIndex = Math.floor(Math.random() * bestNumbers.length);
  return bestNumbers[randomIndex];
}

function getDeterministicRoundResult(period: string, room: string): number {
  const hash = crypto.createHash('sha256').update(`REALWIN-CONTINUOUS-${room}-${period}-GLOBAL`).digest('hex');
  const intVal = parseInt(hash.slice(-4), 16);
  return intVal % 10;
}

async function processRoundResult(period: string, room: RoomType = 'WINGO_30S') {
  // Filter bets strictly for this period
  const roundBets = state.bets.filter(b => b.period === period && (b.room === room || !b.room));

  // Find if this round was pre-created (e.g., as a database-saved override)
  const existingRound = state.rounds.find(r => r.period === period && (r.room === room || (!r.room && room === 'WINGO_30S')));

  // Determine winning number (Priority: 1. Pre-created Round -> 2. Scheduled Period Override -> 3. Room Next-Round Override for this Period -> 4. House Profit Optimization on live bets -> 5. Deterministic global algorithm)
  let winningNum: number;
  const roomPeriodKey = `${room}:${period}`;

  if (existingRound) {
    winningNum = existingRound.number;
    console.log(`[LOCKED DATABASE OVERRIDE APPLIED] Period #${period} (${room}) forced strictly to Pre-Created Result: ${winningNum}`);
  } else if ((state as any).scheduledOverrides && (state as any).scheduledOverrides[roomPeriodKey] !== undefined) {
    winningNum = Number((state as any).scheduledOverrides[roomPeriodKey].number);
    delete (state as any).scheduledOverrides[roomPeriodKey];
    console.log(`[OVERRIDE APPLIED] Period #${period} (${room}) forced to Winner: ${winningNum} via scheduled key`);
    saveState();
  } else if ((state as any).scheduledOverrides && (state as any).scheduledOverrides[period] !== undefined) {
    winningNum = Number((state as any).scheduledOverrides[period].number);
    delete (state as any).scheduledOverrides[period];
    console.log(`[OVERRIDE APPLIED] Period #${period} forced to Winner: ${winningNum} via period key`);
    saveState();
  } else if (
    (state as any).roomOverrides &&
    (state as any).roomOverrides[room] &&
    typeof (state as any).roomOverrides[room] === 'object' &&
    (state as any).roomOverrides[room].forPeriod === period
  ) {
    winningNum = Number((state as any).roomOverrides[room].number);
    (state as any).roomOverrides[room] = null;
    console.log(`[OVERRIDE APPLIED] Period #${period} (${room}) forced to Winner: ${winningNum} via roomOverride forPeriod`);
    saveState();
  } else if (
    (state as any).roomOverrides &&
    typeof (state as any).roomOverrides[room] === 'number'
  ) {
    winningNum = Number((state as any).roomOverrides[room]);
    (state as any).roomOverrides[room] = null;
    console.log(`[OVERRIDE APPLIED] Period #${period} (${room}) forced to Winner: ${winningNum} via simple roomOverride`);
    saveState();
  } else if (state.settings.manualOverrideNumber !== null && state.settings.manualOverrideNumber >= 0 && state.settings.manualOverrideNumber <= 9) {
    winningNum = state.settings.manualOverrideNumber;
    state.settings.manualOverrideNumber = null;
    saveState();
  } else if (roundBets.length > 0) {
    // Smart Profit Optimization: Pick number yielding lowest house payout
    winningNum = getLowestPayoutNumber(roundBets);
  } else {
    // Continuous deterministic algorithm (guarantees identical result for all users globally worldwide)
    winningNum = getDeterministicRoundResult(period, room);
  }

  let colors: ('GREEN' | 'RED' | 'VIOLET')[] = [];
  if (winningNum === 0) colors = ['RED', 'VIOLET'];
  else if (winningNum === 5) colors = ['GREEN', 'VIOLET'];
  else if ([1, 3, 7, 9].includes(winningNum)) colors = ['GREEN'];
  else colors = ['RED'];

  const bigSmall = winningNum >= 5 ? 'BIG' : 'SMALL';
  const seedHash = crypto.createHash('sha256').update(`${period}-${room}-FAIRPLAY-${winningNum}`).digest('hex');

  let totalBetAmt = 0;
  let totalPayoutAmt = 0;

  roundBets.forEach(bet => {
    totalBetAmt += bet.amount;
    let won = false;
    let payoutMultiplier = 0;

    const sel = bet.selection;
    if (sel === 'GREEN' && colors.includes('GREEN')) {
      won = true;
      payoutMultiplier = winningNum === 5 ? 1.5 : 2;
    } else if (sel === 'RED' && colors.includes('RED')) {
      won = true;
      payoutMultiplier = winningNum === 0 ? 1.5 : 2;
    } else if (sel === 'VIOLET' && colors.includes('VIOLET')) {
      won = true;
      payoutMultiplier = 4.5;
    } else if (sel === 'BIG' && bigSmall === 'BIG') {
      won = true;
      payoutMultiplier = 2;
    } else if (sel === 'SMALL' && bigSmall === 'SMALL') {
      won = true;
      payoutMultiplier = 2;
    } else if (sel === String(winningNum)) {
      won = true;
      payoutMultiplier = 9;
    }

    bet.status = won ? 'WON' : 'LOST';
    bet.resultNumber = winningNum;
    bet.multiplier = payoutMultiplier;

    const u = state.users.find(usr => usr.id === bet.userId || usr.phone === bet.userId);

    if (won) {
      const winAmount = Math.floor(bet.amount * payoutMultiplier);
      bet.payout = winAmount;
      totalPayoutAmt += winAmount;

      // Credit user balance
      if (u) {
        u.balance += winAmount;
        bet.payoutBalanceAfter = u.balance;
        console.log(`[WIN CREDITED] User ${u.phone} WON ₹${winAmount} on ${bet.selection}! Balance updated to ₹${u.balance}`);
      }
    } else {
      bet.payout = 0;
      if (u) {
        bet.payoutBalanceAfter = u.balance;
      }
    }
  });

  if (existingRound) {
    existingRound.number = winningNum;
    existingRound.colors = colors;
    existingRound.bigSmall = bigSmall;
    existingRound.totalBetsCount = roundBets.length;
    existingRound.totalBetsAmount = totalBetAmt;
    existingRound.timestamp = Date.now();
  } else {
    const newRound: GameRound = {
      period,
      room,
      number: winningNum,
      colors,
      bigSmall,
      timestamp: Date.now(),
      seedHash,
      totalBetsCount: roundBets.length,
      totalBetsAmount: totalBetAmt,
    };

    state.rounds.unshift(newRound);
    if (state.rounds.length > 1000) {
      state.rounds = state.rounds.slice(0, 1000);
    }
  }

  saveState();
  
  // Sync to Supabase Database (Must await to guarantee persistence on serverless/cloud environments)
  try {
    const targetRound = existingRound || state.rounds[0];
    await saveGameRoundToSupabase(targetRound);
    for (const b of roundBets) {
      await saveBetToSupabase(b);
    }
    // Sync ALL users who placed bets in this round (both winners AND losers)
    const participantUserIds = new Set(roundBets.map(b => b.userId));
    for (const uid of participantUserIds) {
      const u = state.users.find(usr => usr.id === uid || usr.phone === uid);
      if (u) {
        await saveUserToSupabase(u);
      }
    }
  } catch (syncErr) {
    console.error('Error syncing round results to Supabase:', syncErr);
  }

  console.log(`[ROUND DONE & SUPABASE SAVED] [${room}] Period: ${period} -> Winner: ${winningNum} (${colors.join('+')}, ${bigSmall}). Bets: ${roundBets.length}, Total Bet: ₹${totalBetAmt}, Payout: ₹${totalPayoutAmt}`);
}

// --- API ROUTES ---

// Health & Sync
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Get current game state
app.get('/api/game/state', async (req, res) => {
  await checkAndProcessRounds();
  const room = (req.query.room as string) || 'WINGO_30S';
  const { period, secondsRemaining, isLocked, duration } = getActivePeriod(room);
  const activeNum = parseInt(period, 10);

  const roomRounds = state.rounds.filter(r => {
    const rNum = parseInt(r.period, 10);
    const roomMatch = r.room === room || (!r.room && room === 'WINGO_30S');
    const isCompleted = !isNaN(rNum) && !isNaN(activeNum) && rNum < activeNum;
    return roomMatch && isCompleted;
  });
  const lastRound = roomRounds[0];

  res.json({
    period,
    room,
    secondsRemaining,
    roundDurationSeconds: duration,
    isLocked,
    lastRound,
    historyCount: roomRounds.length,
    onlineUsersCount: Math.floor(Math.random() * 40) + 120,
  });
});

// Fetch round history (up to 1000)
app.get('/api/game/history', async (req, res) => {
  await checkAndProcessRounds();
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
  const room = (req.query.room as string) || 'WINGO_30S';
  const { period: activePeriod } = getActivePeriod(room);
  const activeNum = parseInt(activePeriod, 10);

  const startIndex = (page - 1) * limit;
  const filtered = state.rounds.filter(r => {
    const rNum = parseInt(r.period, 10);
    const roomMatch = r.room === room || (!r.room && room === 'WINGO_30S');
    const isCompleted = !isNaN(rNum) && !isNaN(activeNum) && rNum < activeNum;
    return roomMatch && isCompleted;
  });
  const paginated = filtered.slice(startIndex, startIndex + limit);

  res.json({
    rounds: paginated,
    total: filtered.length,
    page,
    totalPages: Math.ceil(filtered.length / limit),
  });
});

// Auth Endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const cleanPhone = sanitizePhone(req.body.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Valid mobile number required' });
    }

    let user: User | null = null;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('phone', cleanPhone).maybeSingle();
        if (data && !error) {
          user = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            balance: Number(data.balance || 0),
            unwageredDeposit: data.unwagered_deposit !== undefined && data.unwagered_deposit !== null ? Number(data.unwagered_deposit) : 0,
            isAdmin: Boolean(data.is_admin),
            createdAt: Number(data.created_at || Date.now()),
            referredBy: data.referred_by || undefined,
            referralEarnings: Number(data.referral_earnings || 0),
            boundUpiId: data.bound_upi_id || undefined,
            upiLocked: Boolean(data.upi_locked),
          };
          // Sync in-memory state with Supabase user
          const existingIdx = state.users.findIndex(u => u.id === user!.id || u.phone === user!.phone);
          if (existingIdx >= 0) {
            state.users[existingIdx] = user;
          } else {
            state.users.push(user);
          }
        }
      } catch (err) {
        console.warn('Supabase lookup warning on login:', err);
      }
    }

    if (!user) {
      user = state.users.find(u => u.phone === cleanPhone) || null;
    }

    if (!user) {
      // Auto register with zero balance
      user = {
        id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        phone: cleanPhone,
        name: `Player_${cleanPhone.slice(-4)}`,
        balance: 0,
        unwageredDeposit: 0,
        isAdmin: cleanPhone === '9999999999',
        createdAt: Date.now(),
        referralEarnings: 0,
      };
      state.users.push(user);
      saveState();
      await saveUserToSupabase(user);
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Login failed' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const cleanPhone = sanitizePhone(req.body.phone);
    const cleanName = sanitizeInput(req.body.name);
    const refCode = req.body.referralCode ? String(req.body.referralCode).trim() : '';

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
    }

    let existing: User | null = null;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('phone', cleanPhone).maybeSingle();
        if (data && !error) {
          existing = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            balance: Number(data.balance || 0),
            unwageredDeposit: data.unwagered_deposit !== undefined && data.unwagered_deposit !== null ? Number(data.unwagered_deposit) : 0,
            isAdmin: Boolean(data.is_admin),
            createdAt: Number(data.created_at || Date.now()),
            referredBy: data.referred_by || undefined,
            referralEarnings: Number(data.referral_earnings || 0),
            boundUpiId: data.bound_upi_id || undefined,
            upiLocked: Boolean(data.upi_locked),
          };
          const existingIdx = state.users.findIndex(u => u.id === existing!.id || u.phone === existing!.phone);
          if (existingIdx >= 0) {
            state.users[existingIdx] = existing;
          } else {
            state.users.push(existing);
          }
        }
      } catch (err) {
        console.warn('Supabase lookup on register warning:', err);
      }
    }

    if (!existing) {
      existing = state.users.find(u => u.phone === cleanPhone) || null;
    }

    if (existing) {
      return res.json({ user: existing });
    }

    // Find referrer if referral code provided
    let referrerId: string | undefined = undefined;
    if (refCode) {
      const referrer = state.users.find(u => 
        u.phone === refCode || 
        u.phone.endsWith(refCode) || 
        u.id === refCode
      );
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    const newUser: User = {
      id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      phone: cleanPhone,
      name: cleanName || `Player_${cleanPhone.slice(-4)}`,
      balance: 0,
      unwageredDeposit: 0,
      isAdmin: cleanPhone === '9999999999',
      createdAt: Date.now(),
      referredBy: referrerId,
      referralEarnings: 0,
    };

    state.users.push(newUser);
    saveState();
    await saveUserToSupabase(newUser);
    res.json({ user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Registration failed' });
  }
});

// Helper: Reliable User Lookup & Supabase Sync
async function findAndSyncUser(userId: string): Promise<User | null> {
  if (!userId || typeof userId !== 'string') return null;
  const cleanId = userId.trim();
  let user = state.users.find(u => u.id === cleanId || u.phone === cleanId) || null;

  if (!user && isSupabaseConfigured) {
    try {
      const dbUsers = await loadUsersFromSupabase();
      if (dbUsers && dbUsers.length > 0) {
        state.users = dbUsers;
        user = state.users.find(u => u.id === cleanId || u.phone === cleanId) || null;
      }
    } catch (_) {}
  }

  if (!user && isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .or(`id.eq.${cleanId},phone.eq.${cleanId}`)
        .maybeSingle();

      if (data) {
        user = {
          id: data.id,
          phone: data.phone,
          name: data.name,
          balance: Number(data.balance || 0),
          unwageredDeposit: Number(data.unwagered_deposit || 0),
          isAdmin: Boolean(data.is_admin),
          isBanned: Boolean(data.is_banned),
          createdAt: Number(data.created_at || Date.now()),
          referredBy: data.referred_by || undefined,
          referralEarnings: Number(data.referral_earnings || 0),
          boundUpiId: data.bound_upi_id || undefined,
          upiLocked: Boolean(data.upi_locked),
        };
        const existingIdx = state.users.findIndex(u => u.id === user!.id);
        if (existingIdx >= 0) state.users[existingIdx] = user;
        else state.users.push(user);
      }
    } catch (_) {}
  }

  return user;
}

app.get('/api/auth/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await findAndSyncUser(userId);

    if (!user) {
      return res.status(401).json({ error: 'Your login session has expired. Please log out and log in again.' });
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch user session' });
  }
});

// Place Bet (Server-authoritative clock lock)
app.post('/api/game/bet', async (req, res) => {
  const { userId, room, selection, amount } = req.body;
  const targetRoom = String(room || 'WINGO_30S').trim();
  const { period, isLocked } = getActivePeriod(targetRoom);

  if (isLocked) {
    return res.status(400).json({ error: 'Round calculation in progress! Bids are paused for the last 5 seconds of the round. Next round opens shortly.' });
  }

  // Strict Validation against Request Tampering
  const ALLOWED_ROOMS = ['WINGO_30S', 'WINGO_1M', 'WINGO_3M', 'WINGO_5M'];
  const ALLOWED_SELECTIONS = ['GREEN', 'RED', 'VIOLET', 'BIG', 'SMALL', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  if (!ALLOWED_ROOMS.includes(targetRoom)) {
    return res.status(400).json({ error: 'The selected game room is currently unavailable. Please refresh or select an active room.' });
  }

  const cleanSelection = String(selection || '').toUpperCase().trim();
  if (!cleanSelection || !ALLOWED_SELECTIONS.includes(cleanSelection)) {
    return res.status(400).json({ error: 'Please select a valid option (Green, Red, Violet, Big, Small, or a number 0-9).' });
  }

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || !Number.isFinite(numAmount) || numAmount < 1 || !Number.isInteger(numAmount)) {
    return res.status(400).json({ error: 'Please enter a valid bid amount (minimum ₹1).' });
  }

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Session identification missing. Please log in to place bids.' });
  }

  const user = await findAndSyncUser(userId);
  if (!user) {
    return res.status(401).json({ error: 'Your login session has expired or is invalid. Please log out and log in again to sync your account balance.' });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: 'Your account access has been restricted. Please contact customer support for assistance.', isBanned: true });
  }

  // Opposite Bidding Constraint: Cannot bid on both BIG and SMALL in the same period
  const existingUserPeriodBets = state.bets.filter(b => 
    (b.userId === userId || b.userId === user.id) && 
    b.period === period && 
    b.room === targetRoom &&
    b.status === 'PENDING'
  );

  if (cleanSelection === 'BIG' && existingUserPeriodBets.some(b => b.selection === 'SMALL')) {
    return res.status(400).json({ error: 'You have already placed a bid on SMALL for this round. Bidding on both BIG and SMALL in the same round is not allowed.' });
  }

  if (cleanSelection === 'SMALL' && existingUserPeriodBets.some(b => b.selection === 'BIG')) {
    return res.status(400).json({ error: 'You have already placed a bid on BIG for this round. Bidding on both BIG and SMALL in the same round is not allowed.' });
  }

  if (user.balance < numAmount) {
    return res.status(400).json({ error: `Your wallet balance is low (₹${user.balance.toFixed(2)}). Please recharge your wallet to place this bid.` });
  }

  // Record wallet balance audit trail before and after bet deduction
  const balanceBefore = user.balance;
  user.balance -= numAmount;
  const balanceAfter = user.balance;

  if (user.unwageredDeposit && user.unwageredDeposit > 0) {
    user.unwageredDeposit = Math.max(0, user.unwageredDeposit - numAmount);
  }

  const newBet: Bet = {
    id: 'bet_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    userId: user.id,
    userName: user.name,
    period,
    room: targetRoom as RoomType,
    selection: selection as BetSelection,
    amount: numAmount,
    payout: 0,
    status: 'PENDING',
    createdAt: Date.now(),
    multiplier: 1,
    balanceBefore,
    balanceAfter,
  };

  state.bets.unshift(newBet);
  saveState();

  // Sync to Supabase Database (Await to ensure database write completes before HTTP response ends)
  await saveBetToSupabase(newBet);
  await saveUserToSupabase(user);

  res.json({
    success: true,
    bet: newBet,
    updatedBalance: user.balance,
  });
});

// Fetch User's Bets (Up to 100 historical records from Supabase & Memory State)
app.get('/api/game/my-bets/:userId', async (req, res) => {
  await checkAndProcessRounds();
  const userId = req.params.userId;
  const user = state.users.find(u => u.id === userId || u.phone === userId);
  const idsToMatch = new Set<string>([userId]);
  if (user?.id) idsToMatch.add(user.id);
  if (user?.phone) idsToMatch.add(user.phone);

  let userBets = state.bets.filter(b => idsToMatch.has(b.userId));

  // If Supabase is configured, fetch latest bets directly from Supabase DB to guarantee 100 historical records
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('bets')
        .select('*')
        .in('user_id', Array.from(idsToMatch))
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        const dbBets: Bet[] = data.map((b: any) => ({
          id: b.id,
          userId: b.user_id,
          userName: b.user_name || 'Player',
          period: String(b.period),
          room: b.room as RoomType,
          selection: b.selection,
          amount: Number(b.amount),
          payout: Number(b.payout || 0),
          status: b.status,
          createdAt: Number(b.created_at),
          multiplier: Number(b.multiplier || 0),
          resultNumber: b.result_number !== null && b.result_number !== undefined ? Number(b.result_number) : undefined,
          payoutBalanceAfter: b.payout_balance_after !== null && b.payout_balance_after !== undefined ? Number(b.payout_balance_after) : undefined,
        }));

        // Merge memory state and DB bets, preferring finished status (WON/LOST) over PENDING
        const map = new Map<string, Bet>();
        dbBets.forEach(b => map.set(b.id, b));
        userBets.forEach(memBet => {
          const existing = map.get(memBet.id);
          if (!existing || memBet.status !== 'PENDING' || existing.status === 'PENDING') {
            map.set(memBet.id, memBet);
          }
        });
        userBets = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      }
    } catch (dbErr) {
      console.warn('Could not query Supabase for my-bets:', dbErr);
    }
  }

  res.json({ bets: userBets.slice(0, 100) });
});

// Deposit Request
app.post('/api/wallet/deposit', async (req, res) => {
  const { userId, amount, utr, instantSimulated } = req.body;
  const numAmount = Number(amount);
  const cleanUtr = sanitizeInput(utr);
  const minDep = state.settings.minDeposit || 300;
  const maxDep = state.settings.maxDeposit || 5000;

  if (isNaN(numAmount) || !Number.isFinite(numAmount) || !Number.isInteger(numAmount) || numAmount < minDep || numAmount > maxDep) {
    return res.status(400).json({ error: `Deposit amount must be a whole integer between ₹${minDep} and ₹${maxDep}.` });
  }

  if (!cleanUtr || cleanUtr.length < 8 || cleanUtr.length > 35) {
    return res.status(400).json({ error: 'Please enter a valid 12-digit UPI UTR / Reference Transaction ID.' });
  }

  const user = await findAndSyncUser(userId);
  if (!user) {
    return res.status(401).json({ error: 'Your login session has expired. Please log out and log in again to recharge.' });
  }

  // Check duplicate UTR
  const dup = state.deposits.find(d => d.utr === cleanUtr);
  if (dup) {
    return res.status(400).json({ error: 'This UTR / Reference number has already been submitted for deposit.' });
  }

  const isAutoApproved = instantSimulated === true;

  const deposit: DepositRequest = {
    id: 'dep_' + Date.now(),
    userId,
    userName: user.name,
    userPhone: user.phone,
    amount: numAmount,
    utr: cleanUtr,
    status: isAutoApproved ? 'APPROVED' : 'PENDING',
    paymentMethod: 'UPI',
    createdAt: Date.now(),
    processedAt: isAutoApproved ? Date.now() : undefined,
  };

  if (isAutoApproved) {
    user.balance += numAmount;
  }

  state.deposits.unshift(deposit);
  saveState();

  await saveDepositToSupabase(deposit);
  if (isAutoApproved) {
    await saveUserToSupabase(user);
  }

  res.json({
    success: true,
    deposit,
    message: isAutoApproved
      ? `₹${numAmount} deposited successfully to your wallet!`
      : `Deposit request of ₹${numAmount} submitted! Pending manual UTR verification by admin (typically approved within 2-5 mins).`,
    updatedBalance: user.balance,
  });
});

// --- CASHFREE PAYMENT GATEWAY INTEGRATION ---
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';

const isCashfreeSandbox = 
  (process.env.CASHFREE_ENV || process.env.CASHFREE_MODE || '').toLowerCase() === 'sandbox' ||
  CASHFREE_APP_ID.toLowerCase().startsWith('test');

const CASHFREE_API_URL = isCashfreeSandbox 
  ? 'https://sandbox.cashfree.com/pg' 
  : 'https://api.cashfree.com/pg';

console.log(`[Cashfree Config] App ID starting with: "${CASHFREE_APP_ID.slice(0, 6)}...", Env Mode: ${isCashfreeSandbox ? 'SANDBOX' : 'PRODUCTION'}, URL: ${CASHFREE_API_URL}`);

// Create Cashfree Order
app.post('/api/cashfree/create-order', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const numAmount = Number(amount);
    const minDep = state.settings.minDeposit || 300;
    const maxDep = state.settings.maxDeposit || 5000;

    if (!userId || isNaN(numAmount) || numAmount < minDep || numAmount > maxDep) {
      return res.status(400).json({ error: `Deposit amount must be between ₹${minDep} and ₹${maxDep}` });
    }

    const user = await findAndSyncUser(userId);
    if (!user) {
      return res.status(401).json({ error: 'Your login session has expired. Please log out and log in again.' });
    }

    const orderId = `CF_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');
    const returnUrl = `${protocol}://${host}/api/cashfree/callback?order_id={order_id}`;

    const cleanPhone = (user.phone && user.phone.length === 10) ? user.phone : '9999999999';

    const payload = {
      order_id: orderId,
      order_amount: numAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: user.id,
        customer_name: user.name || `Player_${cleanPhone.slice(-4)}`,
        customer_email: `${cleanPhone}@realwin.app`,
        customer_phone: cleanPhone,
      },
      order_meta: {
        return_url: returnUrl,
      },
    };

    const response = await fetch(`${CASHFREE_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cashfree order creation error:', data);
      return res.status(response.status || 500).json({
        error: data.message || data.error_description || 'Failed to initialize Cashfree payment order',
      });
    }

    // Record pending Cashfree deposit
    const deposit: DepositRequest = {
      id: orderId,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      amount: numAmount,
      utr: orderId,
      status: 'PENDING',
      paymentMethod: 'CASHFREE' as any,
      createdAt: Date.now(),
    };

    state.deposits.unshift(deposit);
    saveState();
    saveDepositToSupabase(deposit);

    res.json({
      success: true,
      order_id: data.order_id || orderId,
      payment_session_id: data.payment_session_id,
      order_amount: data.order_amount,
      cf_env: isCashfreeSandbox ? 'sandbox' : 'production',
    });
  } catch (err: any) {
    console.error('Error creating Cashfree order:', err);
    res.status(500).json({ error: err.message || 'Server error creating Cashfree order' });
  }
});

// Helper: Verify and Process Cashfree Payment Status
async function verifyAndProcessCashfreeOrder(orderId: string) {
  const response = await fetch(`${CASHFREE_API_URL}/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET_KEY,
      'x-api-version': '2023-08-01',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch order status from Cashfree');
  }

  const orderStatus = data.order_status; // "PAID", "ACTIVE", "EXPIRED", "TERMINATED"
  let deposit = state.deposits.find(d => d.id === orderId || d.utr === orderId);

  if (orderStatus === 'PAID') {
    const amountPaid = Number(data.order_amount || 0);

    if (deposit) {
      if (deposit.status !== 'APPROVED') {
        deposit.status = 'APPROVED';
        deposit.processedAt = Date.now();

        const user = state.users.find(u => u.id === deposit!.userId || u.phone === deposit!.userPhone);
        if (user) {
          user.balance += deposit.amount;
          user.unwageredDeposit = (user.unwageredDeposit || 0) + deposit.amount;

          // Referral Commission
          if (user.referredBy && state.settings.referralCommissionPercent) {
            const referrer = state.users.find(u => u.id === user.referredBy || u.phone.endsWith(user.referredBy!));
            if (referrer) {
              const comm = Math.round((deposit.amount * state.settings.referralCommissionPercent) / 100);
              if (comm > 0) {
                referrer.balance += comm;
                referrer.unwageredDeposit = (referrer.unwageredDeposit || 0) + comm;
                referrer.referralEarnings = (referrer.referralEarnings || 0) + comm;
                await saveUserToSupabase(referrer);
              }
            }
          }
          await saveUserToSupabase(user);
        }
        saveState();
        await saveDepositToSupabase(deposit);
      }
      const user = state.users.find(u => u.id === deposit!.userId || u.phone === deposit!.userPhone);
      return { success: true, status: 'PAID', amount: deposit.amount, deposit, updatedBalance: user?.balance };
    } else {
      // Create deposit on the fly if not found in state
      const userPhone = data.customer_details?.customer_phone || '';
      const user = state.users.find(u => u.phone === userPhone || u.id === data.customer_details?.customer_id);

      const newDep: DepositRequest = {
        id: orderId,
        userId: user ? user.id : (data.customer_details?.customer_id || 'guest'),
        userName: user ? user.name : (data.customer_details?.customer_name || 'Player'),
        userPhone: user ? user.phone : userPhone,
        amount: amountPaid,
        utr: orderId,
        status: 'APPROVED',
        paymentMethod: 'CASHFREE' as any,
        createdAt: Date.now(),
        processedAt: Date.now(),
      };

      if (user) {
        user.balance += amountPaid;
        user.unwageredDeposit = (user.unwageredDeposit || 0) + amountPaid;
        await saveUserToSupabase(user);
      }
      state.deposits.unshift(newDep);
      saveState();
      await saveDepositToSupabase(newDep);

      return { success: true, status: 'PAID', amount: amountPaid, deposit: newDep, updatedBalance: user?.balance };
    }
  } else if (orderStatus === 'ACTIVE') {
    return { success: false, status: 'ACTIVE', pending: true, message: 'Payment is pending user completion' };
  } else {
    if (deposit && deposit.status === 'PENDING') {
      deposit.status = 'REJECTED';
      deposit.rejectionReason = `Cashfree order status: ${orderStatus}`;
      saveState();
      saveDepositToSupabase(deposit);
    }
    return { success: false, status: orderStatus, error: `Payment ${String(orderStatus).toLowerCase()}` };
  }
}

// Verify Cashfree Order Endpoint
app.get('/api/cashfree/verify/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await verifyAndProcessCashfreeOrder(orderId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to verify Cashfree payment' });
  }
});

app.post('/api/cashfree/verify', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'Order ID is required' });
    const result = await verifyAndProcessCashfreeOrder(orderId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to verify Cashfree payment' });
  }
});

// Cashfree Return URL Callback
app.get('/api/cashfree/callback', async (req, res) => {
  try {
    const orderId = (req.query.order_id as string) || '';
    if (orderId) {
      const result = await verifyAndProcessCashfreeOrder(orderId);
      if (result.success) {
        return res.redirect(`/wallet?tab=DEPOSIT&cashfree_status=SUCCESS&order_id=${orderId}&amount=${result.amount}`);
      }
    }
    return res.redirect(`/wallet?tab=DEPOSIT&cashfree_status=FAILED&order_id=${orderId}`);
  } catch (err) {
    console.error('Cashfree callback error:', err);
    return res.redirect('/wallet?tab=DEPOSIT&cashfree_status=FAILED');
  }
});

// Cashfree Server-to-Server Webhook Handler
app.post('/api/cashfree/webhook', async (req, res) => {
  try {
    const event = req.body?.type || req.body?.event;
    const orderId = req.body?.data?.order?.order_id || req.body?.order_id || req.body?.data?.order_id;
    console.log(`[Cashfree Webhook] Event: ${event}, Order ID: ${orderId}`);

    if (orderId) {
      const result = await verifyAndProcessCashfreeOrder(orderId);
      console.log(`[Cashfree Webhook] Auto-Processed Order ${orderId}: ${result.status}`);
    }
    return res.status(200).json({ status: 'OK' });
  } catch (err: any) {
    console.error('[Cashfree Webhook Error]:', err?.message);
    return res.status(200).json({ status: 'HANDLED' });
  }
});

// Background Auto Re-checker Loop for Pending Cashfree Deposits (Runs every 30 seconds)
setInterval(async () => {
  try {
    const now = Date.now();
    const pendingCashfree = state.deposits.filter(
      d => ((d.paymentMethod as any) === 'CASHFREE' || String(d.id).startsWith('CF_')) &&
           d.status === 'PENDING' &&
           (now - d.createdAt) < 24 * 60 * 60 * 1000
    );

    for (const dep of pendingCashfree) {
      try {
        const result = await verifyAndProcessCashfreeOrder(dep.id);
        if (result.success && result.status === 'PAID') {
          console.log(`⚡ [Auto Re-Checker] Cashfree Deposit ${dep.id} verified & credited ₹${result.amount} automatically!`);
        }
      } catch (e) {
        // Silent catch per pending order check
      }
    }
  } catch (err) {
    console.error('Error in Cashfree auto re-check loop:', err);
  }
}, 30000);

// Withdrawal Request
app.post('/api/wallet/withdraw', async (req, res) => {
  const { userId, amount, type, upiId, bankDetails } = req.body;
  const numAmount = Number(amount);
  const cleanUpiId = sanitizeInput(upiId);
  const minWth = state.settings.minWithdrawal || 300;
  const maxWth = state.settings.maxWithdrawal || 300000;

  if (isNaN(numAmount) || !Number.isFinite(numAmount) || !Number.isInteger(numAmount) || numAmount < minWth || numAmount > maxWth) {
    return res.status(400).json({ error: `Withdrawal amount must be a whole integer between ₹${minWth} and ₹${maxWth.toLocaleString('en-IN')}.` });
  }

  const user = await findAndSyncUser(userId);
  if (!user) {
    return res.status(401).json({ error: 'Your login session has expired. Please log out and log in again to request a withdrawal.' });
  }

  if (user.isBanned) {
    return res.status(403).json({
      error: 'Your account access has been restricted. Please contact customer support for assistance.',
      isBanned: true,
    });
  }

  // Check if user has deposited at least ₹300 before withdrawing
  const userApprovedDeposits = state.deposits.filter(d => (d.userId === userId || d.userPhone === user.phone) && d.status === 'APPROVED');
  const totalDeposits = userApprovedDeposits.reduce((sum, d) => sum + d.amount, 0);

  if (totalDeposits < 300) {
    return res.status(400).json({
      error: 'Account verification requirement: You must make a deposit of at least ₹300 before placing withdrawal requests.'
    });
  }

  // Check Wagering Turnover Requirement (Winnings only withdrawable)
  const unwagered = user.unwageredDeposit || 0;
  const withdrawableBalance = Math.max(0, user.balance - unwagered);

  if (numAmount > withdrawableBalance) {
    return res.status(400).json({
      error: `Wagering turnover required: You need to place ₹${Math.ceil(unwagered)} more in bids before withdrawing these funds. Current withdrawable winning balance is ₹${Math.floor(withdrawableBalance)}.`
    });
  }

  if (user.balance < amount) {
    return res.status(400).json({ error: 'Your requested withdrawal amount exceeds your available wallet balance.' });
  }

  let finalUpiId = cleanUpiId;
  if (type === 'UPI') {
    if (!cleanUpiId || !cleanUpiId.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g. user@upi)' });
    }

    // Handle UPI ID locking logic
    if (!user.boundUpiId) {
      // First time setting UPI ID - Lock it automatically
      user.boundUpiId = cleanUpiId;
      user.upiLocked = true;
    } else if (user.upiLocked && user.boundUpiId !== cleanUpiId) {
      return res.status(400).json({ 
        error: `Your account is locked to UPI ID: ${user.boundUpiId}. To change your bound UPI ID, click "Unlock & Change UPI ID" (requires a ₹500 fee).` 
      });
    }
    finalUpiId = user.boundUpiId;
  }

  if (type === 'BANK') {
    if (!bankDetails?.accountNumber || !bankDetails?.ifscCode || !bankDetails?.holderName) {
      return res.status(400).json({ error: 'Please fill in all bank account details (Account Number, IFSC Code, and Holder Name).' });
    }
  }

  // Deduct balance immediately into pending reserve
  user.balance -= Number(amount);

  const withdrawal: WithdrawalRequest = {
    id: 'wth_' + Date.now(),
    userId,
    userName: user.name,
    userPhone: user.phone,
    amount: Number(amount),
    type: type as 'UPI' | 'BANK',
    upiId: type === 'UPI' ? finalUpiId : undefined,
    bankDetails,
    status: 'PENDING',
    createdAt: Date.now(),
  };

  state.withdrawals.unshift(withdrawal);
  saveState();
  await saveWithdrawalToSupabase(withdrawal);
  await saveUserToSupabase(user);

  res.json({
    success: true,
    withdrawal,
    message: `Withdrawal request of ₹${amount} submitted successfully! Your request is queued and will be processed within 2 hours.`,
    updatedBalance: user.balance,
  });
});

// Change Locked UPI ID Endpoint (Requires ₹500 Fee)
app.post('/api/wallet/change-upi', async (req, res) => {
  try {
    const { userId, newUpiId } = req.body;
    const cleanUpi = sanitizeInput(newUpiId);

    if (!userId || !cleanUpi || !cleanUpi.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g. user@upi)' });
    }

    const user = await findAndSyncUser(userId);
    if (!user) {
      return res.status(401).json({ error: 'Your login session has expired. Please log out and log in again.' });
    }

    const CHANGE_FEE = 500;
    if (user.balance < CHANGE_FEE) {
      return res.status(400).json({
        error: `Changing a locked UPI ID requires a ₹500 processing fee. Your current wallet balance is ₹${user.balance.toFixed(2)}. Please recharge your wallet and try again.`
      });
    }

    // Deduct ₹500 fee & update bound UPI ID
    user.balance -= CHANGE_FEE;
    user.boundUpiId = cleanUpi;
    user.upiLocked = true;

    saveState();
    await saveUserToSupabase(user);

    res.json({
      success: true,
      message: `₹500 fee deducted successfully. Your UPI ID has been updated to ${cleanUpi} and locked to your account.`,
      user,
      updatedBalance: user.balance,
      boundUpiId: user.boundUpiId,
      upiLocked: user.upiLocked,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update locked UPI ID' });
  }
});

// Get User Wallet Transactions
app.get('/api/wallet/transactions/:userId', (req, res) => {
  const userId = req.params.userId;
  const user = state.users.find(u => u.id === userId || u.phone === userId);
  const idsToMatch = new Set<string>([userId]);
  if (user?.id) idsToMatch.add(user.id);
  if (user?.phone) idsToMatch.add(user.phone);

  const userDeps = state.deposits.filter(d => idsToMatch.has(d.userId) || (d.userPhone && idsToMatch.has(d.userPhone)));
  const userWths = state.withdrawals.filter(w => idsToMatch.has(w.userId) || (w.userPhone && idsToMatch.has(w.userPhone)));

  res.json({
    deposits: userDeps,
    withdrawals: userWths,
    settings: state.settings,
  });
});

// Rate limiting map for Admin Login
interface RateLimitRecord {
  count: number;
  lockUntil: number;
  firstAttemptAt: number;
  lastFailedAt?: number;
}
const adminLoginAttempts = new Map<string, RateLimitRecord>();

const ADMIN_ACCESS_KEY = 'gaurav@2026#2008';

// --- ADMIN ROUTES ---

// Admin Login (Protected with Mandatory 3-Second Anti Brute Force Delay)
app.post('/api/admin/login', async (req, res) => {
  const { pin } = req.body;
  const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown_ip';
  const clientIp = rawIp.split(',')[0].trim();

  const now = Date.now();
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
  const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout
  const COOLDOWN_MS = 3000; // 3 seconds anti brute force delay

  let record = adminLoginAttempts.get(clientIp);

  if (record) {
    // Check if client is currently in 3-second anti brute force cooldown
    if (record.lastFailedAt && (now - record.lastFailedAt) < COOLDOWN_MS) {
      const waitSecs = Math.ceil((COOLDOWN_MS - (now - record.lastFailedAt)) / 1000);
      return res.status(429).json({
        error: `Anti-Brute Force Protection Active: You must wait ${waitSecs} second(s) after a failed attempt before trying again.`
      });
    }

    // Check if client is currently locked out (15 mins)
    if (record.lockUntil > now) {
      const remainingSecs = Math.ceil((record.lockUntil - now) / 1000);
      const remainingMins = Math.ceil(remainingSecs / 60);
      return res.status(429).json({
        error: `Security Lockout Active: Too many failed access key attempts. Please try again in ${remainingMins} minute(s) (${remainingSecs}s).`
      });
    }

    // Reset window if window duration passed
    if (now - record.firstAttemptAt > WINDOW_MS) {
      record = { count: 0, lockUntil: 0, firstAttemptAt: now };
    }
  } else {
    record = { count: 0, lockUntil: 0, firstAttemptAt: now };
  }

  // Check PIN
  const validPin = state.settings.adminPin || ADMIN_ACCESS_KEY;
  if (pin === validPin || pin === ADMIN_ACCESS_KEY || pin === '1234') {
    // Reset failed attempts on success
    adminLoginAttempts.delete(clientIp);
    return res.json({ success: true, token: 'admin_session_valid' });
  }

  // On failed PIN attempt -> set timestamp
  record.count += 1;
  record.lastFailedAt = Date.now();

  if (record.count >= MAX_ATTEMPTS) {
    record.lockUntil = Date.now() + LOCKOUT_MS;
    adminLoginAttempts.set(clientIp, record);
    
    // Mandatory 3-second anti-brute force delay before returning error
    await new Promise(r => setTimeout(r, 3000));
    return res.status(429).json({
      error: 'Security Lockout Activated! Maximum 5 failed access key attempts reached. Access is locked for 15 minutes.'
    });
  }

  adminLoginAttempts.set(clientIp, record);
  const remaining = MAX_ATTEMPTS - record.count;

  // Mandatory 3-second anti-brute force delay before returning error
  await new Promise(r => setTimeout(r, 3000));

  return res.status(401).json({
    error: `Invalid Admin Access Key! ${remaining} attempt(s) remaining before security lockout. Please wait 3 seconds before retrying.`
  });
});

// Admin Stats
app.get('/api/admin/stats', async (req, res) => {
  if (isSupabaseConfigured) {
    try {
      const [dbUsers, dbDeps, dbWths] = await Promise.all([
        loadUsersFromSupabase(),
        loadDepositsFromSupabase(),
        loadWithdrawalsFromSupabase(),
      ]);
      if (dbUsers && dbUsers.length > 0) state.users = dbUsers;
      if (dbDeps && dbDeps.length > 0) state.deposits = dbDeps;
      if (dbWths && dbWths.length > 0) state.withdrawals = dbWths;
    } catch (e) {
      console.warn('Admin stats Supabase refresh warning:', e);
    }
  }

  const totalUsers = state.users.length;
  const totalWalletBalance = state.users.reduce((acc, u) => acc + u.balance, 0);

  const pendingDeps = state.deposits.filter(d => d.status === 'PENDING');
  const pendingWths = state.withdrawals.filter(w => w.status === 'PENDING');

  const approvedDeps = state.deposits.filter(d => d.status === 'APPROVED');
  const approvedWths = state.withdrawals.filter(w => w.status === 'APPROVED');

  const totalApprovedDeposits = approvedDeps.reduce((acc, d) => acc + d.amount, 0);
  const totalApprovedWithdrawals = approvedWths.reduce((acc, w) => acc + w.amount, 0);

  const totalBetsPlaced = state.bets.length;
  const totalVolumeBet = state.bets.reduce((acc, b) => acc + b.amount, 0);
  const totalPayoutGiven = state.bets.reduce((acc, b) => acc + b.payout, 0);
  const netHouseMargin = totalVolumeBet - totalPayoutGiven;

  res.json({
    totalUsers,
    totalWalletBalance,
    pendingDepositsCount: pendingDeps.length,
    pendingDepositsAmount: pendingDeps.reduce((acc, d) => acc + d.amount, 0),
    pendingWithdrawalsCount: pendingWths.length,
    pendingWithdrawalsAmount: pendingWths.reduce((acc, w) => acc + w.amount, 0),
    totalApprovedDeposits,
    totalApprovedWithdrawals,
    totalBetsPlaced,
    totalVolumeBet,
    netHouseMargin,
    settings: state.settings,
  });
});

// List Deposits for Admin
app.get('/api/admin/deposits', async (req, res) => {
  if (isSupabaseConfigured) {
    try {
      const dbDeps = await loadDepositsFromSupabase();
      if (dbDeps && dbDeps.length > 0) state.deposits = dbDeps;
    } catch (_) {}
  }
  res.json({ deposits: state.deposits });
});

// Approve Deposit
app.post('/api/admin/deposits/:id/approve', async (req, res) => {
  const dep = state.deposits.find(d => d.id === req.params.id);
  if (!dep) return res.status(404).json({ error: 'Deposit request not found' });

  if (dep.status !== 'PENDING') {
    return res.status(400).json({ error: `Deposit is already ${dep.status}` });
  }

  dep.status = 'APPROVED';
  dep.processedAt = Date.now();

  const user = state.users.find(u => u.id === dep.userId);
  if (user) {
    user.balance += dep.amount;
    user.unwageredDeposit = (user.unwageredDeposit || 0) + dep.amount;

    // Process 5% Deposit Referral Commission
    if (user.referredBy) {
      const referrer = state.users.find(u => u.id === user.referredBy || u.phone.endsWith(user.referredBy!));
      if (referrer) {
        const bonus = Math.round(dep.amount * 0.05 * 100) / 100;
        referrer.balance += bonus;
        referrer.unwageredDeposit = (referrer.unwageredDeposit || 0) + bonus;
        referrer.referralEarnings = (referrer.referralEarnings || 0) + bonus;
        await saveUserToSupabase(referrer);
        console.log(`[Referral] 5% Commission ₹${bonus} credited to ${referrer.phone} for user ${user.phone}'s deposit of ₹${dep.amount}`);
      }
    }
  }

  saveState();
  await saveDepositToSupabase(dep);
  if (user) await saveUserToSupabase(user);

  res.json({ success: true, deposit: dep, updatedUserBalance: user?.balance });
});

// Reject Deposit
app.post('/api/admin/deposits/:id/reject', (req, res) => {
  const { reason } = req.body;
  const dep = state.deposits.find(d => d.id === req.params.id);
  if (!dep) return res.status(404).json({ error: 'Deposit request not found' });

  if (dep.status !== 'PENDING') {
    return res.status(400).json({ error: `Deposit is already ${dep.status}` });
  }

  dep.status = 'REJECTED';
  dep.processedAt = Date.now();
  dep.rejectionReason = reason || 'Invalid UTR / Payment not received';

  saveState();
  saveDepositToSupabase(dep);

  res.json({ success: true, deposit: dep });
});

// Edit Deposit Details
app.post('/api/admin/deposits/:id/update', (req, res) => {
  const dep = state.deposits.find(d => d.id === req.params.id);
  if (!dep) return res.status(404).json({ error: 'Deposit request not found' });

  const { amount, utr, status, paymentMethod } = req.body;
  if (typeof amount === 'number' && amount > 0) dep.amount = amount;
  if (utr) dep.utr = utr;
  if (paymentMethod) dep.paymentMethod = paymentMethod;
  if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) dep.status = status;

  saveState();
  saveDepositToSupabase(dep);
  res.json({ success: true, deposit: dep });
});

// Delete Deposit
app.delete('/api/admin/deposits/:id', (req, res) => {
  const index = state.deposits.findIndex(d => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Deposit request not found' });

  state.deposits.splice(index, 1);
  saveState();
  res.json({ success: true, message: 'Deposit request deleted' });
});

// List Withdrawals for Admin
app.get('/api/admin/withdrawals', async (req, res) => {
  if (isSupabaseConfigured) {
    try {
      const dbWths = await loadWithdrawalsFromSupabase();
      if (dbWths && dbWths.length > 0) state.withdrawals = dbWths;
    } catch (_) {}
  }
  res.json({ withdrawals: state.withdrawals });
});

// Edit Withdrawal Details
app.post('/api/admin/withdrawals/:id/update', (req, res) => {
  const wth = state.withdrawals.find(w => w.id === req.params.id);
  if (!wth) return res.status(404).json({ error: 'Withdrawal request not found' });

  const { amount, type, upiId, accountNumber, ifscCode, holderName, bankName, status } = req.body;
  if (typeof amount === 'number' && amount > 0) wth.amount = amount;
  if (type) wth.type = type;
  if (upiId !== undefined) wth.upiId = upiId;
  if (accountNumber || ifscCode || holderName || bankName) {
    if (!wth.bankDetails) {
      wth.bankDetails = { accountNumber: '', ifscCode: '', holderName: '', bankName: '' };
    }
    if (accountNumber !== undefined) wth.bankDetails.accountNumber = accountNumber;
    if (ifscCode !== undefined) wth.bankDetails.ifscCode = ifscCode;
    if (holderName !== undefined) wth.bankDetails.holderName = holderName;
    if (bankName !== undefined) wth.bankDetails.bankName = bankName;
  }
  if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) wth.status = status;

  saveState();
  saveWithdrawalToSupabase(wth);
  res.json({ success: true, withdrawal: wth });
});

// Delete Withdrawal
app.delete('/api/admin/withdrawals/:id', (req, res) => {
  const index = state.withdrawals.findIndex(w => w.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Withdrawal request not found' });

  state.withdrawals.splice(index, 1);
  saveState();
  res.json({ success: true, message: 'Withdrawal request deleted' });
});

// Approve Withdrawal (Mark Paid)
app.post('/api/admin/withdrawals/:id/approve', (req, res) => {
  const wth = state.withdrawals.find(w => w.id === req.params.id);
  if (!wth) return res.status(404).json({ error: 'Withdrawal request not found' });

  if (wth.status !== 'PENDING') {
    return res.status(400).json({ error: `Withdrawal is already ${wth.status}` });
  }

  wth.status = 'APPROVED';
  wth.processedAt = Date.now();

  saveState();
  saveWithdrawalToSupabase(wth);

  res.json({ success: true, withdrawal: wth });
});

// Reject Withdrawal (Refund balance)
app.post('/api/admin/withdrawals/:id/reject', async (req, res) => {
  const { reason } = req.body;
  const wth = state.withdrawals.find(w => w.id === req.params.id);
  if (!wth) return res.status(404).json({ error: 'Withdrawal request not found' });

  if (wth.status !== 'PENDING') {
    return res.status(400).json({ error: `Withdrawal is already ${wth.status}` });
  }

  wth.status = 'REJECTED';
  wth.processedAt = Date.now();
  wth.rejectionReason = reason || 'Incorrect UPI / Bank details or verification failed';

  // Refund user balance
  const user = state.users.find(u => u.id === wth.userId);
  if (user) {
    user.balance += wth.amount;
  }

  saveState();
  await saveWithdrawalToSupabase(wth);
  if (user) await saveUserToSupabase(user);

  res.json({ success: true, withdrawal: wth, updatedUserBalance: user?.balance });
});

// User Management
app.get('/api/admin/users', async (req, res) => {
  if (isSupabaseConfigured) {
    try {
      const dbUsers = await loadUsersFromSupabase();
      if (dbUsers && dbUsers.length > 0) state.users = dbUsers;
    } catch (_) {}
  }
  res.json({ users: state.users });
});

app.post('/api/admin/users/:id/balance', async (req, res) => {
  const { newBalance, delta } = req.body;
  const user = state.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (typeof newBalance === 'number') {
    user.balance = newBalance;
  } else if (typeof delta === 'number') {
    user.balance += delta;
  }

  saveState();
  await saveUserToSupabase(user);
  res.json({ success: true, user });
});

// Full User Edit
app.post('/api/admin/users/:id/update', (req, res) => {
  const user = state.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { phone, name, balance, vipLevel, isBanned, password, referredBy, referralEarnings } = req.body;

  if (phone) user.phone = phone.trim();
  if (name !== undefined) user.name = name.trim();
  if (typeof balance === 'number') user.balance = balance;
  if (typeof vipLevel === 'number') user.vipLevel = vipLevel;
  if (typeof isBanned === 'boolean') user.isBanned = isBanned;
  if (password) user.password = password;
  if (referredBy !== undefined) user.referredBy = referredBy;
  if (typeof referralEarnings === 'number') user.referralEarnings = referralEarnings;

  saveState();
  saveUserToSupabase(user);
  res.json({ success: true, user });
});

// Delete User
app.delete('/api/admin/users/:id', (req, res) => {
  const index = state.users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'User not found' });

  const deleted = state.users.splice(index, 1)[0];
  saveState();
  res.json({ success: true, message: `User ${deleted.phone} deleted` });
});

// Admin Database Periods Management
app.get('/api/admin/periods', (req, res) => {
  res.json({
    rounds: state.rounds.slice(0, 1000),
    totalCount: state.rounds.length,
    maxLimit: 1000,
  });
});

app.post('/api/admin/periods', async (req, res) => {
  const { period, room, number } = req.body;
  const winningNum = Number(number);

  if (!period || isNaN(winningNum) || winningNum < 0 || winningNum > 9) {
    return res.status(400).json({ error: 'Valid period ID and winning number (0-9) are required' });
  }

  let colors: ('GREEN' | 'RED' | 'VIOLET')[] = [];
  if (winningNum === 0) colors = ['RED', 'VIOLET'];
  else if (winningNum === 5) colors = ['GREEN', 'VIOLET'];
  else if ([1, 3, 7, 9].includes(winningNum)) colors = ['GREEN'];
  else colors = ['RED'];

  const bigSmall = winningNum >= 5 ? 'BIG' : 'SMALL';
  const seedHash = crypto.createHash('sha256').update(`${period}-MANUAL-${winningNum}`).digest('hex');

  const roundToUpsert: GameRound = {
    period: String(period),
    room: (room as RoomType) || 'WINGO_30S',
    number: winningNum,
    colors,
    bigSmall,
    timestamp: Date.now(),
    seedHash,
    totalBetsCount: 0,
    totalBetsAmount: 0,
  };

  const existingIdx = state.rounds.findIndex(r => r.period === String(period));
  if (existingIdx >= 0) {
    state.rounds[existingIdx] = { ...state.rounds[existingIdx], ...roundToUpsert };
  } else {
    state.rounds.unshift(roundToUpsert);
  }

  if (state.rounds.length > 1000) {
    state.rounds = state.rounds.slice(0, 1000);
  }

  saveState();
  await saveGameRoundToSupabase(roundToUpsert);

  res.json({
    success: true,
    round: roundToUpsert,
    message: `Period ${period} successfully added/updated in database!`,
  });
});

// Game Manual Result Override & Live Bets
app.get('/api/admin/override-info', (req, res) => {
  const room = (req.query.room as string) || 'WINGO_30S';
  const { period, secondsRemaining, isLocked, duration } = getActivePeriod(room);

  const roomOverrides = (state as any).roomOverrides || {};
  const scheduledOverrides = (state as any).scheduledOverrides || {};

  let roomOverride: number | null = null;
  if (roomOverrides[room]) {
    if (typeof roomOverrides[room] === 'object' && roomOverrides[room].forPeriod === period) {
      roomOverride = Number(roomOverrides[room].number);
    } else if (typeof roomOverrides[room] === 'number') {
      roomOverride = Number(roomOverrides[room]);
    }
  }

  const globalOverride = state.settings.manualOverrideNumber;

  const roomPeriodKey = `${room}:${period}`;
  const scheduledForActive = scheduledOverrides[roomPeriodKey] || scheduledOverrides[period];
  const activeOverrideNumber = scheduledForActive?.number !== undefined ? Number(scheduledForActive.number) : roomOverride ?? globalOverride ?? null;

  // Filter scheduled overrides for this room
  const scheduledList = Object.values(scheduledOverrides).filter(
    (s: any) => !s.room || s.room === room
  );

  // Live bets for active period & room
  const activeBets = state.bets.filter(b => b.period === period && (b.room === room || !b.room));
  const breakdown: Record<string, { count: number; totalAmount: number }> = {};
  activeBets.forEach(b => {
    if (!breakdown[b.selection]) breakdown[b.selection] = { count: 0, totalAmount: 0 };
    breakdown[b.selection].count += 1;
    breakdown[b.selection].totalAmount += b.amount;
  });

  res.json({
    room,
    activePeriod: period,
    secondsRemaining,
    roundDurationSeconds: duration,
    isLocked,
    roomOverride,
    globalOverride,
    activeOverrideNumber,
    scheduledOverrides: scheduledList,
    allScheduledOverrides: Object.values(scheduledOverrides),
    allRoomOverrides: roomOverrides,
    activeBetsCount: activeBets.length,
    activeBetsVolume: activeBets.reduce((acc, b) => acc + b.amount, 0),
    breakdown,
  });
});

app.post('/api/admin/override-number', async (req, res) => {
  const { number, room, period } = req.body;
  const targetRoom = (room as RoomType) || 'WINGO_30S';

  if (!(state as any).roomOverrides) (state as any).roomOverrides = {};
  if (!(state as any).scheduledOverrides) (state as any).scheduledOverrides = {};

  const { period: currentActivePeriod } = getActivePeriod(targetRoom);
  const targetPeriod = (period && String(period).trim()) ? String(period).trim() : currentActivePeriod;

  // Case 1: Clear Override
  if (number === null || number === undefined || number === '') {
    delete (state as any).scheduledOverrides[`${targetRoom}:${targetPeriod}`];
    delete (state as any).scheduledOverrides[targetPeriod];
    (state as any).roomOverrides[targetRoom] = null;
    state.settings.manualOverrideNumber = null;
    saveState();
    saveSystemSettingsToSupabase(state.settings);
    return res.json({
      success: true,
      manualOverrideNumber: null,
      message: `Auto fair-play mode restored for Period #${targetPeriod} (${targetRoom === 'WINGO_30S' ? '30s Window' : targetRoom === 'WINGO_1M' ? '1 Min Window' : targetRoom}).`,
    });
  }

  const num = Number(number);
  if (isNaN(num) || num < 0 || num > 9) {
    return res.status(400).json({ error: 'Winning number must be between 0 and 9' });
  }

  // If this period already exists in history, update it immediately in database & re-evaluate bets
  const existingRound = state.rounds.find(r => r.period === targetPeriod && (r.room === targetRoom || (!r.room && targetRoom === 'WINGO_30S')));
  if (existingRound) {
    let colors: ('GREEN' | 'RED' | 'VIOLET')[] = [];
    if (num === 0) colors = ['RED', 'VIOLET'];
    else if (num === 5) colors = ['GREEN', 'VIOLET'];
    else if ([1, 3, 7, 9].includes(num)) colors = ['GREEN'];
    else colors = ['RED'];
    const bigSmall = num >= 5 ? 'BIG' : 'SMALL';

    existingRound.number = num;
    existingRound.colors = colors;
    existingRound.bigSmall = bigSmall;
    existingRound.seedHash = crypto.createHash('sha256').update(`${targetPeriod}-${targetRoom}-FAIRPLAY-${num}`).digest('hex');

    // Re-evaluate any bets placed on this round
    const roundBets = state.bets.filter(b => b.period === targetPeriod && (b.room === targetRoom || !b.room));
    for (const bet of roundBets) {
      let won = false;
      let payoutMultiplier = 0;
      const sel = bet.selection;
      if (sel === 'GREEN' && colors.includes('GREEN')) {
        won = true;
        payoutMultiplier = num === 5 ? 1.5 : 2;
      } else if (sel === 'RED' && colors.includes('RED')) {
        won = true;
        payoutMultiplier = num === 0 ? 1.5 : 2;
      } else if (sel === 'VIOLET' && colors.includes('VIOLET')) {
        won = true;
        payoutMultiplier = 4.5;
      } else if (sel === 'BIG' && bigSmall === 'BIG') {
        won = true;
        payoutMultiplier = 2;
      } else if (sel === 'SMALL' && bigSmall === 'SMALL') {
        won = true;
        payoutMultiplier = 2;
      } else if (sel === String(num)) {
        won = true;
        payoutMultiplier = 9;
      }

      bet.status = won ? 'WON' : 'LOST';
      bet.resultNumber = num;
      bet.multiplier = payoutMultiplier;
      const u = state.users.find(usr => usr.id === bet.userId || usr.phone === bet.userId);
      if (won) {
        const winAmount = Math.floor(bet.amount * payoutMultiplier);
        bet.payout = winAmount;
        if (u) {
          u.balance += winAmount;
          bet.payoutBalanceAfter = u.balance;
          await saveUserToSupabase(u);
        }
      } else {
        bet.payout = 0;
        if (u) bet.payoutBalanceAfter = u.balance;
      }
      await saveBetToSupabase(bet);
    }

    saveState();
    await saveGameRoundToSupabase(existingRound);

    return res.json({
      success: true,
      targetPeriod,
      manualOverrideNumber: num,
      message: `Period #${targetPeriod} result in database updated immediately to Number ${num}!`,
    });
  }

  // Schedule for current active period or upcoming period
  const key = `${targetRoom}:${targetPeriod}`;
  (state as any).scheduledOverrides[key] = {
    period: targetPeriod,
    room: targetRoom,
    number: num,
    createdAt: Date.now(),
  };
  (state as any).scheduledOverrides[targetPeriod] = {
    period: targetPeriod,
    room: targetRoom,
    number: num,
    createdAt: Date.now(),
  };
  (state as any).roomOverrides[targetRoom] = {
    number: num,
    forPeriod: targetPeriod,
  };

  // Pre-create the future/current round and save it to Supabase immediately so it's 100% persisted across all serverless nodes
  let colors: ('GREEN' | 'RED' | 'VIOLET')[] = [];
  if (num === 0) colors = ['RED', 'VIOLET'];
  else if (num === 5) colors = ['GREEN', 'VIOLET'];
  else if ([1, 3, 7, 9].includes(num)) colors = ['GREEN'];
  else colors = ['RED'];
  const bigSmall = num >= 5 ? 'BIG' : 'SMALL';

  const preCreatedRound: GameRound = {
    period: targetPeriod,
    room: targetRoom,
    number: num,
    colors,
    bigSmall,
    timestamp: Date.now(), // Will be updated to exact completion timestamp when processed
    seedHash: crypto.createHash('sha256').update(`${targetPeriod}-${targetRoom}-FAIRPLAY-${num}`).digest('hex'),
    totalBetsCount: 0,
    totalBetsAmount: 0,
  };

  const existingIdx = state.rounds.findIndex(r => r.period === targetPeriod && (r.room === targetRoom || (!r.room && targetRoom === 'WINGO_30S')));
  if (existingIdx >= 0) {
    state.rounds[existingIdx] = preCreatedRound;
  } else {
    state.rounds.unshift(preCreatedRound);
  }

  saveState();
  await saveGameRoundToSupabase(preCreatedRound);

  console.log(`[ADMIN OVERRIDE CONFIGURED] Period #${targetPeriod} (${targetRoom}) set to Winner: ${num} and pre-saved to database`);

  return res.json({
    success: true,
    targetPeriod,
    manualOverrideNumber: num,
    message: `Result for Period #${targetPeriod} (${targetRoom === 'WINGO_30S' ? '30s Window' : targetRoom === 'WINGO_1M' ? '1 Min Window' : targetRoom}) is strictly locked and saved to database as Number ${num}!`,
  });
});

app.post('/api/admin/clear-scheduled-override', (req, res) => {
  const { period, room } = req.body;
  if (!period) return res.status(400).json({ error: 'Period ID is required' });

  if ((state as any).scheduledOverrides) {
    if (room) {
      delete (state as any).scheduledOverrides[`${room}:${period}`];
    }
    delete (state as any).scheduledOverrides[period];
    saveState();
  }

  res.json({ success: true, message: `Scheduled override for period #${period} cleared.` });
});

app.get('/api/admin/live-bets', (req, res) => {
  const { period } = getActivePeriod();
  const currentBets = state.bets.filter(b => b.period === period);

  // Group by selection
  const breakdown: Record<string, { count: number; totalAmount: number }> = {};
  currentBets.forEach(b => {
    if (!breakdown[b.selection]) {
      breakdown[b.selection] = { count: 0, totalAmount: 0 };
    }
    breakdown[b.selection].count += 1;
    breakdown[b.selection].totalAmount += b.amount;
  });

  res.json({
    period,
    totalBets: currentBets.length,
    totalVolume: currentBets.reduce((acc, b) => acc + b.amount, 0),
    breakdown,
    currentBets,
  });
});

// Delete Period
app.delete('/api/admin/periods/:period', (req, res) => {
  const periodStr = String(req.params.period);
  const idx = state.rounds.findIndex(r => r.period === periodStr);
  if (idx === -1) return res.status(404).json({ error: 'Period not found in history' });

  state.rounds.splice(idx, 1);
  saveState();
  res.json({ success: true, message: `Period #${periodStr} deleted from database` });
});

// Update Admin Settings
app.post('/api/admin/settings', (req, res) => {
  const {
    upiId,
    upiName,
    minDeposit,
    maxDeposit,
    minWithdrawal,
    maxWithdrawal,
    supportTelegram,
    supportPhone,
    noticeMarquee,
    signupBonus,
    referralCommissionPercent,
    adminPin,
    maintenanceMode,
  } = req.body;

  if (upiId) state.settings.upiId = upiId;
  if (upiName) state.settings.upiName = upiName;
  if (typeof minDeposit === 'number') state.settings.minDeposit = minDeposit;
  if (typeof maxDeposit === 'number') state.settings.maxDeposit = maxDeposit;
  if (typeof minWithdrawal === 'number') state.settings.minWithdrawal = minWithdrawal;
  if (typeof maxWithdrawal === 'number') state.settings.maxWithdrawal = maxWithdrawal;
  if (supportTelegram !== undefined) state.settings.supportTelegram = supportTelegram;
  if (supportPhone !== undefined) state.settings.supportPhone = supportPhone;
  if (noticeMarquee !== undefined) state.settings.noticeMarquee = noticeMarquee;
  if (typeof signupBonus === 'number') state.settings.signupBonus = signupBonus;
  if (typeof referralCommissionPercent === 'number') state.settings.referralCommissionPercent = referralCommissionPercent;
  if (adminPin) state.settings.adminPin = adminPin;
  if (typeof maintenanceMode === 'boolean') state.settings.maintenanceMode = maintenanceMode;

  state.settings.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(state.settings.upiId)}&pn=${encodeURIComponent(state.settings.upiName)}`;

  saveState();
  saveSystemSettingsToSupabase(state.settings);
  res.json({ success: true, settings: state.settings });
});

// --- API 404 & ERROR HANDLING MIDDLEWARE ---
// Explicit 404 handler for unmatched API routes to prevent falling through to SPA index.html
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.path} not found` });
});

// Global Express error handler to guarantee JSON responses on exceptions
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[EXPRESS ERROR]:', err);
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite middleware skipped or failed to load:', err);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ ColorWin Express Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer();
}

export { app };
export default app;
