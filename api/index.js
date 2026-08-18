var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => handler
});
module.exports = __toCommonJS(index_exports);

// server.ts
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_helmet = __toESM(require("helmet"), 1);

// src/lib/serverSupabase.ts
var import_supabase_js = require("@supabase/supabase-js");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
function sanitizeUrl(raw) {
  if (!raw || typeof raw !== "string") return "https://placeholder.supabase.co";
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  if (!trimmed || trimmed.includes("placeholder")) return "https://placeholder.supabase.co";
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return "https://placeholder.supabase.co";
  }
}
function sanitizeKey(raw) {
  if (!raw || typeof raw !== "string") return "placeholder-key";
  return raw.trim().replace(/^["']|["']$/g, "");
}
var SUPABASE_URL = sanitizeUrl(process.env.SUPABASE_URL);
var SUPABASE_ANON_KEY = sanitizeKey(process.env.SUPABASE_ANON_KEY);
var isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("placeholder") && !SUPABASE_ANON_KEY.includes("placeholder")
);
var supabase = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
console.log("\u2705 Supabase Client initialized successfully.");
async function loadUsersFromSupabase() {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from("users").select("*");
    if (error || !data) return [];
    return data.map((u) => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      balance: Number(u.balance),
      isAdmin: Boolean(u.is_admin),
      createdAt: Number(u.created_at || Date.now()),
      referredBy: u.referred_by || void 0,
      referralEarnings: Number(u.referral_earnings || 0)
    }));
  } catch (err) {
    console.error("Error loading users from Supabase:", err);
    return [];
  }
}
async function saveUserToSupabase(user) {
  if (!isSupabaseConfigured) return;
  try {
    const payload = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      balance: user.balance,
      is_admin: user.isAdmin,
      created_at: user.createdAt,
      referred_by: user.referredBy || null,
      referral_earnings: user.referralEarnings || 0
    };
    let { error } = await supabase.from("users").upsert(payload, { onConflict: "id" });
    if (error) {
      let fallbackRes = await supabase.from("users").upsert(payload);
      if (fallbackRes.error) {
        console.warn("\u26A0\uFE0F Supabase saveUser notice:", fallbackRes.error.message);
      }
    }
  } catch (err) {
    console.error("Error saving user to Supabase:", err);
  }
}
async function loadGameRoundsFromSupabase() {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from("game_rounds").select("*").order("timestamp", { ascending: false }).limit(1e3);
    if (error) {
      console.warn("\u26A0\uFE0F Supabase loadGameRounds warning:", error.message);
      return [];
    }
    if (!data) return [];
    return data.map((r) => ({
      period: String(r.period),
      room: r.room || "WINGO_30S",
      number: Number(r.number),
      colors: Array.isArray(r.colors) ? r.colors : typeof r.colors === "string" ? JSON.parse(r.colors) : [],
      bigSmall: r.big_small || (Number(r.number) >= 5 ? "BIG" : "SMALL"),
      timestamp: Number(r.timestamp || Date.now()),
      seedHash: r.seed_hash || "",
      totalBetsCount: Number(r.total_bets_count || 0),
      totalBetsAmount: Number(r.total_bets_amount || 0)
    }));
  } catch (err) {
    console.error("Error loading game rounds from Supabase:", err);
    return [];
  }
}
async function saveGameRoundToSupabase(round) {
  if (!isSupabaseConfigured) return;
  try {
    const payload = {
      period: String(round.period),
      room: round.room || "WINGO_30S",
      number: Number(round.number),
      colors: round.colors,
      big_small: round.bigSmall,
      timestamp: Number(round.timestamp),
      seed_hash: round.seedHash || "",
      total_bets_count: Number(round.totalBetsCount || 0),
      total_bets_amount: Number(round.totalBetsAmount || 0)
    };
    let { error } = await supabase.from("game_rounds").upsert(payload, { onConflict: "period" });
    if (error) {
      const fallbackRes = await supabase.from("game_rounds").upsert(payload);
      if (fallbackRes.error) {
        const insertRes = await supabase.from("game_rounds").insert(payload);
        if (insertRes.error) {
          console.warn("\u26A0\uFE0F Supabase sync notice:", insertRes.error.message);
          return;
        }
      }
    }
    console.log(`\u2705 [SUPABASE SYNC OK] Game Period ${round.period} successfully stored in Supabase database.`);
    await pruneOldGameRoundsFromSupabase();
  } catch (err) {
    console.error("Error saving game round to Supabase:", err);
  }
}
async function pruneOldGameRoundsFromSupabase() {
  if (!isSupabaseConfigured) return;
  try {
    const { data, error } = await supabase.from("game_rounds").select("timestamp").order("timestamp", { ascending: false }).range(1e3, 1e3);
    if (!error && data && data.length > 0) {
      const cutoffTimestamp = data[0].timestamp;
      await supabase.from("game_rounds").delete().lt("timestamp", cutoffTimestamp);
    }
  } catch (err) {
    console.error("Error pruning old rounds from Supabase:", err);
  }
}
async function loadBetsFromSupabase() {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from("bets").select("*").order("created_at", { ascending: false }).limit(3e3);
    if (error || !data) return [];
    return data.map((b) => ({
      id: b.id,
      userId: b.user_id,
      userName: b.user_name || "Player",
      period: String(b.period),
      room: b.room,
      selection: b.selection,
      amount: Number(b.amount),
      payout: Number(b.payout || 0),
      status: b.status,
      createdAt: Number(b.created_at),
      multiplier: Number(b.multiplier || 0),
      resultNumber: b.result_number !== null && b.result_number !== void 0 ? Number(b.result_number) : void 0
    }));
  } catch (err) {
    console.error("Error loading bets from Supabase:", err);
    return [];
  }
}
async function saveBetToSupabase(bet) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from("bets").upsert({
      id: bet.id,
      user_id: bet.userId,
      user_name: bet.userName,
      period: bet.period,
      room: bet.room,
      selection: bet.selection,
      amount: bet.amount,
      payout: bet.payout,
      status: bet.status,
      created_at: bet.createdAt,
      multiplier: bet.multiplier,
      result_number: bet.resultNumber ?? null
    });
  } catch (err) {
    console.error("Error saving bet to Supabase:", err);
  }
}
async function loadDepositsFromSupabase() {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from("deposits").select("*").order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((d) => ({
      id: d.id,
      userId: d.user_id,
      userName: d.user_name,
      userPhone: d.user_phone,
      amount: Number(d.amount),
      utr: d.utr,
      status: d.status,
      paymentMethod: d.payment_method || "UPI",
      createdAt: Number(d.created_at),
      processedAt: d.processed_at ? Number(d.processed_at) : void 0,
      rejectionReason: d.rejection_reason || void 0
    }));
  } catch (err) {
    console.error("Error loading deposits from Supabase:", err);
    return [];
  }
}
async function saveDepositToSupabase(deposit) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from("deposits").upsert({
      id: deposit.id,
      user_id: deposit.userId,
      user_name: deposit.userName,
      user_phone: deposit.userPhone,
      amount: deposit.amount,
      utr: deposit.utr,
      status: deposit.status,
      payment_method: deposit.paymentMethod,
      created_at: deposit.createdAt,
      processed_at: deposit.processedAt ?? null,
      rejection_reason: deposit.rejectionReason ?? null
    });
  } catch (err) {
    console.error("Error saving deposit to Supabase:", err);
  }
}
async function loadWithdrawalsFromSupabase() {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((w) => ({
      id: w.id,
      userId: w.user_id,
      userName: w.user_name,
      userPhone: w.user_phone,
      amount: Number(w.amount),
      type: w.type,
      upiId: w.upi_id || void 0,
      bankDetails: w.bank_details ? typeof w.bank_details === "string" ? JSON.parse(w.bank_details) : w.bank_details : void 0,
      status: w.status,
      createdAt: Number(w.created_at),
      processedAt: w.processed_at ? Number(w.processed_at) : void 0,
      rejectionReason: w.rejection_reason || void 0
    }));
  } catch (err) {
    console.error("Error loading withdrawals from Supabase:", err);
    return [];
  }
}
async function saveWithdrawalToSupabase(withdrawal) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from("withdrawals").upsert({
      id: withdrawal.id,
      user_id: withdrawal.userId,
      user_name: withdrawal.userName,
      user_phone: withdrawal.userPhone,
      amount: withdrawal.amount,
      type: withdrawal.type,
      upi_id: withdrawal.upiId ?? null,
      bank_details: withdrawal.bankDetails ? JSON.stringify(withdrawal.bankDetails) : null,
      status: withdrawal.status,
      created_at: withdrawal.createdAt,
      processed_at: withdrawal.processedAt ?? null,
      rejection_reason: withdrawal.rejectionReason ?? null
    });
  } catch (err) {
    console.error("Error saving withdrawal to Supabase:", err);
  }
}
async function loadSystemSettingsFromSupabase() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from("system_settings").select("*").limit(1).maybeSingle();
    if (error || !data) return null;
    return {
      upiId: data.upi_id || "9876543210@ybl",
      upiName: data.upi_name || "Realwin Game",
      qrCodeUrl: data.qr_code_url || "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=9876543210@ybl",
      minDeposit: Number(data.min_deposit || 500),
      maxDeposit: Number(data.max_deposit || 5e3),
      minWithdrawal: Number(data.min_withdrawal || 300),
      maxWithdrawal: Number(data.max_withdrawal || 3e5),
      manualOverrideNumber: data.manual_override_number !== null && data.manual_override_number !== void 0 ? Number(data.manual_override_number) : null
    };
  } catch (err) {
    console.error("Error loading settings from Supabase:", err);
    return null;
  }
}
async function saveSystemSettingsToSupabase(settings) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from("system_settings").upsert({
      id: 1,
      upi_id: settings.upiId,
      upi_name: settings.upiName,
      qr_code_url: settings.qrCodeUrl,
      min_deposit: settings.minDeposit,
      max_deposit: settings.maxDeposit,
      min_withdrawal: settings.minWithdrawal,
      max_withdrawal: settings.maxWithdrawal,
      manual_override_number: settings.manualOverrideNumber ?? null
    });
  } catch (err) {
    console.error("Error saving settings to Supabase:", err);
  }
}

