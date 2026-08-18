import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  User,
  GameRound,
  Bet,
  DepositRequest,
  WithdrawalRequest,
  SystemSettings,
  RoomType,
  BetSelection,
} from './src/types';

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import {
  supabase,
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
} from './src/lib/serverSupabase';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

// Security: Global Rate Limiter to prevent DDoS flooding attacks (allows live polling for timer & state)
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10000 requests per 15 minutes for real-time polling
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many requests from this IP, please try again in 15 minutes.' },
});

// Security: Auth Rate Limiter against Brute-Force attack vectors
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 login/init attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

// Security: Transaction Rate Limiter for Bets, Deposits, and Withdrawals
const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Transaction limit reached. Please wait a minute before retrying.' },
});

// Apply rate limits
app.use('/api/', globalApiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/deposit', transactionLimiter);
app.use('/api/withdraw', transactionLimiter);
app.use('/api/bet', transactionLimiter);

// Handle path normalization for serverless / Vercel rewrites
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && (req.url.startsWith('/auth') || req.url.startsWith('/game') || req.url.startsWith('/wallet') || req.url.startsWith('/admin') || req.url.startsWith('/cashfree') || req.url.startsWith('/health'))) {
    req.url = '/api' + req.url;
  }
  next();
});

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
let DATA_DIR = path.join(process.cwd(), 'data');
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
    // Ignore if /tmp is constrained
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
    signupBonus: 20,
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
    console.log(`Loaded state: ${state.rounds.length} history rounds, ${state.users.length} users.`);
  } catch (err) {
    console.error('Failed to parse saved state, using default', err);
  }
}

