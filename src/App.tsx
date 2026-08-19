import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { GamePage } from './pages/GamePage';
import { WalletPage } from './pages/WalletPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { FairPlayPage } from './pages/FairPlayPage';
import { RulesPage } from './pages/RulesPage';
import { SupportPage } from './pages/SupportPage';
import { ReferralPage } from './pages/ReferralPage';
import { PolicyPage } from './pages/PolicyPage';
import { BidHistoryPage } from './pages/BidHistoryPage';
import { ScrollToTop } from './components/ScrollToTop';
import { BottomNav } from './components/BottomNav';
import { GameResultModal, GameResultModalData } from './components/GameResultModal';
import { RealWinLogo } from './components/RealWinLogo';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import {
  User,
  GameRound,
  Bet,
  DepositRequest,
  WithdrawalRequest,
  ServerGameState,
  SystemSettings,
  BetSelection,
  RoomType,
} from './types';
import {
  fetchGameState,
  fetchGameHistory,
  fetchUser,
  placeBet,
  fetchMyBets,
  submitDeposit,
  submitWithdrawal,
  fetchTransactions,
  loginUser,
} from './lib/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  user: User | null;
  isCheckingAuth: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, user, isCheckingAuth }) => {
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#f7f8ff] flex flex-col items-center justify-center p-4 font-sans select-none">
        <RealWinLogo size="lg" lightMode={true} />
        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-500 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-[#ff5353]" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  const [isDeviceBanned, setIsDeviceBanned] = useState<boolean>(() => {
    return localStorage.getItem('rw_device_banned') === 'true';
  });

  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [activeRoom, setActiveRoom] = useState<RoomType>('WINGO_30S');
  const [gameState, setGameState] = useState<ServerGameState | null>(null);
  const [history, setHistory] = useState<GameRound[]>([]);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    upiId: 'realwin.pay@upi',
    upiName: 'RealWin Official Payments',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=realwin.pay@upi&pn=RealWin',
    minDeposit: 500,
    maxDeposit: 5000,
    minWithdrawal: 300,
    maxWithdrawal: 300000,
    manualOverrideNumber: null,
  });

  const [isRefreshingUser, setIsRefreshingUser] = useState<boolean>(false);
  const [lastPeriodId, setLastPeriodId] = useState<string>('');

  // Win/Loss Result Modal State
  const [resultModalData, setResultModalData] = useState<GameResultModalData | null>(null);
  const acknowledgedPeriodsRef = useRef<Set<string>>(new Set());
  const initialBetsLoadedRef = useRef<boolean>(false);

  // Detect newly resolved bets to open Win/Loss Result Pop-Up Modal
  useEffect(() => {
    if (!user || myBets.length === 0) return;

    // On initial bets load, mark all currently resolved bets as acknowledged so past history does not pop up
    if (!initialBetsLoadedRef.current) {
      myBets.forEach(b => {
        if (b.status !== 'PENDING') {
          acknowledgedPeriodsRef.current.add(b.period);
        }
      });
      initialBetsLoadedRef.current = true;
      return;
    }

    // Find any resolved bet (WON or LOST) whose period has not been acknowledged yet
    const unacknowledgedResolvedBets = myBets.filter(
      b => b.status !== 'PENDING' && !acknowledgedPeriodsRef.current.has(b.period)
    );

    if (unacknowledgedResolvedBets.length === 0) return;

    // Pick the most recent period among unacknowledged bets
    const targetPeriod = unacknowledgedResolvedBets[0].period;
    const periodBets = myBets.filter(b => b.period === targetPeriod && b.status !== 'PENDING');

    if (periodBets.length === 0) return;

    const totalInvested = periodBets.reduce((sum, b) => sum + b.amount, 0);
    const totalPayout = periodBets.reduce((sum, b) => sum + b.payout, 0);
    const netProfit = totalPayout - totalInvested;
    const isWin = totalPayout > 0;
    const matchedRound = history.find(r => r.period === targetPeriod);

    // Fallback round builder so popup shows immediately even before history pagination loads
    const winningNum = periodBets[0].resultNumber !== undefined ? periodBets[0].resultNumber : matchedRound?.number;
    let colors: ('GREEN' | 'RED' | 'VIOLET')[] = matchedRound?.colors || [];
    if (colors.length === 0 && winningNum !== undefined) {
      if (winningNum === 0) colors = ['RED', 'VIOLET'];
      else if (winningNum === 5) colors = ['GREEN', 'VIOLET'];
      else if ([1, 3, 7, 9].includes(winningNum)) colors = ['GREEN'];
      else colors = ['RED'];
    }
    const bigSmall = matchedRound?.bigSmall || (winningNum !== undefined && winningNum >= 5 ? 'BIG' : 'SMALL');
    const resolvedRound: GameRound | undefined = matchedRound || (winningNum !== undefined ? {
      period: targetPeriod,
      room: periodBets[0].room,
      number: winningNum,
      colors,
      bigSmall,
      timestamp: Date.now(),
      seedHash: '',
    } : undefined);

    setResultModalData({
      period: targetPeriod,
      room: periodBets[0].room,
      round: resolvedRound,
      bets: periodBets,
      totalInvested,
      totalPayout,
      netProfit,
      isWin,
    });
  }, [myBets, history, user]);

  const handleCloseResultModal = () => {
    if (resultModalData) {
      acknowledgedPeriodsRef.current.add(resultModalData.period);
    }
    setResultModalData(null);
  };

  // Initial user loading
  useEffect(() => {
    async function initUser() {
      const savedPhone = localStorage.getItem('realwin_user_phone');
      if (!savedPhone) {
        setUser(null);
        setIsCheckingAuth(false);
        return;
      }
      try {
        const u = await loginUser(savedPhone);
        setUser(u);
      } catch (err) {
        console.error('Failed to init user', err);
        setUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    initUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('realwin_user_phone');
    setUser(null);
  };

  // Synchronized sync loop based on active room
  const activeRoomRef = useRef<RoomType>(activeRoom);
  activeRoomRef.current = activeRoom;

  const lastPeriodIdRef = useRef<string>(lastPeriodId);
  lastPeriodIdRef.current = lastPeriodId;

  const userRef = useRef<User | null>(user);
  userRef.current = user;

  const myBetsRef = useRef<Bet[]>(myBets);
  myBetsRef.current = myBets;

  const isSyncingRef = useRef<boolean>(false);

  const syncServer = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const room = activeRoomRef.current;
      const currentUid = userRef.current?.id;
      const state = await fetchGameState(room, currentUid);
      setGameState(state);

      if (state.history && state.history.length > 0) {
        setHistory(state.history);
      }

      if (state.user) {
        setUser(state.user);
      }

      if (state.myBets) {
        setMyBets(state.myBets);
      }

      if (state.period !== lastPeriodIdRef.current) {
        setLastPeriodId(state.period);
        lastPeriodIdRef.current = state.period;
      }
    } catch (err: any) {
      // Suppress noisy transient network offline / "Failed to fetch" errors during continuous polling
      if (err?.message !== 'Failed to fetch' && !String(err).includes('Failed to fetch')) {
        console.warn('Game state sync notice:', err?.message || err);
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Smooth client-side countdown timer between server syncs
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState(prev => {
        if (!prev) return prev;
        if (prev.secondsRemaining <= 0) {
          syncServer();
          return prev;
        }
        const newSecs = prev.secondsRemaining - 1;
        if (newSecs === 0) {
          // Instantly poll multiple times right at transition to minimize any lag
          setTimeout(syncServer, 50);
          setTimeout(syncServer, 300);
          setTimeout(syncServer, 600);
          setTimeout(syncServer, 1000);
          setTimeout(syncServer, 1500);
        }
        return {
          ...prev,
          secondsRemaining: newSecs,
          isLocked: newSecs <= 5,
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [syncServer]);

  useEffect(() => {
    syncServer();
    const interval = setInterval(syncServer, 1000);
    return () => clearInterval(interval);
  }, [syncServer]);

  // Load initial history & user data when activeRoom or user changes
  useEffect(() => {
    async function loadData() {
      try {
        const hist = await fetchGameHistory(1, 100, activeRoom);
        setHistory(hist.rounds);

        if (user) {
          const b = await fetchMyBets(user.id);
          setMyBets(b);

          const txs = await fetchTransactions(user.id);
          setDeposits(txs.deposits);
          setWithdrawals(txs.withdrawals);
          setSettings(txs.settings);
        }
      } catch (err) {
        console.error('Error loading initial data', err);
      }
    }
    loadData();
  }, [activeRoom, user?.id]);

  const handleRefreshUser = async () => {
    if (!user) return;
    setIsRefreshingUser(true);
    try {
      const fresh = await fetchUser(user.id);
      setUser(fresh);
      const b = await fetchMyBets(user.id);
      setMyBets(b);
      const txs = await fetchTransactions(user.id);
      setDeposits(txs.deposits);
      setWithdrawals(txs.withdrawals);
    } catch (err) {
      console.error('Refresh user error', err);
    } finally {
      setIsRefreshingUser(false);
    }
  };

  const handlePlaceBet = async (selection: BetSelection, amount: number) => {
    if (!user) {
      throw new Error('Please login first');
    }

    const res = await placeBet({
      userId: user.id,
      room: activeRoom,
      selection,
      amount,
    });

    setUser(prev => (prev ? { ...prev, balance: res.updatedBalance } : null));
    const updatedBets = await fetchMyBets(user.id);
    setMyBets(updatedBets);
  };

  const handleDepositSubmit = async (amount: number, utr: string, instantSimulated?: boolean) => {
    if (!user) return;
    const res = await submitDeposit({
      userId: user.id,
      amount,
      utr,
      instantSimulated,
    });

    setUser(prev => (prev ? { ...prev, balance: res.updatedBalance } : null));
    const txs = await fetchTransactions(user.id);
    setDeposits(txs.deposits);
  };

  const handleWithdrawalSubmit = async (params: {
    amount: number;
    type: 'UPI' | 'BANK';
    upiId?: string;
    bankDetails?: {
      accountNumber: string;
      ifscCode: string;
      holderName: string;
      bankName: string;
    };
  }) => {
    if (!user) return;
    const res = await submitWithdrawal({
      userId: user.id,
      ...params,
    });

    setUser(prev => (prev ? { ...prev, balance: res.updatedBalance } : null));
    const txs = await fetchTransactions(user.id);
    setWithdrawals(txs.withdrawals);
  };

  useEffect(() => {
    if (user?.isBanned) {
      localStorage.setItem('rw_device_banned', 'true');
      setIsDeviceBanned(true);
    }
  }, [user]);

  if (isDeviceBanned) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white font-sans select-none">
        <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/40 mb-4 animate-bounce">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-rose-500 uppercase tracking-wider mb-2">
          DEVICE & HARDWARE RESTRICTED
        </h1>
        <p className="text-xs text-slate-300 max-w-xs leading-relaxed mb-6 font-medium">
          This device has been permanently flagged and banned due to suspicious activity or policy violations. Access to RealWin is blocked from this device.
        </p>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-[11px] font-mono text-slate-400">
          SECURITY CODE: ERR_DEVICE_PERMA_BAN
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Main Platform Lobby / Landing Page */}
        <Route
          path="/"
          element={
            <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
              <LandingPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
              <LandingPage user={user} />
            </ProtectedRoute>
          }
        />

        {/* Auth Pages */}
        <Route
          path="/login"
          element={
            isCheckingAuth ? (
              <div className="min-h-screen bg-[#f7f8ff] flex flex-col items-center justify-center p-4 font-sans select-none">
                <RealWinLogo size="lg" lightMode={true} />
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-500 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#ff5353]" />
                  <span>Verifying session...</span>
                </div>
              </div>
            ) : user ? (
              <Navigate to="/game" replace />
            ) : (
              <AuthPage
                onSuccess={u => {
                  setUser(u);
                  localStorage.setItem('realwin_user_phone', u.phone);
                }}
              />
            )
          }
        />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/auth" element={<Navigate to="/login" replace />} />

        {/* Main WinGo Game Page & Specific Room Routes */}
        <Route
          path="/game"
          element={
            <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
              <GamePage
                user={user}
                gameState={gameState}
                activeRoom={activeRoom}
                onChangeRoom={room => {
                  setActiveRoom(room);
                  setLastPeriodId('');
                }}
                history={history}
                myBets={myBets}
                onPlaceBet={handlePlaceBet}
                onRefreshUser={handleRefreshUser}
                isRefreshing={isRefreshingUser}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/game/30s" element={<Navigate to="/game?room=WINGO_30S" replace />} />
        <Route path="/game/1m" element={<Navigate to="/game?room=WINGO_1M" replace />} />

        {/* Wallet Page & Specific Sub-Routes */}
        <Route
          path="/wallet"
          element={
            <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
              <WalletPage
                user={user}
                settings={settings}
                deposits={deposits}
                withdrawals={withdrawals}
                onSubmitDeposit={handleDepositSubmit}
                onSubmitWithdrawal={handleWithdrawalSubmit}
                onRefreshUser={handleRefreshUser}
                isRefreshing={isRefreshingUser}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/deposit" element={<Navigate to="/wallet?tab=DEPOSIT" replace />} />
        <Route path="/wallet/deposit" element={<Navigate to="/wallet?tab=DEPOSIT" replace />} />
        <Route path="/withdraw" element={<Navigate to="/wallet?tab=WITHDRAW" replace />} />
        <Route path="/wallet/withdraw" element={<Navigate to="/wallet?tab=WITHDRAW" replace />} />
        <Route path="/history" element={<Navigate to="/wallet?tab=HISTORY" replace />} />
        <Route path="/wallet/history" element={<Navigate to="/wallet?tab=HISTORY" replace />} />

        {/* Profile / Account Page */}
        <Route
          path="/account"
          element={
            <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
              <ProfilePage
                user={user}
                onRefreshUser={handleRefreshUser}
                isRefreshing={isRefreshingUser}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
              <ProfilePage
                user={user}
                onRefreshUser={handleRefreshUser}
                isRefreshing={isRefreshingUser}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard Page */}
        <Route
          path="/admin"
          element={
            <AdminPage
              user={user}
              onRefreshGlobalState={syncServer}
            />
          }
        />

        {/* Fair Play Verification Page */}
        <Route
          path="/fairplay"
          element={
            <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
              <FairPlayPage
                user={user}
                historyRounds={history}
              />
            </ProtectedRoute>
          }
        />

        {/* Game Rules Page */}
        <Route
          path="/rules"
          element={
            <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
              <RulesPage
                user={user}
              />
            </ProtectedRoute>
          }
        />

        {/* 24/7 Support Page */}
        <Route
          path="/support"
          element={
            <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
              <SupportPage
                user={user}
                deposits={deposits}
                withdrawals={withdrawals}
                myBets={myBets}
              />
            </ProtectedRoute>
          }
        />

        {/* Referral VIP Rewards Page */}
        <Route
          path="/referral"
          element={
            <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
              <ReferralPage
                user={user}
              />
            </ProtectedRoute>
          }
        />

        {/* My Bid History & Audit Log Page */}
        <Route
          path="/bids"
          element={
            <ProtectedRoute user={user} isCheckingAuth={isCheckingAuth}>
              <BidHistoryPage
                user={user}
                myBets={myBets}
                history={history}
                onRefreshUser={syncServer}
                isRefreshing={isRefreshingUser}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/bid-history" element={<Navigate to="/bids" replace />} />

        {/* Compliance & Cashfree Policy Pages */}
        <Route path="/terms" element={<PolicyPage user={user} defaultTab="TERMS" />} />
        <Route path="/privacy" element={<PolicyPage user={user} defaultTab="PRIVACY" />} />
        <Route path="/refunds" element={<PolicyPage user={user} defaultTab="REFUND" />} />
        <Route path="/contact" element={<PolicyPage user={user} defaultTab="CONTACT" />} />
        <Route path="/pricing" element={<PolicyPage user={user} defaultTab="SERVICES" />} />
        <Route path="/policies" element={<PolicyPage user={user} defaultTab="TERMS" />} />

        {/* Default route redirect to /game */}
        <Route path="*" element={<Navigate to="/game" replace />} />
      </Routes>
      {user && <BottomNav />}
      <GameResultModal data={resultModalData} onClose={handleCloseResultModal} />
    </BrowserRouter>
  );
}
