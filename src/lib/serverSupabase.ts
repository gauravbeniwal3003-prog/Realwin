import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

import { User, GameRound, Bet, DepositRequest, WithdrawalRequest, SystemSettings, RoomType } from '../types';

// Supabase Credentials (from process.env)
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tkvcianczzdxrjylrdyq.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdmNpYW5jenpkeHJqeWxyZHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTMwNjQsImV4cCI6MjEwMTI4OTA2NH0.81-XSAxkfZ1nIH4UpYKeX4ybrR3olnt0KkZ6l8vngCg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log('✅ Supabase Client initialized successfully.');

// --- Helper Functions to Load and Persist DB entities ---

export async function loadUsersFromSupabase(): Promise<User[]> {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error || !data) return [];
    return data.map((u: any) => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      balance: Number(u.balance),
      isAdmin: Boolean(u.is_admin),
      createdAt: Number(u.created_at || Date.now()),
      referredBy: u.referred_by || undefined,
      referralEarnings: Number(u.referral_earnings || 0),
    }));
  } catch (err) {
    console.error('Error loading users from Supabase:', err);
    return [];
  }
}

export async function saveUserToSupabase(user: User): Promise<void> {
  try {
    const payload = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      balance: user.balance,
      is_admin: user.isAdmin,
      created_at: user.createdAt,
      referred_by: user.referredBy || null,
      referral_earnings: user.referralEarnings || 0,
    };

    let { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
    if (error) {
      let fallbackRes = await supabase.from('users').upsert(payload);
      if (fallbackRes.error) {
        console.warn('⚠️ Supabase saveUser notice:', fallbackRes.error.message);
      }
    }
  } catch (err) {
    console.error('Error saving user to Supabase:', err);
  }
}

export async function loadGameRoundsFromSupabase(): Promise<GameRound[]> {
  try {
    const { data, error } = await supabase
      .from('game_rounds')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (error) {
      console.warn('⚠️ Supabase loadGameRounds warning:', error.message);
      return [];
    }
    if (!data) return [];

    return data.map((r: any) => ({
      period: String(r.period),
      room: (r.room as RoomType) || 'WINGO_30S',
      number: Number(r.number),
      colors: Array.isArray(r.colors) ? r.colors : typeof r.colors === 'string' ? JSON.parse(r.colors) : [],
      bigSmall: r.big_small || (Number(r.number) >= 5 ? 'BIG' : 'SMALL'),
      timestamp: Number(r.timestamp || Date.now()),
      seedHash: r.seed_hash || '',
      totalBetsCount: Number(r.total_bets_count || 0),
      totalBetsAmount: Number(r.total_bets_amount || 0),
    }));
  } catch (err) {
    console.error('Error loading game rounds from Supabase:', err);
    return [];
  }
}

export async function saveGameRoundToSupabase(round: GameRound): Promise<void> {
  try {
    const payload = {
      period: String(round.period),
      room: round.room || 'WINGO_30S',
      number: Number(round.number),
      colors: round.colors,
      big_small: round.bigSmall,
      timestamp: Number(round.timestamp),
      seed_hash: round.seedHash || '',
      total_bets_count: Number(round.totalBetsCount || 0),
      total_bets_amount: Number(round.totalBetsAmount || 0),
    };

    // Try standard upsert
    let { error } = await supabase.from('game_rounds').upsert(payload, { onConflict: 'period' });

    // If upsert fails (e.g. composite primary key or missing unique constraint), try insert or fallback
    if (error) {
      const fallbackRes = await supabase.from('game_rounds').upsert(payload);
      if (fallbackRes.error) {
        const insertRes = await supabase.from('game_rounds').insert(payload);
        if (insertRes.error) {
          console.warn('⚠️ Supabase sync notice:', insertRes.error.message);
          return;
        }
      }
    }

    console.log(`✅ [SUPABASE SYNC OK] Game Period ${round.period} successfully stored in Supabase database.`);

    // Enforce MAX 1000 PERIODS constraint in database!
    await pruneOldGameRoundsFromSupabase();
  } catch (err) {
    console.error('Error saving game round to Supabase:', err);
  }
}

// Prune old rounds in Supabase so max 1000 period results are retained
export async function pruneOldGameRoundsFromSupabase(): Promise<void> {
  try {
    // Get the 1000th newest timestamp
    const { data, error } = await supabase
      .from('game_rounds')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .range(1000, 1000);

    if (!error && data && data.length > 0) {
      const cutoffTimestamp = data[0].timestamp;
      // Delete rounds older than cutoffTimestamp
      await supabase
        .from('game_rounds')
        .delete()
        .lt('timestamp', cutoffTimestamp);
    }
  } catch (err) {
    console.error('Error pruning old rounds from Supabase:', err);
  }
}

