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
import { ScrollToTop } from './components/ScrollToTop';
import { BottomNav } from './components/BottomNav';
import { GameResultModal, GameResultModalData } from './components/GameResultModal';
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
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

    setResultModalData({
      period: targetPeriod,
      room: periodBets[0].room,
      round: matchedRound,
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
        return;
      }
      try {
        const u = await loginUser(savedPhone);
        setUser(u);
      } catch (err) {
        console.error('Failed to init user', err);
        setUser(null);
      }
    }
    initUser();
  }, []);

  // Synchronized sync loop based on active room
  const syncServer = useCallback(async () => {
    try {
      const state = await fetchGameState(activeRoom);
      setGameState(state);

      if (state.period !== lastPeriodId) {
        setLastPeriodId(state.period);

        const histData = await fetchGameHistory(1, 100, activeRoom);
        setHistory(histData.rounds);

        if (user) {
          const freshUser = await fetchUser(user.id);
          setUser(freshUser);

          const freshBets = await fetchMyBets(user.id);
          setMyBets(freshBets);
        }
      }
    } catch (err) {
      console.error('Error syncing game state:', err);
    }
  }, [activeRoom, lastPeriodId, user]);

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

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Main Platform Lobby / Landing Page */}
        <Route path="/" element={<LandingPage user={user} />} />
        <Route path="/home" element={<LandingPage user={user} />} />

        {/* Auth Pages */}
        <Route
          path="/login"
          element={
            <AuthPage
              onSuccess={u => {
                setUser(u);
                localStorage.setItem('realwin_user_phone', u.phone);
              }}
            />
          }
        />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/auth" element={<Navigate to="/login" replace />} />

        {/* Main WinGo Game Page & Specific Room Routes */}
        <Route
          path="/game"
          element={
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
          }
        />
        <Route path="/game/30s" element={<Navigate to="/game?room=WINGO_30S" replace />} />
        <Route path="/game/1m" element={<Navigate to="/game?room=WINGO_1M" replace />} />

        {/* Wallet Page & Specific Sub-Routes */}
        <Route
          path="/wallet"
          element={
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
            <ProfilePage
              user={user}
              onRefreshUser={handleRefreshUser}
              isRefreshing={isRefreshingUser}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProfilePage
              user={user}
              onRefreshUser={handleRefreshUser}
              isRefreshing={isRefreshingUser}
            />
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
            <FairPlayPage
              user={user}
              historyRounds={history}
            />
          }
        />

        {/* Game Rules Page */}
        <Route
          path="/rules"
          element={
            <RulesPage
              user={user}
            />
          }
        />

        {/* 24/7 Support Page */}
        <Route
          path="/support"
          element={
            <SupportPage
              user={user}
              deposits={deposits}
              withdrawals={withdrawals}
              myBets={myBets}
            />
          }
        />

        {/* Referral VIP Rewards Page */}
        <Route
          path="/referral"
          element={
            <ReferralPage
              user={user}
            />
          }
        />

        {/* Default route redirect to /game */}
        <Route path="*" element={<Navigate to="/game" replace />} />
      </Routes>
      <BottomNav />
      <GameResultModal data={resultModalData} onClose={handleCloseResultModal} />
    </BrowserRouter>
  );
}
