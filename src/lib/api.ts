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

async function handleJsonResponse(res: Response, defaultError: string) {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new Error(text || `Server Error (${res.status})`);
      }
      if (contentType.includes('text/html') || text.trim().startsWith('<')) {
        throw new Error(`Route or API endpoint not found (${res.status})`);
      }
      throw new Error(`Invalid JSON response from server (${res.status})`);
    }
  }

  if (data?.isBanned || res.status === 403) {
    localStorage.setItem('rw_device_banned', 'true');
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || defaultError);
  }
  return data;
}

export async function fetchGameState(room = 'WINGO_30S'): Promise<ServerGameState> {
  const res = await fetch(`${BASE_URL}/api/game/state?room=${room}`);
  return handleJsonResponse(res, 'Failed to fetch game state');
}

export async function fetchGameHistory(page = 1, limit = 20, room = 'WINGO_30S'): Promise<{ rounds: GameRound[]; total: number }> {
  const res = await fetch(`${BASE_URL}/api/game/history?page=${page}&limit=${limit}&room=${room}`);
  return handleJsonResponse(res, 'Failed to fetch game history');
}

export async function loginUser(phone: string, password?: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const data = await handleJsonResponse(res, 'Login failed');
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
  const data = await handleJsonResponse(res, 'Registration failed');
  return data.user;
}

export async function fetchUser(userId: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/auth/user/${userId}`);
  const data = await handleJsonResponse(res, 'Failed to fetch user');
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
  return handleJsonResponse(res, 'Failed to place bet');
}

export async function fetchMyBets(userId: string): Promise<Bet[]> {
  const res = await fetch(`${BASE_URL}/api/game/my-bets/${userId}`);
  const data = await handleJsonResponse(res, 'Failed to fetch user bets');
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
  return handleJsonResponse(res, 'Deposit failed');
}

export async function createCashfreeOrder(params: {
  userId: string;
  amount: number;
}): Promise<{ success: boolean; order_id: string; payment_session_id: string; order_amount: number; cf_env?: string }> {
  const res = await fetch(`${BASE_URL}/api/cashfree/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleJsonResponse(res, 'Failed to create Cashfree payment order');
}

export async function verifyCashfreeOrder(orderId: string): Promise<{
  success: boolean;
  status: string;
  amount?: number;
  updatedBalance?: number;
  error?: string;
  message?: string;
}> {
  const res = await fetch(`${BASE_URL}/api/cashfree/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
  return handleJsonResponse(res, 'Failed to verify Cashfree payment');
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
  return handleJsonResponse(res, 'Withdrawal request failed');
}

export async function fetchTransactions(userId: string): Promise<{
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  settings: SystemSettings;
}> {
  const res = await fetch(`${BASE_URL}/api/wallet/transactions/${userId}`);
  return handleJsonResponse(res, 'Failed to fetch transactions');
}

// Admin APIs
export async function adminLogin(pin: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await handleJsonResponse(res, 'Invalid Admin PIN');
  return data.success;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${BASE_URL}/api/admin/stats`);
  return handleJsonResponse(res, 'Failed to fetch admin stats');
}

export async function fetchAdminDeposits(): Promise<DepositRequest[]> {
  const res = await fetch(`${BASE_URL}/api/admin/deposits`);
  const data = await handleJsonResponse(res, 'Failed to fetch deposits');
  return data.deposits;
}

export async function approveDeposit(id: string): Promise<{ deposit: DepositRequest }> {
  const res = await fetch(`${BASE_URL}/api/admin/deposits/${id}/approve`, { method: 'POST' });
  return handleJsonResponse(res, 'Failed to approve deposit');
}