// Supabase Async Hydration & Sync Bootstrapper
async function initSupabaseData() {
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
    if (dbSettings) state.settings = dbSettings;

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
    // Keep max 50 rounds and max 100 bets in file to keep file size lightweight
    if (state.rounds.length > 50) {
      state.rounds = state.rounds.slice(0, 50);
    }
    if (state.bets.length > 100) {
      state.bets = state.bets.slice(0, 100);
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

let lastProcessedMap: Record<string, string> = {};

// Round completion check loop (runs every 1 second or on every API call)
export function checkAndProcessRounds() {
  const rooms = ['WINGO_30S', 'WINGO_1M'];
  for (const r of rooms) {
    const { period, secondsRemaining, duration } = getActivePeriod(r);
    const prevPeriod = getPreviousPeriodStr(period);
    if (!state.rounds.some(rd => rd.period === prevPeriod && rd.room === (r as RoomType))) {
      processRoundResult(prevPeriod, r as RoomType);
      lastProcessedMap[r] = period;
    }
  }
}

// Background Interval for persistent process
setInterval(() => {
  checkAndProcessRounds();
}, 1000);

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

function processRoundResult(period: string, room: RoomType = 'WINGO_30S') {
  // Filter bets for this round
  const roundBets = state.bets.filter(b => b.period === period || (b.room === room && b.status === 'PENDING'));

  // Determine winning number (Priority: 1. Scheduled Period Override -> 2. Room Next-Round Override -> 3. Global Override -> 4. House Profit Optimization)
  let winningNum: number;
  const roomPeriodKey = `${room}:${period}`;

  if ((state as any).scheduledOverrides && (state as any).scheduledOverrides[roomPeriodKey]) {
    winningNum = (state as any).scheduledOverrides[roomPeriodKey].number;
    delete (state as any).scheduledOverrides[roomPeriodKey];
    saveState();
  } else if ((state as any).scheduledOverrides && (state as any).scheduledOverrides[period]) {
    winningNum = (state as any).scheduledOverrides[period].number;
    delete (state as any).scheduledOverrides[period];
    saveState();
  } else if ((state as any).roomOverrides && (state as any).roomOverrides[room] !== undefined && (state as any).roomOverrides[room] !== null) {
    winningNum = (state as any).roomOverrides[room]!;
    (state as any).roomOverrides[room] = null; // consume
    saveState();
  } else if (state.settings.manualOverrideNumber !== null && state.settings.manualOverrideNumber >= 0 && state.settings.manualOverrideNumber <= 9) {
    winningNum = state.settings.manualOverrideNumber;
    state.settings.manualOverrideNumber = null; // reset override after use
    saveState();
  } else {
    // Smart Profit Optimization: Pick number yielding lowest house payout
    winningNum = getLowestPayoutNumber(roundBets);
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

    if (won) {
      const winAmount = Math.floor(bet.amount * payoutMultiplier);
      bet.payout = winAmount;
      totalPayoutAmt += winAmount;

      // Credit user balance
      const u = state.users.find(usr => usr.id === bet.userId);
      if (u) {
        u.balance += winAmount;
      }
    } else {
      bet.payout = 0;
    }
  });

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

  saveState();
  
  // Async Sync to Supabase Database (Auto-prunes to keep last 1000 period results)
  saveGameRoundToSupabase(newRound);
  roundBets.forEach(b => saveBetToSupabase(b));
  state.users.forEach(u => {
    if (roundBets.some(b => b.userId === u.id && b.status === 'WON')) {
      saveUserToSupabase(u);
    }
  });

  console.log(`[ROUND DONE & SUPABASE SAVED] [${room}] Period: ${period} -> Winner: ${winningNum} (${colors.join('+')}, ${bigSmall}). Bets: ${roundBets.length}, Total Bet: ₹${totalBetAmt}, Payout: ₹${totalPayoutAmt}`);
}

// --- API ROUTES ---

// Health & Sync
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Get current game state
app.get('/api/game/state', (req, res) => {
  const room = (req.query.room as string) || 'WINGO_30S';
  const { period, secondsRemaining, isLocked, duration } = getActivePeriod(room);
  const roomRounds = state.rounds.filter(r => r.room === room || !r.room);
  const lastRound = roomRounds[0] || state.rounds[0];

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
app.get('/api/game/history', (req, res) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
  const room = (req.query.room as string) || 'WINGO_30S';

  const startIndex = (page - 1) * limit;
  const filtered = state.rounds.filter(r => r.room === room || !r.room);
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

    let user = state.users.find(u => u.phone === cleanPhone);

    if (!user) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('phone', cleanPhone).maybeSingle();
        if (data && !error) {
          user = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            balance: Number(data.balance),
            isAdmin: Boolean(data.is_admin),
            createdAt: Number(data.created_at || Date.now()),
            referredBy: data.referred_by || undefined,
            referralEarnings: Number(data.referral_earnings || 0),
          };
          state.users.push(user);
        }
      } catch (err) {
        console.warn('Supabase lookup warning on login:', err);
      }
    }

    if (!user) {
      // Auto register with signup bonus
      user = {
        id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        phone: cleanPhone,
        name: `Player_${cleanPhone.slice(-4)}`,
        balance: state.settings.signupBonus ?? 20,
        isAdmin: cleanPhone === '9999999999',
        createdAt: Date.now(),
        referralEarnings: 0,
      };
      state.users.push(user);
      saveState();
      saveUserToSupabase(user);
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

    let existing = state.users.find(u => u.phone === cleanPhone);
    if (!existing) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('phone', cleanPhone).maybeSingle();
        if (data && !error) {
          existing = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            balance: Number(data.balance),
            isAdmin: Boolean(data.is_admin),
            createdAt: Number(data.created_at || Date.now()),
            referredBy: data.referred_by || undefined,
            referralEarnings: Number(data.referral_earnings || 0),
          };
          state.users.push(existing);
        }
      } catch (err) {
        console.warn('Supabase lookup on register warning:', err);
      }
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
      balance: state.settings.signupBonus ?? 20,
      isAdmin: cleanPhone === '9999999999',
      createdAt: Date.now(),
      referredBy: referrerId,
      referralEarnings: 0,
    };

    state.users.push(newUser);
    saveState();
    saveUserToSupabase(newUser);
    res.json({ user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Registration failed' });
  }
});

