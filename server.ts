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
const PORT = 3000;

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

// Security: Global Rate Limiter to prevent DDoS flooding attacks
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many requests from this IP, please try again in 15 minutes.' },
});

// Security: Auth Rate Limiter against Brute-Force attack vectors
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

// Security: Transaction Rate Limiter for Bets, Deposits, and Withdrawals
const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
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

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
}

// Default initial state
let state: AppState = {
  users: [
    {
      id: 'usr_demo',
      phone: '9876543210',
      name: 'Player One',
      balance: 1000,
      isAdmin: false,
      createdAt: Date.now(),
    },
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
  deposits: [
    {
      id: 'dep_sample_1',
      userId: 'usr_demo',
      userName: 'Player One',
      userPhone: '9876543210',
      amount: 500,
      utr: '421598201934',
      status: 'APPROVED',
      paymentMethod: 'UPI',
      createdAt: Date.now() - 3600000,
      processedAt: Date.now() - 3500000,
    }
  ],
  withdrawals: [],
  settings: {
    upiId: 'colorwin.pay@upi',
    upiName: 'ColorWin Official Payments',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=colorwin.pay@upi&pn=ColorWin',
    minDeposit: 500,
    maxDeposit: 5000,
    minWithdrawal: 300,
    maxWithdrawal: 300000,
    manualOverrideNumber: null,
  },
};

// Load saved local data if available
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    state = { ...state, ...parsed };
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
    // Keep max 1000 rounds and max 3000 bets in memory/file
    if (state.rounds.length > 1000) {
      state.rounds = state.rounds.slice(0, 1000);
    }
    if (state.bets.length > 3000) {
      state.bets = state.bets.slice(0, 3000);
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
  if (room === 'WINGO_3M' || room === 'SAPRE') return 180;
  if (room === 'WINGO_5M' || room === 'BCONE') return 300;
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

// Round completion check loop (runs every 1 second)
setInterval(() => {
  const rooms = ['WINGO_30S', 'WINGO_1M', 'WINGO_3M', 'WINGO_5M'];
  for (const r of rooms) {
    const { period, secondsRemaining, duration } = getActivePeriod(r);
    if (secondsRemaining === duration && lastProcessedMap[r] !== period) {
      const prevPeriod = getPreviousPeriodStr(period);
      if (!state.rounds.some(rd => rd.period === prevPeriod && rd.room === (r as RoomType))) {
        processRoundResult(prevPeriod, r as RoomType);
        lastProcessedMap[r] = period;
      }
    }
  }
}, 1000);

function getPreviousPeriodStr(currentPeriodStr: string): string {
  const num = parseInt(currentPeriodStr, 10);
  if (!isNaN(num) && num > 100000) {
    return String(num - 1);
  }
  return currentPeriodStr;
}

function processRoundResult(period: string, room: RoomType = 'WINGO_30S') {
  // Determine winning number
  let winningNum: number;
  if (state.settings.manualOverrideNumber !== null && state.settings.manualOverrideNumber >= 0 && state.settings.manualOverrideNumber <= 9) {
    winningNum = state.settings.manualOverrideNumber;
    state.settings.manualOverrideNumber = null; // reset override after use
  } else {
    winningNum = Math.floor(Math.random() * 10);
  }

  let colors: ('GREEN' | 'RED' | 'VIOLET')[] = [];
  if (winningNum === 0) colors = ['RED', 'VIOLET'];
  else if (winningNum === 5) colors = ['GREEN', 'VIOLET'];
  else if ([1, 3, 7, 9].includes(winningNum)) colors = ['GREEN'];
  else colors = ['RED'];

  const bigSmall = winningNum >= 5 ? 'BIG' : 'SMALL';
  const seedHash = crypto.createHash('sha256').update(`${period}-${room}-FAIRPLAY-${winningNum}`).digest('hex');

  // Filter bets for this round
  const roundBets = state.bets.filter(b => b.period === period || (b.room === room && b.status === 'PENDING'));
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
app.post('/api/auth/login', (req, res) => {
  const cleanPhone = sanitizePhone(req.body.phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Valid mobile number required' });
  }

  let user = state.users.find(u => u.phone === cleanPhone);
  if (!user) {
    // Auto register for smooth experience with ₹100 trial bonus
    user = {
      id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      phone: cleanPhone,
      name: `Player_${cleanPhone.slice(-4)}`,
      balance: 100, // ₹100 trial bonus
      isAdmin: cleanPhone === '9999999999',
      createdAt: Date.now(),
    };
    state.users.push(user);
    saveState();
    saveUserToSupabase(user);
  }

  res.json({ user });
});

app.post('/api/auth/register', (req, res) => {
  const cleanPhone = sanitizePhone(req.body.phone);
  const cleanName = sanitizeInput(req.body.name);

  if (!cleanPhone || cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });
  }

  let existing = state.users.find(u => u.phone === cleanPhone);
  if (existing) {
    return res.json({ user: existing });
  }

  const newUser: User = {
    id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    phone: cleanPhone,
    name: cleanName || `Player_${cleanPhone.slice(-4)}`,
    balance: 100, // ₹100 trial welcome bonus
    isAdmin: cleanPhone === '9999999999',
    createdAt: Date.now(),
  };

  state.users.push(newUser);
  saveState();
  saveUserToSupabase(newUser);
  res.json({ user: newUser });
});

app.get('/api/auth/user/:id', (req, res) => {
  const user = state.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
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

  // Check if user has deposited at least ₹100 before withdrawing
  const userApprovedDeposits = state.deposits.filter(d => (d.userId === userId || d.userPhone === user.phone) && d.status === 'APPROVED');
  const totalDeposits = userApprovedDeposits.reduce((sum, d) => sum + d.amount, 0);

  if (totalDeposits < 100) {
    return res.status(400).json({
      error: 'Withdrawal Locked: You need to make a minimum deposit of at least ₹100 before sending a withdrawal request. (Note: Currently minimum available deposit option is ₹500).'
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

// --- ADMIN ROUTES ---

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (pin === 'admin123' || pin === '888888') {
    return res.json({ success: true, token: 'admin_session_valid' });
  }
  res.status(401).json({ error: 'Invalid Admin PIN! Default PIN is admin123' });
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

// List Withdrawals for Admin
app.get('/api/admin/withdrawals', (req, res) => {
  res.json({ withdrawals: state.withdrawals });
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
app.post('/api/admin/override-number', (req, res) => {
  const { number } = req.body; // 0..9 or null
  if (number === null || (typeof number === 'number' && number >= 0 && number <= 9)) {
    state.settings.manualOverrideNumber = number;
    saveState();
    saveSystemSettingsToSupabase(state.settings);
    return res.json({
      success: true,
      manualOverrideNumber: state.settings.manualOverrideNumber,
      message: number === null ? 'Auto fair-play random mode restored.' : `Next round result manually set to number ${number}!`,
    });
  }
  res.status(400).json({ error: 'Number must be between 0 and 9' });
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

// Update Admin Settings
app.post('/api/admin/settings', (req, res) => {
  const { upiId, upiName, minDeposit, maxDeposit, minWithdrawal, maxWithdrawal } = req.body;

  if (upiId) state.settings.upiId = upiId;
  if (upiName) state.settings.upiName = upiName;
  if (typeof minDeposit === 'number') state.settings.minDeposit = minDeposit;
  if (typeof maxDeposit === 'number') state.settings.maxDeposit = maxDeposit;
  if (typeof minWithdrawal === 'number') state.settings.minWithdrawal = minWithdrawal;
  if (typeof maxWithdrawal === 'number') state.settings.maxWithdrawal = maxWithdrawal;

  state.settings.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(state.settings.upiId)}&pn=${encodeURIComponent(state.settings.upiName)}`;

  saveState();
  saveSystemSettingsToSupabase(state.settings);
  res.json({ success: true, settings: state.settings });
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

startServer();