export async function rejectDeposit(id: string, reason?: string): Promise<{ deposit: DepositRequest }> {
  const res = await fetch(`${BASE_URL}/api/admin/deposits/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return handleJsonResponse(res, 'Failed to reject deposit');
}

export async function fetchAdminWithdrawals(): Promise<WithdrawalRequest[]> {
  const res = await fetch(`${BASE_URL}/api/admin/withdrawals`);
  const data = await handleJsonResponse(res, 'Failed to fetch withdrawals');
  return data.withdrawals;
}

export async function approveWithdrawal(id: string): Promise<{ withdrawal: WithdrawalRequest }> {
  const res = await fetch(`${BASE_URL}/api/admin/withdrawals/${id}/approve`, { method: 'POST' });
  return handleJsonResponse(res, 'Failed to approve withdrawal');
}

export async function rejectWithdrawal(id: string, reason?: string): Promise<{ withdrawal: WithdrawalRequest }> {
  const res = await fetch(`${BASE_URL}/api/admin/withdrawals/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return handleJsonResponse(res, 'Failed to reject withdrawal');
}

export async function fetchAdminUsers(): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/api/admin/users`);
  const data = await handleJsonResponse(res, 'Failed to fetch users');
  return data.users;
}

export async function updateUserBalance(id: string, params: { newBalance?: number; delta?: number }): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}/balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await handleJsonResponse(res, 'Failed to update user balance');
  return data.user;
}

export async function fetchOverrideInfo(room = 'WINGO_30S'): Promise<{
  room: string;
  activePeriod: string;
  secondsRemaining: number;
  roundDurationSeconds: number;
  isLocked: boolean;
  roomOverride: number | null;
  globalOverride: number | null;
  scheduledOverrides: Array<{ period: string; room: string; number: number; createdAt: number }>;
  allScheduledOverrides: Array<{ period: string; room: string; number: number; createdAt: number }>;
  allRoomOverrides: Record<string, number | null>;
  activeBetsCount: number;
  activeBetsVolume: number;
  breakdown: Record<string, { count: number; totalAmount: number }>;
}> {
  const res = await fetch(`${BASE_URL}/api/admin/override-info?room=${room}`);
  return handleJsonResponse(res, 'Failed to fetch override information');
}

export async function overrideRoundNumber(params: {
  number: number | null;
  room?: string;
  period?: string;
}): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/admin/override-number`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await handleJsonResponse(res, 'Failed to override number');
  return data.message;
}

export async function clearScheduledOverride(period: string, room?: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/admin/clear-scheduled-override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period, room }),
  });
  const data = await handleJsonResponse(res, 'Failed to clear scheduled override');
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
  return handleJsonResponse(res, 'Failed to fetch live bets');
}

export async function updateAdminSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await handleJsonResponse(res, 'Failed to update settings');
  return data.settings;
}

export async function fetchAdminPeriods(): Promise<{ rounds: GameRound[]; totalCount: number; maxLimit: number }> {
  const res = await fetch(`${BASE_URL}/api/admin/periods`);
  return handleJsonResponse(res, 'Failed to fetch period history from database');
}

export async function addOrEditAdminPeriod(params: { period: string; room?: string; number: number }): Promise<GameRound> {
  const res = await fetch(`${BASE_URL}/api/admin/periods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await handleJsonResponse(res, 'Failed to update period result in database');
  return data.round;
}

export async function updateAdminUser(id: string, params: {
  phone?: string;
  name?: string;
  balance?: number;
  vipLevel?: number;
  isBanned?: boolean;
  password?: string;
  referredBy?: string;
  referralEarnings?: number;
}): Promise<User> {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await handleJsonResponse(res, 'Failed to update user');
  return data.user;
}

export async function deleteAdminUser(id: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/admin/users/${id}`, { method: 'DELETE' });
  const data = await handleJsonResponse(res, 'Failed to delete user');
  return data.message;
}

export async function updateAdminDeposit(id: string, params: {
  amount?: number;
  utr?: string;
  status?: string;
  paymentMethod?: string;
}): Promise<DepositRequest> {
  const res = await fetch(`${BASE_URL}/api/admin/deposits/${id}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await handleJsonResponse(res, 'Failed to update deposit');
  return data.deposit;
}

export async function deleteAdminDeposit(id: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/admin/deposits/${id}`, { method: 'DELETE' });
  const data = await handleJsonResponse(res, 'Failed to delete deposit');
  return data.message;
}

export async function updateAdminWithdrawal(id: string, params: {
  amount?: number;
  type?: string;
  upiId?: string;
  accountNumber?: string;
  ifscCode?: string;
  holderName?: string;
  bankName?: string;
  status?: string;
}): Promise<WithdrawalRequest> {
  const res = await fetch(`${BASE_URL}/api/admin/withdrawals/${id}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await handleJsonResponse(res, 'Failed to update withdrawal');
  return data.withdrawal;
}

export async function deleteAdminWithdrawal(id: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/admin/withdrawals/${id}`, { method: 'DELETE' });
  const data = await handleJsonResponse(res, 'Failed to delete withdrawal');
  return data.message;
}

export async function deleteAdminPeriod(period: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/admin/periods/${period}`, { method: 'DELETE' });
  const data = await handleJsonResponse(res, 'Failed to delete period');
  return data.message;
}