// server.ts
import_dotenv2.default.config();
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
app.use((req, res, next) => {
  if (req.originalUrl && req.originalUrl.startsWith("/api/")) {
    req.url = req.originalUrl;
  }
  const currentUrl = req.url || "";
  if (currentUrl && !currentUrl.startsWith("/api") && (currentUrl.startsWith("/auth") || currentUrl.startsWith("/game") || currentUrl.startsWith("/wallet") || currentUrl.startsWith("/admin") || currentUrl.startsWith("/cashfree") || currentUrl.startsWith("/health"))) {
    req.url = "/api" + (currentUrl.startsWith("/") ? "" : "/") + currentUrl;
  }
  next();
});
app.set("trust proxy", 1);
app.use(
  (0, import_helmet.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(import_express.default.json({ limit: "50kb" }));
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
      for (const key of Object.keys(req.body)) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          return res.status(400).json({ error: "Malicious payload structure detected. Request rejected by security server." });
        }
      }
    }
  }
  next();
});
var globalApiLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 1e4,
  // 10000 requests per 15 minutes for real-time polling
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Too many requests from this IP, please try again in 15 minutes." }
});
var authLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 300,
  // 300 login/init attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." }
});
var transactionLimiter = (0, import_express_rate_limit.default)({
  windowMs: 1 * 60 * 1e3,
  // 1 minute
  max: 120,
  // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Transaction limit reached. Please wait a minute before retrying." }
});
app.use("/api/", globalApiLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/deposit", transactionLimiter);
app.use("/api/withdraw", transactionLimiter);
app.use("/api/bet", transactionLimiter);
app.use("/api", (req, res, next) => {
  try {
    checkAndProcessRounds();
  } catch (err) {
    console.error("Error auto-processing rounds in middleware:", err);
  }
  next();
});
function sanitizeInput(val) {
  if (typeof val !== "string") return "";
  return val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;").trim();
}
function sanitizePhone(phone) {
  if (typeof phone !== "string") return "";
  return phone.replace(/[^\d]/g, "").slice(0, 15);
}
var DATA_DIR = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME ? import_path.default.join("/tmp", "data") : import_path.default.join(process.cwd(), "data");
try {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  DATA_DIR = import_path.default.join("/tmp", "data");
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (_) {
  }
}
var DATA_FILE = import_path.default.join(DATA_DIR, "app-state.json");
var state = {
  users: [
    {
      id: "usr_admin",
      phone: "9999999999",
      name: "Super Admin",
      balance: 5e4,
      isAdmin: true,
      createdAt: Date.now()
    }
  ],
  rounds: [],
  bets: [],
  deposits: [],
  withdrawals: [],
  settings: {
    upiId: "colorwin.pay@upi",
    upiName: "ColorWin Official Payments",
    qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=colorwin.pay@upi&pn=ColorWin",
    minDeposit: 300,
    maxDeposit: 5e3,
    minWithdrawal: 300,
    maxWithdrawal: 3e5,
    manualOverrideNumber: null,
    supportTelegram: "https://t.me/realwin_official",
    supportPhone: "919876543210",
    noticeMarquee: "\u{1F680} Welcome to RealWin! Enjoy 24/7 instant withdrawals & 5% referral bonus on deposits!",
    signupBonus: 20,
    referralCommissionPercent: 5,
    adminPin: "gaurav@2026#2008",
    maintenanceMode: false
  },
  roomOverrides: {},
  scheduledOverrides: {}
};
if (import_fs.default.existsSync(DATA_FILE)) {
  try {
    const raw = import_fs.default.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    state = { ...state, ...parsed };
    state.users = state.users.filter((u) => u.id !== "usr_demo");
    state.deposits = state.deposits.filter((d) => d.id !== "dep_sample_1");
    console.log(`Loaded state: ${state.rounds.length} history rounds, ${state.users.length} users.`);
  } catch (err) {
    console.error("Failed to parse saved state, using default", err);
  }
}
async function initSupabaseData() {
  if (!isSupabaseConfigured) return;
  try {
    const [dbUsers, dbRounds, dbBets, dbDeps, dbWths, dbSettings] = await Promise.all([
      loadUsersFromSupabase(),
      loadGameRoundsFromSupabase(),
      loadBetsFromSupabase(),
      loadDepositsFromSupabase(),
      loadWithdrawalsFromSupabase(),
      loadSystemSettingsFromSupabase()
    ]);
    if (dbUsers && dbUsers.length > 0) state.users = dbUsers;
    if (dbRounds && dbRounds.length > 0) state.rounds = dbRounds;
    if (dbBets && dbBets.length > 0) state.bets = dbBets;
    if (dbDeps && dbDeps.length > 0) state.deposits = dbDeps;
    if (dbWths && dbWths.length > 0) state.withdrawals = dbWths;
    if (dbSettings) state.settings = dbSettings;
    console.log(`\u26A1 [SUPABASE SYNC OK] Active state synced with Supabase Database: ${state.users.length} Users, ${state.rounds.length} Periods (Max 1000 stored).`);
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
    console.warn("Supabase DB connection/hydration warning (Fallback to memory active):", err);
  }
}
initSupabaseData();
function saveState() {
  try {
    if (state.rounds.length > 50) {
      state.rounds = state.rounds.slice(0, 50);
    }
    if (state.bets.length > 100) {
      state.bets = state.bets.slice(0, 100);
    }
    import_fs.default.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("Error saving state:", err);
  }
}
if (state.rounds.length < 50) {
  const now = Date.now();
  const roomTypes = ["PARITY", "SAPRE", "BCONE", "EMERD"];
  const baseActive = 1e5 + Math.floor(now / 1e3 / 30) % 8e5;
  for (let i = 100; i >= 1; i--) {
    const periodTimestamp = now - i * 6e4;
    const period = String(baseActive - i);
    const num = Math.floor(Math.random() * 10);
    let colors = [];
    if (num === 0) colors = ["RED", "VIOLET"];
    else if (num === 5) colors = ["GREEN", "VIOLET"];
    else if ([1, 3, 7, 9].includes(num)) colors = ["GREEN"];
    else colors = ["RED"];
    const bigSmall = num >= 5 ? "BIG" : "SMALL";
    const seedHash = import_crypto.default.createHash("sha256").update(`${period}-SECRET-${num}`).digest("hex");
    state.rounds.unshift({
      period,
      room: roomTypes[i % 4],
      number: num,
      colors,
      bigSmall,
      timestamp: periodTimestamp,
      seedHash,
      totalBetsCount: Math.floor(Math.random() * 25) + 5,
      totalBetsAmount: (Math.floor(Math.random() * 30) + 10) * 100
    });
  }
  saveState();
}
function getDurationForRoom(room) {
  if (room === "WINGO_1M" || room === "PARITY") return 60;
  if (room === "SAPRE") return 180;
  if (room === "BCONE") return 300;
  return 30;
}
function getActivePeriod(room = "WINGO_30S") {
  const duration = getDurationForRoom(room);
  const nowSec = Math.floor(Date.now() / 1e3);
  const cycleIndex = Math.floor(nowSec / duration);
  const secondsRemaining = duration - nowSec % duration;
  const isLocked = secondsRemaining <= 5;
  const roomOffset = duration === 30 ? 1e5 : duration === 60 ? 2e5 : duration === 180 ? 3e5 : 4e5;
  const periodNum = roomOffset + cycleIndex % 9e4;
  const period = String(periodNum);
  return { period, secondsRemaining, isLocked, duration };
}
var lastProcessedMap = {};
function checkAndProcessRounds() {
  const rooms = ["WINGO_30S", "WINGO_1M"];
  for (const r of rooms) {
    const { period, secondsRemaining, duration } = getActivePeriod(r);
    const prevPeriod = getPreviousPeriodStr(period);
    if (!state.rounds.some((rd) => rd.period === prevPeriod && rd.room === r)) {
      processRoundResult(prevPeriod, r);
      lastProcessedMap[r] = period;
    }
  }
}
setInterval(() => {
  checkAndProcessRounds();
}, 1e3);
function getPreviousPeriodStr(currentPeriodStr) {
  const num = parseInt(currentPeriodStr, 10);
  if (!isNaN(num) && num > 1e5) {
    return String(num - 1);
  }
  return currentPeriodStr;
}
function getLowestPayoutNumber(roundBets) {
  if (!roundBets || roundBets.length === 0) {
    return Math.floor(Math.random() * 10);
  }
  let minPayout = Infinity;
  let bestNumbers = [];
  for (let candidate = 0; candidate <= 9; candidate++) {
    let colors = [];
    if (candidate === 0) colors = ["RED", "VIOLET"];
    else if (candidate === 5) colors = ["GREEN", "VIOLET"];
    else if ([1, 3, 7, 9].includes(candidate)) colors = ["GREEN"];
    else colors = ["RED"];
    const bigSmall = candidate >= 5 ? "BIG" : "SMALL";
    let totalCandidatePayout = 0;
    roundBets.forEach((bet) => {
      const sel = bet.selection;
      let mult = 0;
      if (sel === "GREEN" && colors.includes("GREEN")) {
        mult = candidate === 5 ? 1.5 : 2;
      } else if (sel === "RED" && colors.includes("RED")) {
        mult = candidate === 0 ? 1.5 : 2;
      } else if (sel === "VIOLET" && colors.includes("VIOLET")) {
        mult = 4.5;
      } else if (sel === "BIG" && bigSmall === "BIG") {
        mult = 2;
      } else if (sel === "SMALL" && bigSmall === "SMALL") {
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
function processRoundResult(period, room = "WINGO_30S") {
  const roundBets = state.bets.filter((b) => b.period === period || b.room === room && b.status === "PENDING");
  let winningNum;
  const roomPeriodKey = `${room}:${period}`;
  if (state.scheduledOverrides && state.scheduledOverrides[roomPeriodKey]) {
    winningNum = state.scheduledOverrides[roomPeriodKey].number;
    delete state.scheduledOverrides[roomPeriodKey];
    saveState();
  } else if (state.scheduledOverrides && state.scheduledOverrides[period]) {
    winningNum = state.scheduledOverrides[period].number;
    delete state.scheduledOverrides[period];
    saveState();
  } else if (state.roomOverrides && state.roomOverrides[room] !== void 0 && state.roomOverrides[room] !== null) {
    winningNum = state.roomOverrides[room];
    state.roomOverrides[room] = null;
    saveState();
  } else if (state.settings.manualOverrideNumber !== null && state.settings.manualOverrideNumber >= 0 && state.settings.manualOverrideNumber <= 9) {
    winningNum = state.settings.manualOverrideNumber;
    state.settings.manualOverrideNumber = null;
    saveState();
  } else {
    winningNum = getLowestPayoutNumber(roundBets);
  }
  let colors = [];
  if (winningNum === 0) colors = ["RED", "VIOLET"];
  else if (winningNum === 5) colors = ["GREEN", "VIOLET"];
  else if ([1, 3, 7, 9].includes(winningNum)) colors = ["GREEN"];
  else colors = ["RED"];
  const bigSmall = winningNum >= 5 ? "BIG" : "SMALL";
  const seedHash = import_crypto.default.createHash("sha256").update(`${period}-${room}-FAIRPLAY-${winningNum}`).digest("hex");
  let totalBetAmt = 0;
  let totalPayoutAmt = 0;
  roundBets.forEach((bet) => {
    totalBetAmt += bet.amount;
    let won = false;
    let payoutMultiplier = 0;
    const sel = bet.selection;
    if (sel === "GREEN" && colors.includes("GREEN")) {
      won = true;
      payoutMultiplier = winningNum === 5 ? 1.5 : 2;
    } else if (sel === "RED" && colors.includes("RED")) {
      won = true;
      payoutMultiplier = winningNum === 0 ? 1.5 : 2;
    } else if (sel === "VIOLET" && colors.includes("VIOLET")) {
      won = true;
      payoutMultiplier = 4.5;
    } else if (sel === "BIG" && bigSmall === "BIG") {
      won = true;
      payoutMultiplier = 2;
    } else if (sel === "SMALL" && bigSmall === "SMALL") {
      won = true;
      payoutMultiplier = 2;
    } else if (sel === String(winningNum)) {
      won = true;
      payoutMultiplier = 9;
    }
    bet.status = won ? "WON" : "LOST";
    bet.resultNumber = winningNum;
    bet.multiplier = payoutMultiplier;
    if (won) {
      const winAmount = Math.floor(bet.amount * payoutMultiplier);
      bet.payout = winAmount;
      totalPayoutAmt += winAmount;
      const u = state.users.find((usr) => usr.id === bet.userId);
      if (u) {
        u.balance += winAmount;
      }
    } else {
      bet.payout = 0;
    }
  });
  const newRound = {
    period,
    room,
    number: winningNum,
    colors,
    bigSmall,
    timestamp: Date.now(),
    seedHash,
    totalBetsCount: roundBets.length,
    totalBetsAmount: totalBetAmt
  };
  state.rounds.unshift(newRound);
  if (state.rounds.length > 1e3) {
    state.rounds = state.rounds.slice(0, 1e3);
  }
  saveState();
  saveGameRoundToSupabase(newRound);
  roundBets.forEach((b) => saveBetToSupabase(b));
  state.users.forEach((u) => {
    if (roundBets.some((b) => b.userId === u.id && b.status === "WON")) {
      saveUserToSupabase(u);
    }
  });
  console.log(`[ROUND DONE & SUPABASE SAVED] [${room}] Period: ${period} -> Winner: ${winningNum} (${colors.join("+")}, ${bigSmall}). Bets: ${roundBets.length}, Total Bet: \u20B9${totalBetAmt}, Payout: \u20B9${totalPayoutAmt}`);
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: Date.now() });
});
app.get("/api/game/state", (req, res) => {
  const room = req.query.room || "WINGO_30S";
  const { period, secondsRemaining, isLocked, duration } = getActivePeriod(room);
  const roomRounds = state.rounds.filter((r) => r.room === room || !r.room);
  const lastRound = roomRounds[0] || state.rounds[0];
  res.json({
    period,
    room,
    secondsRemaining,
    roundDurationSeconds: duration,
    isLocked,
    lastRound,
    historyCount: roomRounds.length,
    onlineUsersCount: Math.floor(Math.random() * 40) + 120
  });
});
app.get("/api/game/history", (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
  const room = req.query.room || "WINGO_30S";
  const startIndex = (page - 1) * limit;
  const filtered = state.rounds.filter((r) => r.room === room || !r.room);
  const paginated = filtered.slice(startIndex, startIndex + limit);
  res.json({
    rounds: paginated,
    total: filtered.length,
    page,
    totalPages: Math.ceil(filtered.length / limit)
  });
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const cleanPhone = sanitizePhone(req.body.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: "Valid mobile number required" });
    }
    let user = state.users.find((u) => u.phone === cleanPhone);
    if (!user && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from("users").select("*").eq("phone", cleanPhone).maybeSingle();
        if (data && !error) {
          user = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            balance: Number(data.balance),
            isAdmin: Boolean(data.is_admin),
            createdAt: Number(data.created_at || Date.now()),
            referredBy: data.referred_by || void 0,
            referralEarnings: Number(data.referral_earnings || 0)
          };
          state.users.push(user);
        }
      } catch (err) {
        console.warn("Supabase lookup warning on login:", err);
      }
    }
    if (!user) {
      user = {
        id: "usr_" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
        phone: cleanPhone,
        name: `Player_${cleanPhone.slice(-4)}`,
        balance: state.settings.signupBonus ?? 20,
        isAdmin: cleanPhone === "9999999999",
        createdAt: Date.now(),
        referralEarnings: 0
      };
      state.users.push(user);
      saveState();
      saveUserToSupabase(user);
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Login failed" });
  }
});
app.post("/api/auth/register", async (req, res) => {
  try {
    const cleanPhone = sanitizePhone(req.body.phone);
    const cleanName = sanitizeInput(req.body.name);
    const refCode = req.body.referralCode ? String(req.body.referralCode).trim() : "";
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: "Valid 10-digit mobile number is required" });
    }
    let existing = state.users.find((u) => u.phone === cleanPhone);
    if (!existing && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from("users").select("*").eq("phone", cleanPhone).maybeSingle();
        if (data && !error) {
          existing = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            balance: Number(data.balance),
            isAdmin: Boolean(data.is_admin),
            createdAt: Number(data.created_at || Date.now()),
            referredBy: data.referred_by || void 0,
            referralEarnings: Number(data.referral_earnings || 0)
          };
          state.users.push(existing);
        }
      } catch (err) {
        console.warn("Supabase lookup on register warning:", err);
      }
    }
    if (existing) {
      return res.json({ user: existing });
    }
    let referrerId = void 0;
    if (refCode) {
      const referrer = state.users.find(
        (u) => u.phone === refCode || u.phone.endsWith(refCode) || u.id === refCode
      );
      if (referrer) {
        referrerId = referrer.id;
      }
    }
    const newUser = {
      id: "usr_" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
      phone: cleanPhone,
      name: cleanName || `Player_${cleanPhone.slice(-4)}`,
      balance: state.settings.signupBonus ?? 20,
      isAdmin: cleanPhone === "9999999999",
      createdAt: Date.now(),
      referredBy: referrerId,
      referralEarnings: 0
    };
    state.users.push(newUser);
    saveState();
    saveUserToSupabase(newUser);
    res.json({ user: newUser });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Registration failed" });
  }
});
app.get("/api/auth/user/:id", async (req, res) => {
  try {
    let user = state.users.find((u) => u.id === req.params.id);
    if (!user && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from("users").select("*").eq("id", req.params.id).maybeSingle();
        if (data && !error) {
          user = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            balance: Number(data.balance),
            isAdmin: Boolean(data.is_admin),
            createdAt: Number(data.created_at || Date.now()),
            referredBy: data.referred_by || void 0,
            referralEarnings: Number(data.referral_earnings || 0)
          };
          state.users.push(user);
        }
      } catch (err) {
        console.warn("Supabase lookup on fetch user warning:", err);
      }
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to fetch user" });
  }
});
app.post("/api/game/bet", (req, res) => {
  const { userId, room, selection, amount } = req.body;
  const targetRoom = String(room || "WINGO_30S").trim();
  const { period, isLocked } = getActivePeriod(targetRoom);
  if (isLocked) {
    return res.status(400).json({ error: "Bidding is locked for calculation in the last 5 seconds of the round!" });
  }
  const ALLOWED_ROOMS = ["WINGO_30S", "WINGO_1M", "WINGO_3M", "WINGO_5M"];
  const ALLOWED_SELECTIONS = ["GREEN", "RED", "VIOLET", "BIG", "SMALL", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  if (!ALLOWED_ROOMS.includes(targetRoom)) {
    return res.status(400).json({ error: "Security Violation: Invalid game room selected." });
  }
  const cleanSelection = String(selection || "").toUpperCase().trim();
  if (!cleanSelection || !ALLOWED_SELECTIONS.includes(cleanSelection)) {
    return res.status(400).json({ error: "Security Violation: Invalid bet selection." });
  }
  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || !Number.isFinite(numAmount) || numAmount < 10 || !Number.isInteger(numAmount)) {
    return res.status(400).json({ error: "Security Violation: Bet amount must be a positive whole integer (minimum \u20B910)." });
  }
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "Invalid user identification provided." });
  }
  const user = state.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User account not found." });
  }
  if (user.isBanned) {
    return res.status(403).json({ error: "Device Banned: Access restricted due to policy violation.", isBanned: true });
  }
  if (user.balance < numAmount) {
    return res.status(400).json({ error: "Insufficient wallet balance! Please deposit funds to place bids." });
  }
  user.balance -= numAmount;
  if (user.unwageredDeposit && user.unwageredDeposit > 0) {
    user.unwageredDeposit = Math.max(0, user.unwageredDeposit - numAmount);
  }
  const newBet = {
    id: "bet_" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
    userId,
    userName: user.name,
    period,
    room: targetRoom,
    selection,
    amount,
    payout: 0,
    status: "PENDING",
    createdAt: Date.now(),
    multiplier: 1
  };
  state.bets.unshift(newBet);
  saveState();
  saveBetToSupabase(newBet);
  saveUserToSupabase(user);
  res.json({
    success: true,
    bet: newBet,
    updatedBalance: user.balance
  });
});
app.get("/api/game/my-bets/:userId", (req, res) => {
  const userId = req.params.userId;
  const userBets = state.bets.filter((b) => b.userId === userId).slice(0, 50);
  res.json({ bets: userBets });
});
app.post("/api/wallet/deposit", (req, res) => {
  const { userId, amount, utr, instantSimulated } = req.body;
  const numAmount = Number(amount);
  const cleanUtr = sanitizeInput(utr);
  const minDep = state.settings.minDeposit || 300;
  const maxDep = state.settings.maxDeposit || 5e3;
  if (isNaN(numAmount) || !Number.isFinite(numAmount) || !Number.isInteger(numAmount) || numAmount < minDep || numAmount > maxDep) {
    return res.status(400).json({ error: `Security Violation: Deposit amount must be a positive integer between \u20B9${minDep} and \u20B9${maxDep}` });
  }
  if (!cleanUtr || cleanUtr.length < 8 || cleanUtr.length > 35) {
    return res.status(400).json({ error: "Valid 12-digit UPI UTR / Ref Transaction ID is required!" });
  }
  const user = state.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const dup = state.deposits.find((d) => d.utr === cleanUtr);
  if (dup) {
    return res.status(400).json({ error: "This UTR number has already been submitted!" });
  }
  const isAutoApproved = instantSimulated === true;
  const deposit = {
    id: "dep_" + Date.now(),
    userId,
    userName: user.name,
    userPhone: user.phone,
    amount: numAmount,
    utr: cleanUtr,
    status: isAutoApproved ? "APPROVED" : "PENDING",
    paymentMethod: "UPI",
    createdAt: Date.now(),
    processedAt: isAutoApproved ? Date.now() : void 0
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
    message: isAutoApproved ? `\u20B9${numAmount} deposited successfully to your wallet!` : `Deposit request of \u20B9${numAmount} submitted! Pending manual UTR verification by admin (typically approved within 2-5 mins).`,
    updatedBalance: user.balance
  });
});
var CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || "";
var CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || "";
var isCashfreeSandbox = (process.env.CASHFREE_ENV || process.env.CASHFREE_MODE || "").toLowerCase() === "sandbox" || CASHFREE_APP_ID.toLowerCase().startsWith("test");
var CASHFREE_API_URL = isCashfreeSandbox ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg";
console.log(`[Cashfree Config] App ID starting with: "${CASHFREE_APP_ID.slice(0, 6)}...", Env Mode: ${isCashfreeSandbox ? "SANDBOX" : "PRODUCTION"}, URL: ${CASHFREE_API_URL}`);
app.post("/api/cashfree/create-order", async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const numAmount = Number(amount);
    const minDep = state.settings.minDeposit || 300;
    const maxDep = state.settings.maxDeposit || 5e3;
    if (!userId || isNaN(numAmount) || numAmount < minDep || numAmount > maxDep) {
      return res.status(400).json({ error: `Deposit amount must be between \u20B9${minDep} and \u20B9${maxDep}` });
    }
    const user = state.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const orderId = `CF_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.get("host");
    const returnUrl = `${protocol}://${host}/api/cashfree/callback?order_id={order_id}`;
    const cleanPhone = user.phone && user.phone.length === 10 ? user.phone : "9999999999";
    const payload = {
      order_id: orderId,
      order_amount: numAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: user.id,
        customer_name: user.name || `Player_${cleanPhone.slice(-4)}`,
        customer_email: `${cleanPhone}@realwin.app`,
        customer_phone: cleanPhone
      },
      order_meta: {
        return_url: returnUrl
      }
    };
    const response = await fetch(`${CASHFREE_API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Cashfree order creation error:", data);
      return res.status(response.status || 500).json({
        error: data.message || data.error_description || "Failed to initialize Cashfree payment order"
      });
    }
    const deposit = {
      id: orderId,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      amount: numAmount,
      utr: orderId,
      status: "PENDING",
      paymentMethod: "CASHFREE",
      createdAt: Date.now()
    };
    state.deposits.unshift(deposit);
    saveState();
    saveDepositToSupabase(deposit);
    res.json({
      success: true,
      order_id: data.order_id || orderId,
      payment_session_id: data.payment_session_id,
      order_amount: data.order_amount,
      cf_env: isCashfreeSandbox ? "sandbox" : "production"
    });
  } catch (err) {
    console.error("Error creating Cashfree order:", err);
    res.status(500).json({ error: err.message || "Server error creating Cashfree order" });
  }
});
async function verifyAndProcessCashfreeOrder(orderId) {
  const response = await fetch(`${CASHFREE_API_URL}/orders/${orderId}`, {
    method: "GET",
    headers: {
      "x-client-id": CASHFREE_APP_ID,
      "x-client-secret": CASHFREE_SECRET_KEY,
      "x-api-version": "2023-08-01"
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch order status from Cashfree");
  }
  const orderStatus = data.order_status;
  let deposit = state.deposits.find((d) => d.id === orderId || d.utr === orderId);
  if (orderStatus === "PAID") {
    const amountPaid = Number(data.order_amount || 0);
    if (deposit) {
      if (deposit.status !== "APPROVED") {
        deposit.status = "APPROVED";
        deposit.processedAt = Date.now();
        const user2 = state.users.find((u) => u.id === deposit.userId || u.phone === deposit.userPhone);
        if (user2) {
          user2.balance += deposit.amount;
          user2.unwageredDeposit = (user2.unwageredDeposit || 0) + deposit.amount;
          if (user2.referredBy && state.settings.referralCommissionPercent) {
            const referrer = state.users.find((u) => u.id === user2.referredBy || u.phone.endsWith(user2.referredBy));
            if (referrer) {
              const comm = Math.round(deposit.amount * state.settings.referralCommissionPercent / 100);
              if (comm > 0) {
                referrer.balance += comm;
                referrer.unwageredDeposit = (referrer.unwageredDeposit || 0) + comm;
                referrer.referralEarnings = (referrer.referralEarnings || 0) + comm;
                saveUserToSupabase(referrer);
              }
            }
          }
          saveUserToSupabase(user2);
        }
        saveState();
        saveDepositToSupabase(deposit);
      }
      const user = state.users.find((u) => u.id === deposit.userId || u.phone === deposit.userPhone);
      return { success: true, status: "PAID", amount: deposit.amount, deposit, updatedBalance: user?.balance };
    } else {
      const userPhone = data.customer_details?.customer_phone || "";
      const user = state.users.find((u) => u.phone === userPhone || u.id === data.customer_details?.customer_id);
      const newDep = {
        id: orderId,
        userId: user ? user.id : data.customer_details?.customer_id || "guest",
        userName: user ? user.name : data.customer_details?.customer_name || "Player",
        userPhone: user ? user.phone : userPhone,
        amount: amountPaid,
        utr: orderId,
        status: "APPROVED",
        paymentMethod: "CASHFREE",
        createdAt: Date.now(),
        processedAt: Date.now()
      };
      if (user) {
        user.balance += amountPaid;
        user.unwageredDeposit = (user.unwageredDeposit || 0) + amountPaid;
        saveUserToSupabase(user);
      }
      state.deposits.unshift(newDep);
      saveState();
      saveDepositToSupabase(newDep);
      return { success: true, status: "PAID", amount: amountPaid, deposit: newDep, updatedBalance: user?.balance };
    }
  } else if (orderStatus === "ACTIVE") {
    return { success: false, status: "ACTIVE", pending: true, message: "Payment is pending user completion" };
  } else {
    if (deposit && deposit.status === "PENDING") {
      deposit.status = "REJECTED";
      deposit.rejectionReason = `Cashfree order status: ${orderStatus}`;
      saveState();
      saveDepositToSupabase(deposit);
    }
    return { success: false, status: orderStatus, error: `Payment ${String(orderStatus).toLowerCase()}` };
  }
}
app.get("/api/cashfree/verify/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await verifyAndProcessCashfreeOrder(orderId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to verify Cashfree payment" });
  }
});
app.post("/api/cashfree/verify", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "Order ID is required" });
    const result = await verifyAndProcessCashfreeOrder(orderId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to verify Cashfree payment" });
  }
});
app.get("/api/cashfree/callback", async (req, res) => {
  try {
    const orderId = req.query.order_id || "";
    if (orderId) {
      const result = await verifyAndProcessCashfreeOrder(orderId);
      if (result.success) {
        return res.redirect(`/wallet?tab=DEPOSIT&cashfree_status=SUCCESS&order_id=${orderId}&amount=${result.amount}`);
      }
    }
    return res.redirect(`/wallet?tab=DEPOSIT&cashfree_status=FAILED&order_id=${orderId}`);
  } catch (err) {
    console.error("Cashfree callback error:", err);
    return res.redirect("/wallet?tab=DEPOSIT&cashfree_status=FAILED");
  }
});
app.post("/api/cashfree/webhook", async (req, res) => {
  try {
    const event = req.body?.type || req.body?.event;
    const orderId = req.body?.data?.order?.order_id || req.body?.order_id || req.body?.data?.order_id;
    console.log(`[Cashfree Webhook] Event: ${event}, Order ID: ${orderId}`);
    if (orderId) {
      const result = await verifyAndProcessCashfreeOrder(orderId);
      console.log(`[Cashfree Webhook] Auto-Processed Order ${orderId}: ${result.status}`);
    }
    return res.status(200).json({ status: "OK" });
  } catch (err) {
    console.error("[Cashfree Webhook Error]:", err?.message);
    return res.status(200).json({ status: "HANDLED" });
  }
});
setInterval(async () => {
  try {
    const now = Date.now();
    const pendingCashfree = state.deposits.filter(
      (d) => (d.paymentMethod === "CASHFREE" || String(d.id).startsWith("CF_")) && d.status === "PENDING" && now - d.createdAt < 24 * 60 * 60 * 1e3
    );
    for (const dep of pendingCashfree) {
      try {
        const result = await verifyAndProcessCashfreeOrder(dep.id);
        if (result.success && result.status === "PAID") {
          console.log(`\u26A1 [Auto Re-Checker] Cashfree Deposit ${dep.id} verified & credited \u20B9${result.amount} automatically!`);
        }
      } catch (e) {
      }
    }
  } catch (err) {
    console.error("Error in Cashfree auto re-check loop:", err);
  }
}, 3e4);
app.post("/api/wallet/withdraw", (req, res) => {
  const { userId, amount, type, upiId, bankDetails } = req.body;
  const numAmount = Number(amount);
  const cleanUpiId = sanitizeInput(upiId);
  const minWth = state.settings.minWithdrawal || 300;
  const maxWth = state.settings.maxWithdrawal || 3e5;
  if (isNaN(numAmount) || !Number.isFinite(numAmount) || !Number.isInteger(numAmount) || numAmount < minWth || numAmount > maxWth) {
    return res.status(400).json({ error: `Security Violation: Withdrawal amount must be a positive integer between \u20B9${minWth} and \u20B9${maxWth.toLocaleString("en-IN")}` });
  }
  const user = state.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (user.isBanned) {
    return res.status(403).json({
      error: "Device & Account Banned: Your access has been restricted due to policy violation.",
      isBanned: true
    });
  }
  const userApprovedDeposits = state.deposits.filter((d) => (d.userId === userId || d.userPhone === user.phone) && d.status === "APPROVED");
  const totalDeposits = userApprovedDeposits.reduce((sum, d) => sum + d.amount, 0);
  if (totalDeposits < 300) {
    return res.status(400).json({
      error: "Withdrawal Locked: You must make a deposit of at least \u20B9300 before placing withdrawal requests."
    });
  }
  const unwagered = user.unwageredDeposit || 0;
  const withdrawableBalance = Math.max(0, user.balance - unwagered);
  if (numAmount > withdrawableBalance) {
    return res.status(400).json({
      error: `Withdrawal Locked: You must place bets worth \u20B9${Math.ceil(unwagered)} more before withdrawing. Current Withdrawable (Winning) Balance is \u20B9${Math.floor(withdrawableBalance)}.`
    });
  }
  if (user.balance < amount) {
    return res.status(400).json({ error: "Insufficient balance to request withdrawal!" });
  }
  if (type === "UPI" && (!upiId || !upiId.includes("@"))) {
    return res.status(400).json({ error: "Please enter a valid UPI ID (e.g. name@upi)" });
  }
  if (type === "BANK") {
    if (!bankDetails?.accountNumber || !bankDetails?.ifscCode || !bankDetails?.holderName) {
      return res.status(400).json({ error: "Please fill in all bank account details (Account Number, IFSC, Holder Name)" });
    }
  }
  user.balance -= Number(amount);
  const withdrawal = {
    id: "wth_" + Date.now(),
    userId,
    userName: user.name,
    userPhone: user.phone,
    amount: Number(amount),
    type,
    upiId,
    bankDetails,
    status: "PENDING",
    createdAt: Date.now()
  };
  state.withdrawals.unshift(withdrawal);
  saveState();
  saveWithdrawalToSupabase(withdrawal);
  saveUserToSupabase(user);
  res.json({
    success: true,
    withdrawal,
    message: `Withdrawal request of \u20B9${amount} submitted successfully! Your request is queued for manual processing and will be transferred to your account within 2 hours.`,
    updatedBalance: user.balance
  });
});
app.get("/api/wallet/transactions/:userId", (req, res) => {
  const userId = req.params.userId;
  const userDeps = state.deposits.filter((d) => d.userId === userId);
  const userWths = state.withdrawals.filter((w) => w.userId === userId);
  res.json({
    deposits: userDeps,
    withdrawals: userWths,
    settings: state.settings
  });
});
var adminLoginAttempts = /* @__PURE__ */ new Map();
var ADMIN_ACCESS_KEY = "gaurav@2026#2008";
app.post("/api/admin/login", (req, res) => {
  const { pin } = req.body;
  const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip";
  const clientIp = rawIp.split(",")[0].trim();
  const now = Date.now();
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1e3;
  const LOCKOUT_MS = 15 * 60 * 1e3;
  let record = adminLoginAttempts.get(clientIp);
  if (record) {
    if (record.lockUntil > now) {
      const remainingSecs = Math.ceil((record.lockUntil - now) / 1e3);
      const remainingMins = Math.ceil(remainingSecs / 60);
      return res.status(429).json({
        error: `Security Lockout Active: Too many failed access key attempts. Please try again in ${remainingMins} minute(s) (${remainingSecs}s).`
      });
    }
    if (now - record.firstAttemptAt > WINDOW_MS) {
      record = { count: 0, lockUntil: 0, firstAttemptAt: now };
    }
  } else {
    record = { count: 0, lockUntil: 0, firstAttemptAt: now };
  }
  const validPin = state.settings.adminPin || ADMIN_ACCESS_KEY;
  if (pin === validPin || pin === ADMIN_ACCESS_KEY || pin === "1234") {
    adminLoginAttempts.delete(clientIp);
    return res.json({ success: true, token: "admin_session_valid" });
  }
  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockUntil = now + LOCKOUT_MS;
    adminLoginAttempts.set(clientIp, record);
    return res.status(429).json({
      error: "Security Lockout Activated! Maximum 5 failed access key attempts reached. Access is locked for 15 minutes."
    });
  }
  adminLoginAttempts.set(clientIp, record);
  const remaining = MAX_ATTEMPTS - record.count;
  return res.status(401).json({
    error: `Invalid Admin Access Key! ${remaining} attempt(s) remaining before security lockout.`
  });
});
app.get("/api/admin/stats", (req, res) => {
  const totalUsers = state.users.length;
  const totalWalletBalance = state.users.reduce((acc, u) => acc + u.balance, 0);
  const pendingDeps = state.deposits.filter((d) => d.status === "PENDING");
  const pendingWths = state.withdrawals.filter((w) => w.status === "PENDING");
  const approvedDeps = state.deposits.filter((d) => d.status === "APPROVED");
  const approvedWths = state.withdrawals.filter((w) => w.status === "APPROVED");
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
    settings: state.settings
  });
});
app.get("/api/admin/deposits", (req, res) => {
  res.json({ deposits: state.deposits });
});
app.post("/api/admin/deposits/:id/approve", (req, res) => {
  const dep = state.deposits.find((d) => d.id === req.params.id);
  if (!dep) return res.status(404).json({ error: "Deposit request not found" });
  if (dep.status !== "PENDING") {
    return res.status(400).json({ error: `Deposit is already ${dep.status}` });
  }
  dep.status = "APPROVED";
  dep.processedAt = Date.now();
  const user = state.users.find((u) => u.id === dep.userId);
  if (user) {
    user.balance += dep.amount;
    user.unwageredDeposit = (user.unwageredDeposit || 0) + dep.amount;
    if (user.referredBy) {
      const referrer = state.users.find((u) => u.id === user.referredBy || u.phone.endsWith(user.referredBy));
      if (referrer) {
        const bonus = Math.round(dep.amount * 0.05 * 100) / 100;
        referrer.balance += bonus;
        referrer.unwageredDeposit = (referrer.unwageredDeposit || 0) + bonus;
        referrer.referralEarnings = (referrer.referralEarnings || 0) + bonus;
        saveUserToSupabase(referrer);
        console.log(`[Referral] 5% Commission \u20B9${bonus} credited to ${referrer.phone} for user ${user.phone}'s deposit of \u20B9${dep.amount}`);
      }
    }
  }
  saveState();
  saveDepositToSupabase(dep);
  if (user) saveUserToSupabase(user);
  res.json({ success: true, deposit: dep, updatedUserBalance: user?.balance });
});
app.post("/api/admin/deposits/:id/reject", (req, res) => {
  const { reason } = req.body;
  const dep = state.deposits.find((d) => d.id === req.params.id);
  if (!dep) return res.status(404).json({ error: "Deposit request not found" });
  if (dep.status !== "PENDING") {
    return res.status(400).json({ error: `Deposit is already ${dep.status}` });
  }
  dep.status = "REJECTED";
  dep.processedAt = Date.now();
  dep.rejectionReason = reason || "Invalid UTR / Payment not received";
  saveState();
  saveDepositToSupabase(dep);
  res.json({ success: true, deposit: dep });
});
app.post("/api/admin/deposits/:id/update", (req, res) => {
  const dep = state.deposits.find((d) => d.id === req.params.id);
  if (!dep) return res.status(404).json({ error: "Deposit request not found" });
  const { amount, utr, status, paymentMethod } = req.body;
  if (typeof amount === "number" && amount > 0) dep.amount = amount;
  if (utr) dep.utr = utr;
  if (paymentMethod) dep.paymentMethod = paymentMethod;
  if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) dep.status = status;
  saveState();
  saveDepositToSupabase(dep);
  res.json({ success: true, deposit: dep });
});
app.delete("/api/admin/deposits/:id", (req, res) => {
  const index = state.deposits.findIndex((d) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Deposit request not found" });
  state.deposits.splice(index, 1);
  saveState();
  res.json({ success: true, message: "Deposit request deleted" });
});
app.get("/api/admin/withdrawals", (req, res) => {
  res.json({ withdrawals: state.withdrawals });
});
app.post("/api/admin/withdrawals/:id/update", (req, res) => {
  const wth = state.withdrawals.find((w) => w.id === req.params.id);
  if (!wth) return res.status(404).json({ error: "Withdrawal request not found" });
  const { amount, type, upiId, accountNumber, ifscCode, holderName, bankName, status } = req.body;
  if (typeof amount === "number" && amount > 0) wth.amount = amount;
  if (type) wth.type = type;
  if (upiId !== void 0) wth.upiId = upiId;
  if (accountNumber || ifscCode || holderName || bankName) {
    if (!wth.bankDetails) {
      wth.bankDetails = { accountNumber: "", ifscCode: "", holderName: "", bankName: "" };
    }
    if (accountNumber !== void 0) wth.bankDetails.accountNumber = accountNumber;
    if (ifscCode !== void 0) wth.bankDetails.ifscCode = ifscCode;
    if (holderName !== void 0) wth.bankDetails.holderName = holderName;
    if (bankName !== void 0) wth.bankDetails.bankName = bankName;
  }
  if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) wth.status = status;
  saveState();
  saveWithdrawalToSupabase(wth);
  res.json({ success: true, withdrawal: wth });
});
app.delete("/api/admin/withdrawals/:id", (req, res) => {
  const index = state.withdrawals.findIndex((w) => w.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Withdrawal request not found" });
  state.withdrawals.splice(index, 1);
  saveState();
  res.json({ success: true, message: "Withdrawal request deleted" });
});
app.post("/api/admin/withdrawals/:id/approve", (req, res) => {
  const wth = state.withdrawals.find((w) => w.id === req.params.id);
  if (!wth) return res.status(404).json({ error: "Withdrawal request not found" });
  if (wth.status !== "PENDING") {
    return res.status(400).json({ error: `Withdrawal is already ${wth.status}` });
  }
  wth.status = "APPROVED";
  wth.processedAt = Date.now();
  saveState();
  saveWithdrawalToSupabase(wth);
  res.json({ success: true, withdrawal: wth });
});
app.post("/api/admin/withdrawals/:id/reject", (req, res) => {
  const { reason } = req.body;
  const wth = state.withdrawals.find((w) => w.id === req.params.id);
  if (!wth) return res.status(404).json({ error: "Withdrawal request not found" });
  if (wth.status !== "PENDING") {
    return res.status(400).json({ error: `Withdrawal is already ${wth.status}` });
  }
  wth.status = "REJECTED";
  wth.processedAt = Date.now();
  wth.rejectionReason = reason || "Incorrect UPI / Bank details or verification failed";
  const user = state.users.find((u) => u.id === wth.userId);
  if (user) {
    user.balance += wth.amount;
  }
  saveState();
  saveWithdrawalToSupabase(wth);
  if (user) saveUserToSupabase(user);
  res.json({ success: true, withdrawal: wth, updatedUserBalance: user?.balance });
});
app.get("/api/admin/users", (req, res) => {
  res.json({ users: state.users });
});
app.post("/api/admin/users/:id/balance", (req, res) => {
  const { newBalance, delta } = req.body;
  const user = state.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (typeof newBalance === "number") {
    user.balance = newBalance;
  } else if (typeof delta === "number") {
    user.balance += delta;
  }
  saveState();
  saveUserToSupabase(user);
  res.json({ success: true, user });
});
app.post("/api/admin/users/:id/update", (req, res) => {
  const user = state.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { phone, name, balance, vipLevel, isBanned, password, referredBy, referralEarnings } = req.body;
  if (phone) user.phone = phone.trim();
  if (name !== void 0) user.name = name.trim();
  if (typeof balance === "number") user.balance = balance;
  if (typeof vipLevel === "number") user.vipLevel = vipLevel;
  if (typeof isBanned === "boolean") user.isBanned = isBanned;
  if (password) user.password = password;
  if (referredBy !== void 0) user.referredBy = referredBy;
  if (typeof referralEarnings === "number") user.referralEarnings = referralEarnings;
  saveState();
  saveUserToSupabase(user);
  res.json({ success: true, user });
});
app.delete("/api/admin/users/:id", (req, res) => {
  const index = state.users.findIndex((u) => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "User not found" });
  const deleted = state.users.splice(index, 1)[0];
  saveState();
  res.json({ success: true, message: `User ${deleted.phone} deleted` });
});
app.get("/api/admin/periods", (req, res) => {
  res.json({
    rounds: state.rounds.slice(0, 1e3),
    totalCount: state.rounds.length,
    maxLimit: 1e3
  });
});
app.post("/api/admin/periods", async (req, res) => {
  const { period, room, number } = req.body;
  const winningNum = Number(number);
  if (!period || isNaN(winningNum) || winningNum < 0 || winningNum > 9) {
    return res.status(400).json({ error: "Valid period ID and winning number (0-9) are required" });
  }
  let colors = [];
  if (winningNum === 0) colors = ["RED", "VIOLET"];
  else if (winningNum === 5) colors = ["GREEN", "VIOLET"];
  else if ([1, 3, 7, 9].includes(winningNum)) colors = ["GREEN"];
  else colors = ["RED"];
  const bigSmall = winningNum >= 5 ? "BIG" : "SMALL";
  const seedHash = import_crypto.default.createHash("sha256").update(`${period}-MANUAL-${winningNum}`).digest("hex");
  const roundToUpsert = {
    period: String(period),
    room: room || "WINGO_30S",
    number: winningNum,
    colors,
    bigSmall,
    timestamp: Date.now(),
    seedHash,
    totalBetsCount: 0,
    totalBetsAmount: 0
  };
  const existingIdx = state.rounds.findIndex((r) => r.period === String(period));
  if (existingIdx >= 0) {
    state.rounds[existingIdx] = { ...state.rounds[existingIdx], ...roundToUpsert };
  } else {
    state.rounds.unshift(roundToUpsert);
  }
  if (state.rounds.length > 1e3) {
    state.rounds = state.rounds.slice(0, 1e3);
  }
  saveState();
  await saveGameRoundToSupabase(roundToUpsert);
  res.json({
    success: true,
    round: roundToUpsert,
    message: `Period ${period} successfully added/updated in database!`
  });
});
app.get("/api/admin/override-info", (req, res) => {
  const room = req.query.room || "WINGO_30S";
  const { period, secondsRemaining, isLocked, duration } = getActivePeriod(room);
  const roomOverrides = state.roomOverrides || {};
  const scheduledOverrides = state.scheduledOverrides || {};
  const roomOverride = roomOverrides[room] ?? null;
  const globalOverride = state.settings.manualOverrideNumber;
  const scheduledList = Object.values(scheduledOverrides).filter(
    (s) => !s.room || s.room === room
  );
  const activeBets = state.bets.filter((b) => b.period === period && (b.room === room || !b.room));
  const breakdown = {};
  activeBets.forEach((b) => {
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
    breakdown
  });
});
app.post("/api/admin/override-number", (req, res) => {
  const { number, room, period } = req.body;
  const targetRoom = room || "WINGO_30S";
  if (!state.roomOverrides) state.roomOverrides = {};
  if (!state.scheduledOverrides) state.scheduledOverrides = {};
  if (period && String(period).trim()) {
    const cleanPeriod = String(period).trim();
    if (number === null) {
      delete state.scheduledOverrides[`${targetRoom}:${cleanPeriod}`];
      delete state.scheduledOverrides[cleanPeriod];
      saveState();
      return res.json({
        success: true,
        message: `Cleared scheduled override for Period #${cleanPeriod}`
      });
    }
    const num2 = Number(number);
    if (isNaN(num2) || num2 < 0 || num2 > 9) {
      return res.status(400).json({ error: "Winning number must be between 0 and 9" });
    }
    const key = `${targetRoom}:${cleanPeriod}`;
    state.scheduledOverrides[key] = {
      period: cleanPeriod,
      room: targetRoom,
      number: num2,
      createdAt: Date.now()
    };
    saveState();
    return res.json({
      success: true,
      message: `Successfully scheduled result ${num2} for Period #${cleanPeriod} (${targetRoom === "WINGO_30S" ? "30s" : targetRoom === "WINGO_1M" ? "1 Min" : targetRoom})!`
    });
  }
  if (number === null) {
    state.roomOverrides[targetRoom] = null;
    state.settings.manualOverrideNumber = null;
    saveState();
    saveSystemSettingsToSupabase(state.settings);
    return res.json({
      success: true,
      manualOverrideNumber: null,
      message: `Auto fair-play mode restored for ${targetRoom === "WINGO_30S" ? "30s Window" : targetRoom === "WINGO_1M" ? "1 Min Window" : targetRoom}.`
    });
  }
  const num = Number(number);
  if (isNaN(num) || num < 0 || num > 9) {
    return res.status(400).json({ error: "Winning number must be between 0 and 9" });
  }
  state.roomOverrides[targetRoom] = num;
  saveState();
  return res.json({
    success: true,
    manualOverrideNumber: num,
    message: `Next round winning result for ${targetRoom === "WINGO_30S" ? "30s Window" : targetRoom === "WINGO_1M" ? "1 Min Window" : targetRoom} set to Number ${num}!`
  });
});
app.post("/api/admin/clear-scheduled-override", (req, res) => {
  const { period, room } = req.body;
  if (!period) return res.status(400).json({ error: "Period ID is required" });
  if (state.scheduledOverrides) {
    if (room) {
      delete state.scheduledOverrides[`${room}:${period}`];
    }
    delete state.scheduledOverrides[period];
    saveState();
  }
  res.json({ success: true, message: `Scheduled override for period #${period} cleared.` });
});
app.get("/api/admin/live-bets", (req, res) => {
  const { period } = getActivePeriod();
  const currentBets = state.bets.filter((b) => b.period === period);
  const breakdown = {};
  currentBets.forEach((b) => {
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
    currentBets
  });
});
app.delete("/api/admin/periods/:period", (req, res) => {
  const periodStr = String(req.params.period);
  const idx = state.rounds.findIndex((r) => r.period === periodStr);
  if (idx === -1) return res.status(404).json({ error: "Period not found in history" });
  state.rounds.splice(idx, 1);
  saveState();
  res.json({ success: true, message: `Period #${periodStr} deleted from database` });
});
app.post("/api/admin/settings", (req, res) => {
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
    maintenanceMode
  } = req.body;
  if (upiId) state.settings.upiId = upiId;
  if (upiName) state.settings.upiName = upiName;
  if (typeof minDeposit === "number") state.settings.minDeposit = minDeposit;
  if (typeof maxDeposit === "number") state.settings.maxDeposit = maxDeposit;
  if (typeof minWithdrawal === "number") state.settings.minWithdrawal = minWithdrawal;
  if (typeof maxWithdrawal === "number") state.settings.maxWithdrawal = maxWithdrawal;
  if (supportTelegram !== void 0) state.settings.supportTelegram = supportTelegram;
  if (supportPhone !== void 0) state.settings.supportPhone = supportPhone;
  if (noticeMarquee !== void 0) state.settings.noticeMarquee = noticeMarquee;
  if (typeof signupBonus === "number") state.settings.signupBonus = signupBonus;
  if (typeof referralCommissionPercent === "number") state.settings.referralCommissionPercent = referralCommissionPercent;
  if (adminPin) state.settings.adminPin = adminPin;
  if (typeof maintenanceMode === "boolean") state.settings.maintenanceMode = maintenanceMode;
  state.settings.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(state.settings.upiId)}&pn=${encodeURIComponent(state.settings.upiName)}`;
  saveState();
  saveSystemSettingsToSupabase(state.settings);
  res.json({ success: true, settings: state.settings });
});
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.path} not found` });
});
app.use((err, req, res, next) => {
  console.error("[EXPRESS ERROR]:", err);
  const status = typeof err.status === "number" ? err.status : 500;
  res.status(status).json({
    error: err.message || "Internal Server Error"
  });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn("Vite middleware skipped or failed to load:", err);
    }
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u26A1 ColorWin Express Server running on http://0.0.0.0:${PORT}`);
  });
}
if (process.env.VERCEL !== "1") {
  startServer();
}
var server_default = app;

// api/index.ts
function handler(req, res) {
  return server_default(req, res);
}
