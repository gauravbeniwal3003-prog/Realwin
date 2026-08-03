export type BetSelection = 
  | 'GREEN'
  | 'RED'
  | 'VIOLET'
  | 'BIG'
  | 'SMALL'
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type RoomType = 'WINGO_30S' | 'WINGO_1M' | 'WINGO_3M' | 'WINGO_5M' | 'PARITY' | 'SAPRE' | 'BCONE' | 'EMERD';

export interface GameRound {
  period: string;
  room: RoomType;
  number: number;
  colors: ('GREEN' | 'RED' | 'VIOLET')[];
  bigSmall: 'BIG' | 'SMALL';
  timestamp: number;
  seedHash: string;
  totalBetsCount?: number;
  totalBetsAmount?: number;
}

export interface Bet {
  id: string;
  userId: string;
  userName: string;
  period: string;
  room: RoomType;
  selection: BetSelection;
  amount: number;
  payout: number;
  status: 'PENDING' | 'WON' | 'LOST';
  createdAt: number;
  multiplier: number;
  resultNumber?: number;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  balance: number;
  isAdmin: boolean;
  createdAt: number;
}

export interface BankAccountDetails {
  accountNumber: string;
  ifscCode: string;
  holderName: string;
  bankName: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  utr: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  paymentMethod: 'UPI';
  createdAt: number;
  processedAt?: number;
  rejectionReason?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  type: 'UPI' | 'BANK';
  upiId?: string;
  bankDetails?: BankAccountDetails;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: number;
  processedAt?: number;
  rejectionReason?: string;
}

export interface SystemSettings {
  upiId: string;
  upiName: string;
  qrCodeUrl: string;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  manualOverrideNumber: number | null; // null for auto fair random
}

export interface ServerGameState {
  period: string;
  room: RoomType;
  secondsRemaining: number;
  roundDurationSeconds: number;
  isLocked: boolean;
  lastRound?: GameRound;
  historyCount: number;
  onlineUsersCount: number;
}

export interface AdminStats {
  totalUsers: number;
  totalWalletBalance: number;
  pendingDepositsCount: number;
  pendingDepositsAmount: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  totalApprovedDeposits: number;
  totalApprovedWithdrawals: number;
  totalBetsPlaced: number;
  totalVolumeBet: number;
  netHouseMargin: number;
  settings?: SystemSettings;
}