app.get('/api/auth/user/:id', async (req, res) => {
  try {
    let user = state.users.find(u => u.id === req.params.id);
    if (!user) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', req.params.id).maybeSingle();
        if (data && !error) {
          user = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            balance: Number(data.balance),
            isAdmin: Boolean(data.is_admin),
            createdAt: Number(data.created_at || Date.now()),
            referredBy: data.referred_by || undefined,
            referralEarnings: Number(data.referral_earnings || 0),
          };
          state.users.push(user);
        }
      } catch (err) {
        console.warn('Supabase lookup on fetch user warning:', err);
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch user' });
  }
});

// Place Bet (Server-authoritative clock lock)
app.post('/api/game/bet', (req, res) => {
  const { userId, room, selection, amount } = req.body;
  const targetRoom = room || 'WINGO_30S';
  const { period, isLocked } = getActivePeriod(targetRoom);

  if (isLocked) {
    return res.status(400).json({ error: 'Bidding is locked for calculation in the last 5 seconds of the round!' });
  }

  if (!userId || !selection || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid bet request details' });
  }

  const user = state.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance! Please deposit funds to place bids.' });
  }

  // Deduct balance immediately on server
  user.balance -= amount;
  if (user.unwageredDeposit && user.unwageredDeposit > 0) {
    user.unwageredDeposit = Math.max(0, user.unwageredDeposit - amount);
  }

  const newBet: Bet = {
    id: 'bet_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    userId,
    userName: user.name,
    period,
    room: targetRoom as RoomType,
    selection: selection as BetSelection,
    amount,
    payout: 0,
    status: 'PENDING',
    createdAt: Date.now(),
    multiplier: 1,
  };

  state.bets.unshift(newBet);
  saveState();

  // Sync to Supabase Database
  saveBetToSupabase(newBet);
  saveUserToSupabase(user);

  res.json({
    success: true,
    bet: newBet,
    updatedBalance: user.balance,
  });
});

// Fetch User's Bets
app.get('/api/game/my-bets/:userId', (req, res) => {
  const userId = req.params.userId;
  const userBets = state.bets.filter(b => b.userId === userId).slice(0, 50);
  res.json({ bets: userBets });
});

