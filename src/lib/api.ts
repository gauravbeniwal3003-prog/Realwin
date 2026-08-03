import {
  User,
  GameRound,
  Bet,
  DepositRequest,
  WithdrawalRequest,
  ServerGameState,
  AdminStats,
  SystemSettings,
} from '../types';

const BASE_URL = '';

export async function fetchGameState(room = 'WINGO_30S'): Promise<ServerGameState> {
  const res = await fetch(`${BASE_URL}/api/game/state?room=${room}`);
  if (!res.ok) throw new Error('Failed to fetch game state');
  return res.json();
}

export async function fetchGameHistory(page = 1, limit = 20, room = 'WINGO_30S'): Promise<{ rounds: GameRound[]; total: number }> {
  const res = await fetch(`${BASE_URL}/api/game/history?page=${page}&limit=${limit}&room=${room}`);
  if (!res.ok) throw new Error('Failed to fetch game history');
  return res.json();
}

export async function loginUser(phone: string, password?: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data.user;
}

export async function registerUser(params: {
  phone: string;
  password?: string;
  referralCode?: string;
  name?: string;
}): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data.user;
}

export async function fetchUser(userId: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/auth/user/${userId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch user');
  return data.user;
}

export async function placeBet(params: {
  userId: string;
  room: string;
  selection: string;
  amount: number;
}): Promise<{ bet: Bet; updatedBalance: number }> {
  const res = await fetch(`${BASE_URL}/api/game/bet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to place bet');
  return data;
}

export async function fetchMyBets(userId: string): Promise<Bet[]> {
  const res = await fetch(`${BASE_URL}/api/game/my-bets/${userId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch user bets');
  return data.bets;
}

export async function submitDeposit(params: {
  userId: string;
  amount: number;
  utr: string;
  instantSimulated?: boolean;
}): Promise<{ deposit: DepositRequest; message: string; updatedBalance: number }> {
  const res = await fetch(`${BASE_URL}/api/wallet/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Deposit failed');
  return data;
}

export async function submitWithdrawal(params: {
  userId: string;
  amount: number;
  type: 'UPI' | 'BANK';
  upiId?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    holderName: string;
    bankName: string;
  };
}): Promise<{ withdrawal: WithdrawalRequest; message: string; updatedBalance: number }> {
  const res = await fetch(`${BASE_URL}/api/wallet/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Withdrawal request failed');
  return data;
}

export async function fetchTransactions(userId: string): Promise<{
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  settings: SystemSettings;
}> {
  const res = await fetch(`${BASE_URL}/api/wallet/transactions/${userId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch transactions');
  return data;
}

// Admin APIs
export async function adminLogin(pin: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid Admin PIN');
  return data.success;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${BASE_URL}/api/admin/stats`);
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to fetch admin stats');
  return data;
}

export async function fetchAdminDeposits(): Promise<DepositRequest[]> {
  const res = await fetch(`${BASE_URL}/api/admin/deposits`);
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to fetch deposits');
  return data.deposits;
}

export async function approveDeposit(id: string): Promise<{ deposit: DepositRequest }> {
  const res = await fetch(`${BASE_URL}/api/admin/deposits/${id}/approve`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to approve deposit');
  return data;
}

export async function rejectDeposit(id: string, reason?: string): Promise<{ deposit: DepositRequest }> {
  const res = await fetch(`${BASE_URL}/api/admin/deposits/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reject deposit');
  return data;
}

export async function fetchAdminWithdrawals(): Promise<WithdrawalRequest[]> {
  const res = await fetch(`${BASE_URL}/api/admin/withdrawals`);
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to fetch withdrawals');
  return data.withdrawals;
}

export async function approveWithdrawal(id: string): Promise<{ withdrawal: WithdrawalRequest }> {
  const res = await fetch(`${BASE_URL}/api/admin/withdrawals/${id}/approve`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to approve withdrawal');
  return data;
}

export async function rejectWithdrawal(id: string, reason?: string): Promise<{ withdrawal: WithdrawalRequest }> {
  const res = await fetch(`${BASE_URL}/api/admin/withdrawals/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reject withdrawal');
  return data;
}

export async function fetchAdminUsers(): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/api/admin/users`);
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to fetch users');
  return data.users;
}

export async function updateUserBalance(id: string, params: { newBalance?: number; delta?: number }): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}/balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update user balance');
  return data.user;
}

export async function overrideRoundNumber(number: number | null): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/admin/override-number`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to override number');
  return data.message;
}

export async function fetchLiveBets(): Promise<{
  period: string;
  totalBets: number;
  totalVolume: number;
  breakdown: Record<string, { count: number; totalAmount: number }>;
  currentBets: Bet[];
}> {
  const res = await fetch(`${BASE_URL}/api/admin/live-bets`);
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to fetch live bets');
  return data;
}

export async function updateAdminSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update settings');
  return data.settings;
}

export async function fetchAdminPeriods(): Promise<{ rounds: GameRound[]; totalCount: number; maxLimit: number }> {
  const res = await fetch(`${BASE_URL}/api/admin/periods`);
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to fetch period history from database');
  return data;
}

export async function addOrEditAdminPeriod(params: { period: string; room?: string; number: number }): Promise<GameRound> {
  const res = await fetch(`${BASE_URL}/api/admin/periods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update period result in database');
  return data.round;
}