export async function loadBetsFromSupabase(): Promise<Bet[]> {
  try {
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3000);

    if (error || !data) return [];
    return data.map((b: any) => ({
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
    }));
  } catch (err) {
    console.error('Error loading bets from Supabase:', err);
    return [];
  }
}

export async function saveBetToSupabase(bet: Bet): Promise<void> {
  try {
    await supabase.from('bets').upsert({
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
      result_number: bet.resultNumber ?? null,
    });
  } catch (err) {
    console.error('Error saving bet to Supabase:', err);
  }
}

export async function loadDepositsFromSupabase(): Promise<DepositRequest[]> {
  try {
    const { data, error } = await supabase
      .from('deposits')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      userName: d.user_name,
      userPhone: d.user_phone,
      amount: Number(d.amount),
      utr: d.utr,
      status: d.status,
      paymentMethod: d.payment_method || 'UPI',
      createdAt: Number(d.created_at),
      processedAt: d.processed_at ? Number(d.processed_at) : undefined,
      rejectionReason: d.rejection_reason || undefined,
    }));
  } catch (err) {
    console.error('Error loading deposits from Supabase:', err);
    return [];
  }
}

export async function saveDepositToSupabase(deposit: DepositRequest): Promise<void> {
  try {
    await supabase.from('deposits').upsert({
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
      rejection_reason: deposit.rejectionReason ?? null,
    });
  } catch (err) {
    console.error('Error saving deposit to Supabase:', err);
  }
}

export async function loadWithdrawalsFromSupabase(): Promise<WithdrawalRequest[]> {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((w: any) => ({
      id: w.id,
      userId: w.user_id,
      userName: w.user_name,
      userPhone: w.user_phone,
      amount: Number(w.amount),
      type: w.type,
      upiId: w.upi_id || undefined,
      bankDetails: w.bank_details ? (typeof w.bank_details === 'string' ? JSON.parse(w.bank_details) : w.bank_details) : undefined,
      status: w.status,
      createdAt: Number(w.created_at),
      processedAt: w.processed_at ? Number(w.processed_at) : undefined,
      rejectionReason: w.rejection_reason || undefined,
    }));
  } catch (err) {
    console.error('Error loading withdrawals from Supabase:', err);
    return [];
  }
}

export async function saveWithdrawalToSupabase(withdrawal: WithdrawalRequest): Promise<void> {
  try {
    await supabase.from('withdrawals').upsert({
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
      rejection_reason: withdrawal.rejectionReason ?? null,
    });
  } catch (err) {
    console.error('Error saving withdrawal to Supabase:', err);
  }
}

export async function loadSystemSettingsFromSupabase(): Promise<SystemSettings | null> {
  try {
    const { data, error } = await supabase.from('system_settings').select('*').limit(1).maybeSingle();
    if (error || !data) return null;
    return {
      upiId: data.upi_id || '9876543210@ybl',
      upiName: data.upi_name || 'Realwin Game',
      qrCodeUrl: data.qr_code_url || 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=9876543210@ybl',
      minDeposit: Number(data.min_deposit || 500),
      maxDeposit: Number(data.max_deposit || 5000),
      minWithdrawal: Number(data.min_withdrawal || 300),
      maxWithdrawal: Number(data.max_withdrawal || 300000),
      manualOverrideNumber: data.manual_override_number !== null && data.manual_override_number !== undefined ? Number(data.manual_override_number) : null,
    };
  } catch (err) {
    console.error('Error loading settings from Supabase:', err);
    return null;
  }
}

export async function saveSystemSettingsToSupabase(settings: SystemSettings): Promise<void> {
  try {
    await supabase.from('system_settings').upsert({
      id: 1,
      upi_id: settings.upiId,
      upi_name: settings.upiName,
      qr_code_url: settings.qrCodeUrl,
      min_deposit: settings.minDeposit,
      max_deposit: settings.maxDeposit,
      min_withdrawal: settings.minWithdrawal,
      max_withdrawal: settings.maxWithdrawal,
      manual_override_number: settings.manualOverrideNumber ?? null,
    });
  } catch (err) {
    console.error('Error saving settings to Supabase:', err);
  }
}