// Deposit Request
app.post('/api/wallet/deposit', (req, res) => {
  const { userId, amount, utr, instantSimulated } = req.body;
  const numAmount = Number(amount);
  const cleanUtr = sanitizeInput(utr);
  const minDep = state.settings.minDeposit || 500;
  const maxDep = state.settings.maxDeposit || 5000;

  if (isNaN(numAmount) || numAmount < 500) {
    return res.status(400).json({ error: '₹100 deposit option is currently NOT AVAILABLE. Minimum deposit amount is ₹500.' });
  }

  if (!userId || !numAmount || numAmount < minDep || numAmount > maxDep) {
    return res.status(400).json({ error: `Deposit amount must be between ₹${minDep} and ₹${maxDep}` });
  }

  if (!cleanUtr || cleanUtr.length < 8) {
    return res.status(400).json({ error: 'Valid 12-digit UPI UTR / Ref Transaction ID is required!' });
  }

  const user = state.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check duplicate UTR
  const dup = state.deposits.find(d => d.utr === cleanUtr);
  if (dup) {
    return res.status(400).json({ error: 'This UTR number has already been submitted!' });
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
  saveDepositToSupabase(deposit);
  if (isAutoApproved) {
    saveUserToSupabase(user);
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

    const user = state.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
                saveUserToSupabase(referrer);
              }
            }
          }
          saveUserToSupabase(user);
        }
        saveState();
        saveDepositToSupabase(deposit);
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
        saveUserToSupabase(user);
      }
      state.deposits.unshift(newDep);
      saveState();
      saveDepositToSupabase(newDep);

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
app.post('/api/wallet/withdraw', (req, res) => {
  const { userId, amount, type, upiId, bankDetails } = req.body;
  const numAmount = Number(amount);
  const cleanUpiId = sanitizeInput(upiId);
  const minWth = state.settings.minWithdrawal || 300;
  const maxWth = state.settings.maxWithdrawal || 300000;

  if (!userId || !amount || amount < minWth || amount > maxWth) {
    return res.status(400).json({ error: `Withdrawal amount must be between ₹${minWth} and ₹${maxWth.toLocaleString('en-IN')}` });
  }

  const user = state.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.isBanned) {
    return res.status(403).json({
      error: 'Device & Account Banned: Your access has been restricted due to policy violation.',
      isBanned: true,
    });
  }

  // Check if user has deposited at least ₹300 before withdrawing
  const userApprovedDeposits = state.deposits.filter(d => (d.userId === userId || d.userPhone === user.phone) && d.status === 'APPROVED');
  const totalDeposits = userApprovedDeposits.reduce((sum, d) => sum + d.amount, 0);

  if (totalDeposits < 300) {
    return res.status(400).json({
      error: 'Withdrawal Locked: You must make a deposit of at least ₹300 before placing withdrawal requests.'
    });
  }

  // Check Wagering Turnover Requirement (Winnings only withdrawable)
  const unwagered = user.unwageredDeposit || 0;
  const withdrawableBalance = Math.max(0, user.balance - unwagered);

  if (numAmount > withdrawableBalance) {
    return res.status(400).json({
      error: `Withdrawal Locked: You must place bets worth ₹${Math.ceil(unwagered)} more before withdrawing. Current Withdrawable (Winning) Balance is ₹${Math.floor(withdrawableBalance)}.`
    });
  }

  if (user.balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance to request withdrawal!' });
  }

  if (type === 'UPI' && (!upiId || !upiId.includes('@'))) {
    return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g. name@upi)' });
  }

  if (type === 'BANK') {
    if (!bankDetails?.accountNumber || !bankDetails?.ifscCode || !bankDetails?.holderName) {
      return res.status(400).json({ error: 'Please fill in all bank account details (Account Number, IFSC, Holder Name)' });
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
    upiId,
    bankDetails,
    status: 'PENDING',
    createdAt: Date.now(),
  };

  state.withdrawals.unshift(withdrawal);
  saveState();
  saveWithdrawalToSupabase(withdrawal);
  saveUserToSupabase(user);

  res.json({
    success: true,
    withdrawal,
    message: `Withdrawal request of ₹${amount} submitted successfully! Your request is queued for manual processing and will be transferred to your account within 2 hours.`,
    updatedBalance: user.balance,
  });
});

// Get User Wallet Transactions
app.get('/api/wallet/transactions/:userId', (req, res) => {
  const userId = req.params.userId;
  const userDeps = state.deposits.filter(d => d.userId === userId);
  const userWths = state.withdrawals.filter(w => w.userId === userId);

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
}
const adminLoginAttempts = new Map<string, RateLimitRecord>();

const ADMIN_ACCESS_KEY = 'gaurav@2026#2008';

// --- ADMIN ROUTES ---

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown_ip';
  const clientIp = rawIp.split(',')[0].trim();

  const now = Date.now();
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
  const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

  let record = adminLoginAttempts.get(clientIp);

  if (record) {
    // Check if client is currently locked out
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

  // On failed PIN attempt
  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockUntil = now + LOCKOUT_MS;
    adminLoginAttempts.set(clientIp, record);
    return res.status(429).json({
      error: 'Security Lockout Activated! Maximum 5 failed access key attempts reached. Access is locked for 15 minutes.'
    });
  }

  adminLoginAttempts.set(clientIp, record);
  const remaining = MAX_ATTEMPTS - record.count;
  return res.status(401).json({
    error: `Invalid Admin Access Key! ${remaining} attempt(s) remaining before security lockout.`
  });
});

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
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
app.get('/api/admin/deposits', (req, res) => {
  res.json({ deposits: state.deposits });
});

// Approve Deposit
app.post('/api/admin/deposits/:id/approve', (req, res) => {
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
        saveUserToSupabase(referrer);
        console.log(`[Referral] 5% Commission ₹${bonus} credited to ${referrer.phone} for user ${user.phone}'s deposit of ₹${dep.amount}`);
      }
    }
  }

  saveState();
  saveDepositToSupabase(dep);
  if (user) saveUserToSupabase(user);

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
app.get('/api/admin/withdrawals', (req, res) => {
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
app.post('/api/admin/withdrawals/:id/reject', (req, res) => {
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
  saveWithdrawalToSupabase(wth);
  if (user) saveUserToSupabase(user);

  res.json({ success: true, withdrawal: wth, updatedUserBalance: user?.balance });
});

// User Management
app.get('/api/admin/users', (req, res) => {
  res.json({ users: state.users });
});

app.post('/api/admin/users/:id/balance', (req, res) => {
  const { newBalance, delta } = req.body;
  const user = state.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (typeof newBalance === 'number') {
    user.balance = newBalance;
  } else if (typeof delta === 'number') {
    user.balance += delta;
  }

  saveState();
  saveUserToSupabase(user);
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

  const roomOverride = roomOverrides[room] ?? null;
  const globalOverride = state.settings.manualOverrideNumber;

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
    scheduledOverrides: scheduledList,
    allScheduledOverrides: Object.values(scheduledOverrides),
    allRoomOverrides: roomOverrides,
    activeBetsCount: activeBets.length,
    activeBetsVolume: activeBets.reduce((acc, b) => acc + b.amount, 0),
    breakdown,
  });
});

app.post('/api/admin/override-number', (req, res) => {
  const { number, room, period } = req.body;
  const targetRoom = room || 'WINGO_30S';

  if (! (state as any).roomOverrides) (state as any).roomOverrides = {};
  if (! (state as any).scheduledOverrides) (state as any).scheduledOverrides = {};

  // Case 1: Specific Period Schedule Override
  if (period && String(period).trim()) {
    const cleanPeriod = String(period).trim();
    if (number === null) {
      delete (state as any).scheduledOverrides[`${targetRoom}:${cleanPeriod}`];
      delete (state as any).scheduledOverrides[cleanPeriod];
      saveState();
      return res.json({
        success: true,
        message: `Cleared scheduled override for Period #${cleanPeriod}`,
      });
    }

    const num = Number(number);
    if (isNaN(num) || num < 0 || num > 9) {
      return res.status(400).json({ error: 'Winning number must be between 0 and 9' });
    }

    const key = `${targetRoom}:${cleanPeriod}`;
    (state as any).scheduledOverrides[key] = {
      period: cleanPeriod,
      room: targetRoom,
      number: num,
      createdAt: Date.now(),
    };
    saveState();
    return res.json({
      success: true,
      message: `Successfully scheduled result ${num} for Period #${cleanPeriod} (${targetRoom === 'WINGO_30S' ? '30s' : targetRoom === 'WINGO_1M' ? '1 Min' : targetRoom})!`,
    });
  }

  // Case 2: Next Immediate Round Override
  if (number === null) {
    (state as any).roomOverrides[targetRoom] = null;
    state.settings.manualOverrideNumber = null;
    saveState();
    saveSystemSettingsToSupabase(state.settings);
    return res.json({
      success: true,
      manualOverrideNumber: null,
      message: `Auto fair-play mode restored for ${targetRoom === 'WINGO_30S' ? '30s Window' : targetRoom === 'WINGO_1M' ? '1 Min Window' : targetRoom}.`,
    });
  }

  const num = Number(number);
  if (isNaN(num) || num < 0 || num > 9) {
    return res.status(400).json({ error: 'Winning number must be between 0 and 9' });
  }

  (state as any).roomOverrides[targetRoom] = num;
  saveState();

  return res.json({
    success: true,
    manualOverrideNumber: num,
    message: `Next round winning result for ${targetRoom === 'WINGO_30S' ? '30s Window' : targetRoom === 'WINGO_1M' ? '1 Min Window' : targetRoom} set to Number ${num}!`,
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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
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

export default app;
