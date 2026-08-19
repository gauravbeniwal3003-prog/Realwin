import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { RealWinLogo } from '../components/RealWinLogo';
import {
  Lock,
  RefreshCw,
  Zap,
  Settings,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  Users,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Edit3,
  Trash2,
  X,
  Save,
  Plus,
  Shield,
  MessageCircle,
  Phone,
  Gift,
  Percent,
  Key,
  ToggleLeft,
  ToggleRight,
  Megaphone,
  Calendar,
} from 'lucide-react';
import { AdminStats, DepositRequest, WithdrawalRequest, User, SystemSettings } from '../types';
import {
  adminLogin,
  fetchAdminStats,
  fetchAdminDeposits,
  approveDeposit,
  rejectDeposit,
  fetchAdminWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  fetchAdminUsers,
  updateUserBalance,
  overrideRoundNumber,
  fetchLiveBets,
  updateAdminSettings,
  fetchAdminPeriods,
  addOrEditAdminPeriod,
  fetchOverrideInfo,
  clearScheduledOverride,
  updateAdminUser,
  deleteAdminUser,
  updateAdminDeposit,
  deleteAdminDeposit,
  updateAdminWithdrawal,
  deleteAdminWithdrawal,
  deleteAdminPeriod,
} from '../lib/api';
import { GameRound } from '../types';

interface AdminPageProps {
  user: User | null;
  onRefreshGlobalState: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ user, onRefreshGlobalState }) => {
  const navigate = useNavigate();
  const [pinInput, setPinInput] = useState<string>('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DEPOSITS' | 'WITHDRAWALS' | 'USERS' | 'GAME_CONTROL' | 'PERIODS' | 'SETTINGS'>('OVERVIEW');

  // Data State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [liveBets, setLiveBets] = useState<any>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [dbRounds, setDbRounds] = useState<GameRound[]>([]);

  // Override & Game Control State
  const [selectedOverrideRoom, setSelectedOverrideRoom] = useState<'WINGO_30S' | 'WINGO_1M'>('WINGO_30S');
  const [overrideInfo, setOverrideInfo] = useState<any>(null);
  const [schedulePeriodInput, setSchedulePeriodInput] = useState<string>('');
  const [scheduleNumberInput, setScheduleNumberInput] = useState<number>(5);
  const [overrideSubTab, setOverrideSubTab] = useState<'QUICK' | 'SCHEDULE'>('QUICK');
  const [showActiveOverrideDetails, setShowActiveOverrideDetails] = useState<boolean>(true);
  const [showScheduledList, setShowScheduledList] = useState<boolean>(true);

  const loadOverrideData = async (room = selectedOverrideRoom) => {
    try {
      const data = await fetchOverrideInfo(room);
      setOverrideInfo(data);
      // Only set initial period if the input is totally blank and never touched
      setSchedulePeriodInput(prev => (prev === '' ? data.activePeriod : prev));
    } catch (err) {
      console.error('Failed to load override info', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'GAME_CONTROL') {
      loadOverrideData(selectedOverrideRoom);
      const interval = setInterval(() => {
        loadOverrideData(selectedOverrideRoom);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab, selectedOverrideRoom]);

  const handleSetNextOverride = async (num: number | null) => {
    try {
      // Optimistic update for instant visual feedback on single click
      setOverrideInfo((prev: any) => prev ? { ...prev, activeOverrideNumber: num } : prev);
      const msg = await overrideRoundNumber({
        number: num,
        room: selectedOverrideRoom,
        period: overrideInfo?.activePeriod,
      });
      setFeedbackMsg({ type: 'SUCCESS', text: msg });
      loadOverrideData(selectedOverrideRoom);
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to override result' });
      loadOverrideData(selectedOverrideRoom);
    }
  };

  const handleSchedulePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulePeriodInput.trim()) {
      setFeedbackMsg({ type: 'ERROR', text: 'Please enter a target Period Number' });
      return;
    }
    try {
      const msg = await overrideRoundNumber({
        number: scheduleNumberInput,
        room: selectedOverrideRoom,
        period: schedulePeriodInput.trim(),
      });
      setFeedbackMsg({ type: 'SUCCESS', text: msg });
      loadOverrideData(selectedOverrideRoom);
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to schedule override' });
    }
  };

  const handleClearScheduled = async (period: string, room?: string) => {
    try {
      const msg = await clearScheduledOverride(period, room || selectedOverrideRoom);
      setFeedbackMsg({ type: 'SUCCESS', text: msg });
      loadOverrideData(selectedOverrideRoom);
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to clear scheduled override' });
    }
  };

  // Period Form State
  const [periodInput, setPeriodInput] = useState<string>('');
  const [periodNumberInput, setPeriodNumberInput] = useState<number>(5);
  const [periodRoomInput, setPeriodRoomInput] = useState<string>('WINGO_30S');
  const [periodSearch, setPeriodSearch] = useState<string>('');

  // Edit Modal States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingDeposit, setEditingDeposit] = useState<DepositRequest | null>(null);
  const [editingWithdrawal, setEditingWithdrawal] = useState<WithdrawalRequest | null>(null);

  // Form states
  const [userSearch, setUserSearch] = useState<string>('');
  const [upiIdInput, setUpiIdInput] = useState<string>('');
  const [upiNameInput, setUpiNameInput] = useState<string>('');
  const [minDepInput, setMinDepInput] = useState<number>(500);
  const [maxDepInput, setMaxDepInput] = useState<number>(5000);
  const [minWthInput, setMinWthInput] = useState<number>(300);
  const [maxWthInput, setMaxWthInput] = useState<number>(300000);
  const [supportTelegramInput, setSupportTelegramInput] = useState<string>('');
  const [supportPhoneInput, setSupportPhoneInput] = useState<string>('');
  const [noticeMarqueeInput, setNoticeMarqueeInput] = useState<string>('');
  const [signupBonusInput, setSignupBonusInput] = useState<number>(20);
  const [referralCommissionPercentInput, setReferralCommissionPercentInput] = useState<number>(5);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [maintenanceModeInput, setMaintenanceModeInput] = useState<boolean>(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cooldownSecs, setCooldownSecs] = useState<number>(0);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldownSecs > 0) {
      timer = setInterval(() => {
        setCooldownSecs(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownSecs]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSecs > 0 || loginLoading) return;

    setLoginLoading(true);
    setAuthError(null);
    try {
      const ok = await adminLogin(pinInput);
      if (ok) {
        setIsAuthenticated(true);
        loadAdminData();
      }
    } catch (err: any) {
      const msg = err.message || 'Invalid PIN';
      setAuthError(msg);
      setCooldownSecs(3);
    } finally {
      setLoginLoading(false);
    }
  };

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [s, dep, wth, usr, live, per] = await Promise.all([
        fetchAdminStats(),
        fetchAdminDeposits(),
        fetchAdminWithdrawals(),
        fetchAdminUsers(),
        fetchLiveBets(),
        fetchAdminPeriods(),
      ]);
      setStats(s);
      setDeposits(dep);
      setWithdrawals(wth);
      setUsers(usr);
      setLiveBets(live);
      if (per && per.rounds) {
        setDbRounds(per.rounds);
      }
      if (s.settings) {
        setSettings(s.settings);
        setUpiIdInput(s.settings.upiId || '');
        setUpiNameInput(s.settings.upiName || '');
        setMinDepInput(s.settings.minDeposit || 500);
        setMaxDepInput(s.settings.maxDeposit || 5000);
        setMinWthInput(s.settings.minWithdrawal || 300);
        setMaxWthInput(s.settings.maxWithdrawal || 300000);
        setSupportTelegramInput(s.settings.supportTelegram || '');
        setSupportPhoneInput(s.settings.supportPhone || '');
        setNoticeMarqueeInput(s.settings.noticeMarquee || '');
        setSignupBonusInput(s.settings.signupBonus ?? 20);
        setReferralCommissionPercentInput(s.settings.referralCommissionPercent ?? 5);
        setAdminPinInput(s.settings.adminPin || '');
        setMaintenanceModeInput(!!s.settings.maintenanceMode);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodInput.trim()) {
      setFeedbackMsg({ type: 'ERROR', text: 'Please enter a Period ID' });
      return;
    }
    try {
      await addOrEditAdminPeriod({
        period: periodInput.trim(),
        room: periodRoomInput,
        number: Number(periodNumberInput),
      });
      setFeedbackMsg({ type: 'SUCCESS', text: `Period ${periodInput} successfully added/updated in Supabase Database!` });
      setPeriodInput('');
      loadAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to save period' });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  const handleApproveDeposit = async (id: string) => {
    try {
      await approveDeposit(id);
      setFeedbackMsg({ type: 'SUCCESS', text: 'Deposit approved and user wallet credited!' });
      loadAdminData();
      onRefreshGlobalState();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to approve' });
    }
  };

  const handleRejectDeposit = async (id: string) => {
    try {
      await rejectDeposit(id, 'Invalid UTR reference');
      setFeedbackMsg({ type: 'SUCCESS', text: 'Deposit rejected.' });
      loadAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to reject' });
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    try {
      await approveWithdrawal(id);
      setFeedbackMsg({ type: 'SUCCESS', text: 'Withdrawal marked as Paid / Processed!' });
      loadAdminData();
      onRefreshGlobalState();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to process' });
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    try {
      await rejectWithdrawal(id, 'Incorrect bank or UPI details');
      setFeedbackMsg({ type: 'SUCCESS', text: 'Withdrawal rejected & balance refunded to user.' });
      loadAdminData();
      onRefreshGlobalState();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to reject' });
    }
  };

  const handleUpdateBalance = async (userId: string, delta: number) => {
    try {
      await updateUserBalance(userId, { delta });
      setFeedbackMsg({ type: 'SUCCESS', text: `Updated user balance by ₹${delta}` });
      loadAdminData();
      onRefreshGlobalState();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message });
    }
  };

  const handleSetOverride = async (num: number | null) => {
    try {
      const msg = await overrideRoundNumber({ number: num });
      setFeedbackMsg({ type: 'SUCCESS', text: msg });
      loadAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message });
    }
  };

  const handleSaveFullUser = async (updated: User) => {
    try {
      await updateAdminUser(updated.id, {
        phone: updated.phone,
        name: updated.name,
        balance: updated.balance,
        vipLevel: updated.vipLevel,
        isBanned: updated.isBanned,
        password: updated.password,
        referredBy: updated.referredBy,
        referralEarnings: updated.referralEarnings,
      });
      setFeedbackMsg({ type: 'SUCCESS', text: `User ${updated.phone} updated successfully!` });
      setEditingUser(null);
      loadAdminData();
      onRefreshGlobalState();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to update user' });
    }
  };

  const handleDeleteUser = async (id: string, phone: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${phone}? This cannot be undone.`)) return;
    try {
      const msg = await deleteAdminUser(id);
      setFeedbackMsg({ type: 'SUCCESS', text: msg });
      setEditingUser(null);
      loadAdminData();
      onRefreshGlobalState();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to delete user' });
    }
  };

  const handleSaveDeposit = async (updated: DepositRequest) => {
    try {
      await updateAdminDeposit(updated.id, {
        amount: updated.amount,
        utr: updated.utr,
        status: updated.status,
        paymentMethod: updated.paymentMethod,
      });
      setFeedbackMsg({ type: 'SUCCESS', text: 'Deposit details updated!' });
      setEditingDeposit(null);
      loadAdminData();
      onRefreshGlobalState();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to update deposit' });
    }
  };

  const handleDeleteDeposit = async (id: string) => {
    if (!window.confirm('Delete this deposit request?')) return;
    try {
      const msg = await deleteAdminDeposit(id);
      setFeedbackMsg({ type: 'SUCCESS', text: msg });
      setEditingDeposit(null);
      loadAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to delete deposit' });
    }
  };

  const handleSaveWithdrawal = async (updated: WithdrawalRequest) => {
    try {
      await updateAdminWithdrawal(updated.id, {
        amount: updated.amount,
        type: updated.type,
        upiId: updated.upiId,
        accountNumber: updated.bankDetails?.accountNumber,
        ifscCode: updated.bankDetails?.ifscCode,
        holderName: updated.bankDetails?.holderName,
        bankName: updated.bankDetails?.bankName,
        status: updated.status,
      });
      setFeedbackMsg({ type: 'SUCCESS', text: 'Withdrawal details updated!' });
      setEditingWithdrawal(null);
      loadAdminData();
      onRefreshGlobalState();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to update withdrawal' });
    }
  };

  const handleDeleteWithdrawal = async (id: string) => {
    if (!window.confirm('Delete this withdrawal request?')) return;
    try {
      const msg = await deleteAdminWithdrawal(id);
      setFeedbackMsg({ type: 'SUCCESS', text: msg });
      setEditingWithdrawal(null);
      loadAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to delete withdrawal' });
    }
  };

  const handleDeletePeriod = async (period: string) => {
    if (!window.confirm(`Delete period #${period} from database?`)) return;
    try {
      const msg = await deleteAdminPeriod(period);
      setFeedbackMsg({ type: 'SUCCESS', text: msg });
      loadAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message || 'Failed to delete period' });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAdminSettings({
        upiId: upiIdInput,
        upiName: upiNameInput,
        minDeposit: minDepInput,
        maxDeposit: maxDepInput,
        minWithdrawal: minWthInput,
        maxWithdrawal: maxWthInput,
        supportTelegram: supportTelegramInput,
        supportPhone: supportPhoneInput,
        noticeMarquee: noticeMarqueeInput,
        signupBonus: signupBonusInput,
        referralCommissionPercent: referralCommissionPercentInput,
        adminPin: adminPinInput,
        maintenanceMode: maintenanceModeInput,
      });
      setFeedbackMsg({ type: 'SUCCESS', text: 'All System Settings saved and updated live!' });
      loadAdminData();
      onRefreshGlobalState();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message });
    }
  };

  // Auth Card Redesign
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none">
        <Header user={user} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 w-full max-w-md rounded-3xl p-6 shadow-xl space-y-5">
            <div className="text-center space-y-3">
              <RealWinLogo size="lg" lightMode={true} />
              <div>
                <h3 className="font-heading text-lg font-black text-gray-900">Admin Control Portal</h3>
                <p className="text-xs text-gray-500 font-medium">Enter Admin PIN to authenticate and manage platform operations</p>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{authError}</span>
                </div>
                {cooldownSecs > 0 && (
                  <p className="text-[11px] text-rose-600 font-semibold pl-6">
                    🛡️ Anti Brute Force Protection: Access paused for {cooldownSecs} second{cooldownSecs > 1 ? 's' : ''}...
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-600">Admin Access Key</label>
                  <span className="text-[10px] text-gray-400 font-semibold">Protected with 3s Anti-Brute Force Delay</span>
                </div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  placeholder="Enter Access Key"
                  disabled={cooldownSecs > 0 || loginLoading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-center text-lg font-mono tracking-widest text-gray-900 focus:outline-none focus:border-[#ff5353] disabled:opacity-50"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/game')}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition"
                >
                  Exit
                </button>
                <button
                  type="submit"
                  disabled={cooldownSecs > 0 || loginLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-[#ff5652] to-[#ff3b38] hover:from-[#e04541] hover:to-[#e02d2a] text-white font-extrabold rounded-2xl text-xs shadow-md transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5"
                >
                  {loginLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating (3s Delay)...</span>
                    </>
                  ) : cooldownSecs > 0 ? (
                    <span>Wait ({cooldownSecs}s)...</span>
                  ) : (
                    <span>Authenticate</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const pendingDeposits = deposits.filter(d => d.status === 'PENDING');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING');

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none pb-24">
      <Header user={user} />

      <main className="max-w-5xl w-full mx-auto px-3 py-4 space-y-4 flex-1">
        {/* Top Header Banner Bar */}
        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <RealWinLogo size="md" lightMode={true} />
            <div className="border-l border-gray-200 pl-2.5">
              <h2 className="font-heading text-sm sm:text-base font-black text-gray-900 leading-tight">Admin Control Portal</h2>
              <span className="text-[11px] sm:text-xs text-gray-500 font-medium block">Live financial management & game control</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            <button
              onClick={loadAdminData}
              className={`p-2.5 rounded-xl sm:rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition ${isLoading ? 'animate-spin' : ''}`}
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/game')}
              className="px-4 py-2.5 rounded-xl sm:rounded-2xl bg-[#ff5353] hover:bg-[#e04343] text-white font-bold text-xs flex-1 sm:flex-initial transition active:scale-95 shadow-xs text-center"
            >
              Back to Game
            </button>
          </div>
        </div>

        {/* Tab Navigation (Horizontally scrollable on mobile) */}
        <div className="flex bg-white border border-gray-100 rounded-2xl p-1 overflow-x-auto gap-1 shadow-xs no-scrollbar scrollbar-none snap-x touch-pan-x">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap shrink-0 snap-start ${
              activeTab === 'OVERVIEW'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab('DEPOSITS')}
            className={`px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap shrink-0 snap-start flex items-center gap-1.5 ${
              activeTab === 'DEPOSITS'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>Deposits</span>
            {pendingDeposits.length > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {pendingDeposits.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('WITHDRAWALS')}
            className={`px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap shrink-0 snap-start flex items-center gap-1.5 ${
              activeTab === 'WITHDRAWALS'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>Withdrawals (2h)</span>
            {pendingWithdrawals.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {pendingWithdrawals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap shrink-0 snap-start ${
              activeTab === 'USERS'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Users
          </button>

          <button
            onClick={() => setActiveTab('GAME_CONTROL')}
            className={`px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap shrink-0 snap-start ${
              activeTab === 'GAME_CONTROL'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Result Override
          </button>

          <button
            onClick={() => setActiveTab('PERIODS')}
            className={`px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap shrink-0 snap-start flex items-center gap-1.5 ${
              activeTab === 'PERIODS'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>Database Periods</span>
            <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {dbRounds.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap shrink-0 snap-start ${
              activeTab === 'SETTINGS'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            UPI Settings
          </button>
        </div>

        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs ${
              feedbackMsg.type === 'SUCCESS'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-xs font-extrabold">✕</button>
          </div>
        )}

        {/* Tab Body Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          {/* 1. OVERVIEW */}
          {activeTab === 'OVERVIEW' && stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-black block">Total Registered Users</span>
                  <div className="font-heading text-2xl font-black text-gray-900">{stats.totalUsers}</div>
                </div>

                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-black block">Wallet Liabilities</span>
                  <div className="font-heading text-2xl font-black text-amber-600">
                    ₹{stats.totalWalletBalance.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-black block">Pending Deposits</span>
                  <div className="font-heading text-2xl font-black text-emerald-600">
                    {stats.pendingDepositsCount} (₹{stats.pendingDepositsAmount})
                  </div>
                </div>

                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-black block">Pending Withdrawals</span>
                  <div className="font-heading text-2xl font-black text-rose-600">
                    {stats.pendingWithdrawalsCount} (₹{stats.pendingWithdrawalsAmount})
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-1">
                  <span className="text-xs text-gray-500 uppercase font-extrabold block">Total Betting Volume</span>
                  <div className="font-heading text-xl font-black text-blue-600">
                    ₹{stats.totalVolumeBet.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-1">
                  <span className="text-xs text-gray-500 uppercase font-extrabold block">Net House Profit / Loss</span>
                  <div
                    className={`font-heading text-xl font-black ${
                      stats.netHouseMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    ₹{stats.netHouseMargin.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. DEPOSITS */}
          {activeTab === 'DEPOSITS' && (
            <div className="space-y-3">
              <h4 className="font-heading text-base font-black text-gray-900">Deposit Requests ({deposits.length})</h4>
              <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                <table className="w-full text-left text-xs text-gray-700 min-w-[650px]">
                  <thead className="bg-gray-50 text-gray-500 font-black text-[10px] uppercase border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">12-Digit UTR</th>
                      <th className="py-3 px-3">Method</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deposits.map(dep => (
                      <tr key={dep.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-3 font-bold text-gray-900">{dep.userName}</td>
                        <td className="py-3 px-3 font-bold text-emerald-600">₹{dep.amount}</td>
                        <td className="py-3 px-3 font-mono text-amber-700 font-bold">{dep.utr}</td>
                        <td className="py-3 px-3 text-gray-500 font-semibold">{dep.paymentMethod || 'UPI'}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              dep.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : dep.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {dep.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {dep.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApproveDeposit(dep.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] active:scale-95 transition"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectDeposit(dep.id)}
                                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-[11px] active:scale-95 transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setEditingDeposit(dep)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-[11px] transition flex items-center gap-1"
                              title="Edit Deposit"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteDeposit(dep.id)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-[11px] transition"
                              title="Delete Deposit"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {deposits.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-xs text-gray-400 italic">
                          No deposit requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. WITHDRAWALS */}
          {activeTab === 'WITHDRAWALS' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900 font-medium leading-relaxed">
                <strong className="font-bold">Manual Payout Policy:</strong> Process requests manually via PhonePe, Google Pay, or Netbanking within 2 hours. Click <strong>Mark Paid</strong> once transferred to update request status.
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                <table className="w-full text-left text-xs text-gray-700 min-w-[650px]">
                  <thead className="bg-gray-50 text-gray-500 font-black text-[10px] uppercase border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Payout Details</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {withdrawals.map(wth => (
                      <tr key={wth.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-3 font-bold text-gray-900">{wth.userName}</td>
                        <td className="py-3 px-3 font-bold text-amber-600">₹{wth.amount}</td>
                        <td className="py-3 px-3">
                          {wth.type === 'UPI' ? (
                            <span className="font-mono text-emerald-700 font-bold">UPI: {wth.upiId}</span>
                          ) : (
                            <span className="font-mono text-amber-800 font-bold">
                              A/C: {wth.bankDetails?.accountNumber} ({wth.bankDetails?.ifscCode})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              wth.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : wth.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {wth.status === 'APPROVED' ? 'PAID' : wth.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {wth.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApproveWithdrawal(wth.id)}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[11px] active:scale-95 transition"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  onClick={() => handleRejectWithdrawal(wth.id)}
                                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-[11px] active:scale-95 transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setEditingWithdrawal(wth)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-[11px] transition flex items-center gap-1"
                              title="Edit Withdrawal"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteWithdrawal(wth.id)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-[11px] transition"
                              title="Delete Withdrawal"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {withdrawals.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-gray-400 italic">
                          No withdrawal requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. USERS */}
          {activeTab === 'USERS' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-heading text-base font-black text-gray-900">Registered Users ({users.length})</h4>
                <input
                  type="text"
                  placeholder="Search name, phone or ID..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#ff5353] w-full sm:w-60"
                />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                <table className="w-full text-left text-xs text-gray-700 min-w-[650px]">
                  <thead className="bg-gray-50 text-gray-500 font-black text-[10px] uppercase border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-3">Name & Phone</th>
                      <th className="py-3 px-3">Balance</th>
                      <th className="py-3 px-3">VIP Level</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users
                      .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.phone.includes(userSearch))
                      .map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/60">
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">{u.name}</div>
                            <div className="font-mono text-gray-500 text-[11px]">{u.phone}</div>
                          </td>
                          <td className="py-3 px-3 font-bold text-amber-600">₹{u.balance}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black text-[10px] rounded-full border border-amber-200">
                              VIP {u.vipLevel || 0}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {u.isBanned ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black text-[10px] rounded-full">
                                BANNED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full">
                                ACTIVE
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleUpdateBalance(u.id, 500)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-extrabold text-[11px] transition"
                                title="Quick Add ₹500"
                              >
                                +₹500
                              </button>
                              <button
                                onClick={() => setEditingUser(u)}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-extrabold text-[11px] transition flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit User</span>
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.phone)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-extrabold text-[11px] transition"
                                title="Delete User"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-gray-400 italic">
                          No users registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. GAME_CONTROL - UPGRADED RESULT OVERRIDE PORTAL */}
          {activeTab === 'GAME_CONTROL' && (
            <div className="space-y-5">
              {/* Top Room/Window Selection Tabs */}
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>Select Game Room Window</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Real-Time Sync Active</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOverrideRoom('WINGO_30S');
                      loadOverrideData('WINGO_30S');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                      selectedOverrideRoom === 'WINGO_30S'
                        ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>⚡ 30 Seconds</span>
                    <span className="text-[10px] opacity-80 font-normal">(30s)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOverrideRoom('WINGO_1M');
                      loadOverrideData('WINGO_1M');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                      selectedOverrideRoom === 'WINGO_1M'
                        ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>⏱️ 1 Minute</span>
                    <span className="text-[10px] opacity-80 font-normal">(1m)</span>
                  </button>
                </div>
              </div>

              {/* Current Period & Live Timer Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Active Game Room</span>
                    <div className="text-base font-extrabold text-amber-400 flex items-center gap-2">
                      <span>{selectedOverrideRoom === 'WINGO_30S' ? 'Win Go 30 Seconds' : 'Win Go 1 Minute'}</span>
                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">Live Sync</span>
                    </div>
                  </div>

                  {/* Current Active Period Number */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Current Period Number</span>
                    <div className="text-xl font-mono font-black text-white flex items-center gap-1.5 justify-end">
                      <span>#{overrideInfo?.activePeriod || '---'}</span>
                      <button
                        onClick={() => {
                          if (overrideInfo?.activePeriod) {
                            navigator.clipboard.writeText(overrideInfo.activePeriod);
                            setFeedbackMsg({ type: 'SUCCESS', text: `Copied Period #${overrideInfo.activePeriod}` });
                          }
                        }}
                        className="p-1 hover:bg-slate-800 rounded-md text-xs text-slate-400 hover:text-white transition"
                        title="Copy Period Number"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* Live Countdown Timer */}
                  <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Time Remaining</span>
                      <span className={`text-2xl font-mono font-black ${overrideInfo?.isLocked ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                        00:{String(overrideInfo?.secondsRemaining ?? 0).padStart(2, '0')}s
                      </span>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${overrideInfo?.isLocked ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>
                        {overrideInfo?.isLocked ? '🔒 Locked' : '🟢 Betting Open'}
                      </span>
                    </div>
                  </div>

                  {/* Live Active Bets Info */}
                  <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 col-span-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Live Bets for Active Period</span>
                      <div className="text-sm font-extrabold text-slate-100 flex items-center gap-3 mt-0.5">
                        <span>{overrideInfo?.activeBetsCount || 0} Bets Placed</span>
                        <span className="text-amber-400 font-black">₹{(overrideInfo?.activeBetsVolume || 0).toLocaleString('en-IN')} Total</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => loadOverrideData(selectedOverrideRoom)}
                      className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition text-xs font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs Selector for Mode */}
              <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setOverrideSubTab('QUICK')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                    overrideSubTab === 'QUICK'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Option 1: Quick Next Round Override</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOverrideSubTab('SCHEDULE')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                    overrideSubTab === 'SCHEDULE'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-[#ff5353]" />
                  <span>Option 2: Schedule Specific Future Period</span>
                </button>
              </div>

              {/* SECTION 1: QUICK OVERRIDE */}
              {overrideSubTab === 'QUICK' && (
                <div className="bg-gray-50/80 p-5 rounded-3xl border border-gray-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                    <div>
                      <h4 className="font-heading text-sm font-black text-gray-900 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>Quick Next Round Result Override</span>
                      </h4>
                      <p className="text-xs text-gray-500 font-medium">
                        Click any number (0-9) to force that number as the winner for Period <span className="font-mono font-bold text-gray-800">#{overrideInfo?.activePeriod || '...'}</span>.
                      </p>
                    </div>

                    {(overrideInfo?.activeOverrideNumber !== null && overrideInfo?.activeOverrideNumber !== undefined) && (
                      <div className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1 rounded-full text-xs font-black flex items-center gap-2 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                        <span>Target Period #{overrideInfo?.activePeriod}: Number {overrideInfo.activeOverrideNumber}</span>
                        <button
                          onClick={() => handleSetNextOverride(null)}
                          className="ml-1 text-xs text-rose-600 hover:underline font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 10 Number Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { num: 0, label: 'Red + Violet', color: 'bg-gradient-to-r from-red-500 to-purple-600 text-white', tag: 'SMALL' },
                      { num: 1, label: 'Green', color: 'bg-emerald-500 text-white', tag: 'SMALL' },
                      { num: 2, label: 'Red', color: 'bg-red-500 text-white', tag: 'SMALL' },
                      { num: 3, label: 'Green', color: 'bg-emerald-500 text-white', tag: 'SMALL' },
                      { num: 4, label: 'Red', color: 'bg-red-500 text-white', tag: 'SMALL' },
                      { num: 5, label: 'Green + Violet', color: 'bg-gradient-to-r from-emerald-500 to-purple-600 text-white', tag: 'BIG' },
                      { num: 6, label: 'Red', color: 'bg-red-500 text-white', tag: 'BIG' },
                      { num: 7, label: 'Green', color: 'bg-emerald-500 text-white', tag: 'BIG' },
                      { num: 8, label: 'Red', color: 'bg-red-500 text-white', tag: 'BIG' },
                      { num: 9, label: 'Green', color: 'bg-emerald-500 text-white', tag: 'BIG' },
                    ].map(item => {
                      const isForced = overrideInfo?.activeOverrideNumber === item.num;
                      return (
                        <button
                          key={item.num}
                          type="button"
                          onClick={() => handleSetNextOverride(item.num)}
                          className={`p-3 rounded-2xl border flex flex-col items-center justify-between gap-1 transition shadow-xs relative overflow-hidden active:scale-95 ${
                            isForced
                              ? 'ring-4 ring-amber-400 border-amber-500 bg-amber-500/10 scale-105 animate-pulse shadow-md'
                              : 'hover:border-gray-400 bg-white'
                          }`}
                        >
                          {isForced && (
                            <span className="absolute -top-0.5 bg-amber-500 text-white font-black text-[8px] px-2 py-0.5 rounded-b-md shadow-xs animate-bounce tracking-widest">
                              FORCED
                            </span>
                          )}
                          <div className={`w-9 h-9 rounded-full ${item.color} flex items-center justify-center font-black text-lg shadow-sm ${isForced ? 'ring-2 ring-white animate-spin-slow' : ''}`}>
                            {item.num}
                          </div>
                          <span className="text-[10px] font-black text-gray-700 uppercase">{item.label}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.2 rounded-full ${isForced ? 'bg-amber-200 text-amber-900 font-black' : 'text-gray-500 bg-gray-200'}`}>
                            {item.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* One-Click Attribute Templates */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">⚡ One-Click Color & Size Templates</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { label: '🟢 FORCE GREEN', num: 7, color: 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black' },
                        { label: '🔴 FORCE RED', num: 8, color: 'bg-rose-600 hover:bg-rose-700 text-white text-xs font-black' },
                        { label: '🟣 FORCE VIOLET', num: 0, color: 'bg-purple-600 hover:bg-purple-700 text-white text-xs font-black' },
                        { label: '📊 FORCE BIG', num: 7, color: 'bg-amber-500 hover:bg-amber-600 text-white text-xs font-black' },
                        { label: '📉 FORCE SMALL', num: 3, color: 'bg-blue-500 hover:bg-blue-600 text-white text-xs font-black' },
                      ].map((btn, index) => {
                        const isMatched = overrideInfo?.activeOverrideNumber === btn.num;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSetNextOverride(btn.num)}
                            className={`py-3 px-3 rounded-2xl text-center transition flex items-center justify-center gap-1 active:scale-95 border ${
                              isMatched
                                ? 'ring-4 ring-amber-400 border-amber-500 bg-amber-500/15 text-amber-900 font-black scale-105 shadow-sm'
                                : `${btn.color} border-transparent`
                            }`}
                          >
                            <span>{btn.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explicit Statement Banner for Selected Result & Target Period */}
                  {overrideInfo?.activeOverrideNumber !== null && overrideInfo?.activeOverrideNumber !== undefined ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-400 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-amber-900 font-black text-xs sm:text-sm">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          </span>
                          <span>🎯 ACTIVE OVERRIDE: Number {overrideInfo.activeOverrideNumber} set for Period #{overrideInfo.activePeriod}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSetNextOverride(null)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition shadow-xs"
                        >
                          🔄 Cancel Override & Reset Auto
                        </button>
                      </div>
                      <p className="text-xs font-bold text-amber-950 leading-relaxed">
                        Period <span className="font-mono bg-amber-200/80 px-1.5 py-0.5 rounded font-black text-amber-900">#{overrideInfo.activePeriod}</span> ({selectedOverrideRoom === 'WINGO_30S' ? '30s Window' : '1 Min Window'}) par winner result strictly <span className="bg-amber-400 text-black px-2 py-0.5 rounded font-black font-mono">Number {overrideInfo.activeOverrideNumber}</span> severe hone wala hai.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs sm:text-sm">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>⚡ AUTOMATIC FAIR-PLAY ALGORITHM ACTIVE</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full">
                          Target Period #{overrideInfo?.activePeriod || '...'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 leading-relaxed">
                        Result automatic compute ho raha hai. Kisi specific number ko winner banane ke liye upar diye number par click karein.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleSetNextOverride(null)}
                      className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-2xl transition"
                    >
                      🔄 Reset Auto Mode for Next Round
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 2: SCHEDULE SPECIFIC FUTURE PERIOD */}
              {overrideSubTab === 'SCHEDULE' && (
                <div className="bg-gray-50/80 p-5 rounded-3xl border border-gray-200 space-y-4">
                  <div className="border-b border-gray-200 pb-3">
                    <h4 className="font-heading text-sm font-black text-gray-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#ff5353]" />
                      <span>Schedule Override for Specific Future Period</span>
                    </h4>
                    <p className="text-xs text-gray-500 font-medium">
                      Schedule the winning result for ANY upcoming period in advance.
                    </p>
                  </div>

                  <form onSubmit={handleSchedulePeriodSubmit} className="space-y-4 max-w-2xl">
                    {/* Period Input with Quick Prefills */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-700 block">Target Period Number ID</label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="e.g. 100245"
                          value={schedulePeriodInput}
                          onChange={e => setSchedulePeriodInput(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                        />

                        {/* Quick Prefill Buttons */}
                        {overrideInfo?.activePeriod && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-gray-500 font-bold mr-1">Quick Select:</span>
                            <button
                              type="button"
                              onClick={() => setSchedulePeriodInput(overrideInfo.activePeriod)}
                              className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 rounded-xl text-xs font-bold transition"
                            >
                              Current (#{overrideInfo.activePeriod})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const num = parseInt(overrideInfo.activePeriod, 10);
                                if (!isNaN(num)) setSchedulePeriodInput(String(num + 1));
                              }}
                              className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 rounded-xl text-xs font-bold transition"
                            >
                              Next (#{parseInt(overrideInfo.activePeriod, 10) + 1})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const num = parseInt(overrideInfo.activePeriod, 10);
                                if (!isNaN(num)) setSchedulePeriodInput(String(num + 2));
                              }}
                              className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 rounded-xl text-xs font-bold transition"
                            >
                              +2 (#{parseInt(overrideInfo.activePeriod, 10) + 2})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const num = parseInt(overrideInfo.activePeriod, 10);
                                if (!isNaN(num)) setSchedulePeriodInput(String(num + 5));
                              }}
                              className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 rounded-xl text-xs font-bold transition"
                            >
                              +5 (#{parseInt(overrideInfo.activePeriod, 10) + 5})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const num = parseInt(overrideInfo.activePeriod, 10);
                                if (!isNaN(num)) setSchedulePeriodInput(String(num + 10));
                              }}
                              className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 rounded-xl text-xs font-bold transition"
                            >
                              +10 (#{parseInt(overrideInfo.activePeriod, 10) + 10})
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Winning Number Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-700 block">Target Winning Number (0 - 9)</label>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setScheduleNumberInput(n)}
                            className={`py-2.5 rounded-xl border text-sm font-black transition ${
                              scheduleNumberInput === n
                                ? 'bg-[#ff5353] text-white border-[#ff5353] shadow-md ring-2 ring-[#ff5353]/30'
                                : 'bg-white text-gray-800 border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs transition shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lock Result for Period #{schedulePeriodInput || '...'} as Number {scheduleNumberInput}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* SECTION 3: SCHEDULED OVERRIDES LIST */}
              {overrideInfo?.scheduledOverrides && overrideInfo.scheduledOverrides.length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-2">
                      <span>📌 Active Scheduled Period Overrides ({overrideInfo.scheduledOverrides.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowScheduledList(!showScheduledList)}
                      className="text-xs font-bold text-amber-800 hover:text-amber-950 underline"
                    >
                      {showScheduledList ? 'Hide List ▲' : 'Show List ▼'}
                    </button>
                  </div>

                  {showScheduledList && (
                    <div className="overflow-x-auto rounded-2xl border border-amber-200 bg-white">
                      <table className="w-full text-left text-xs text-gray-700">
                        <thead className="bg-amber-100/60 text-amber-900 font-black text-[10px] uppercase border-b border-amber-200">
                          <tr>
                            <th className="py-2.5 px-3">Period ID</th>
                            <th className="py-2.5 px-3">Game Window</th>
                            <th className="py-2.5 px-3">Scheduled Result</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {overrideInfo.scheduledOverrides.map((item: any) => {
                            const isCurrent = item.period === overrideInfo?.activePeriod;
                            return (
                              <tr key={`${item.room || 'WINGO_30S'}-${item.period}`} className="hover:bg-amber-50/40">
                                <td className="py-2.5 px-3 font-mono font-bold text-gray-900">#{item.period}</td>
                                <td className="py-2.5 px-3 font-bold text-gray-600">
                                  {item.room === 'WINGO_30S' ? 'Win Go 30s' : item.room === 'WINGO_1M' ? 'Win Go 1 Min' : item.room}
                                </td>
                                <td className="py-2.5 px-3 font-bold">
                                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg font-mono font-black">
                                    Number {item.number}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  {isCurrent ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-extrabold text-[10px]">
                                      🟢 LIVE ACTIVE
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-extrabold text-[10px]">
                                      ⏳ UPCOMING
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => handleClearScheduled(item.period, item.room)}
                                    className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-extrabold rounded-lg text-xs transition"
                                  >
                                    Clear
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6. COMPLETE EDITABLE SETTINGS */}
          {activeTab === 'SETTINGS' && (
            <form onSubmit={handleSaveSettings} className="bg-gray-50/80 p-5 rounded-3xl border border-gray-100 space-y-5 max-w-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <h4 className="font-heading text-base font-black text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#ff5353]" />
                  <span>Full System & Payment Configuration</span>
                </h4>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#ff5353] hover:bg-[#e04343] text-white font-black rounded-2xl text-xs transition shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save All Settings</span>
                </button>
              </div>

              {/* Payment Info */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-200">
                <h5 className="font-heading text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>UPI Payment Details</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-gray-700 block">Official UPI ID</label>
                    <input
                      type="text"
                      value={upiIdInput}
                      onChange={e => setUpiIdInput(e.target.value.trim())}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                      placeholder="e.g. merchant@upi"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-gray-700 block">UPI Receiver / Merchant Name</label>
                    <input
                      type="text"
                      value={upiNameInput}
                      onChange={e => setUpiNameInput(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                      placeholder="e.g. RealWin Official"
                    />
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-200">
                <h5 className="font-heading text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  <span>Deposit & Withdrawal Limits</span>
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-gray-700 block">Min Deposit (₹)</label>
                    <input
                      type="number"
                      value={minDepInput}
                      onChange={e => setMinDepInput(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-gray-700 block">Max Deposit (₹)</label>
                    <input
                      type="number"
                      value={maxDepInput}
                      onChange={e => setMaxDepInput(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-gray-700 block">Min Withdrawal (₹)</label>
                    <input
                      type="number"
                      value={minWthInput}
                      onChange={e => setMinWthInput(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-gray-700 block">Max Withdrawal (₹)</label>
                    <input
                      type="number"
                      value={maxWthInput}
                      onChange={e => setMaxWthInput(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Support Links */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-200">
                <h5 className="font-heading text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  <span>Support Contacts</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-gray-700 block">Telegram Link / Handle</label>
                    <input
                      type="text"
                      value={supportTelegramInput}
                      onChange={e => setSupportTelegramInput(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                      placeholder="e.g. https://t.me/realwin_support"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-gray-700 block">WhatsApp / Phone Contact</label>
                    <input
                      type="text"
                      value={supportPhoneInput}
                      onChange={e => setSupportPhoneInput(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                      placeholder="e.g. +91 9876543210"
                    />
                  </div>
                </div>
              </div>

              {/* Bonuses & Security */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-200">
                <h5 className="font-heading text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-purple-600" />
                  <span>Promotions & Security</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-gray-700 block">New User Signup Bonus (₹)</label>
                    <input
                      type="number"
                      value={signupBonusInput}
                      onChange={e => setSignupBonusInput(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-gray-700 block">Referral Deposit Comm. (%)</label>
                    <input
                      type="number"
                      value={referralCommissionPercentInput}
                      onChange={e => setReferralCommissionPercentInput(Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-gray-700 block">Admin Security PIN</label>
                    <input
                      type="text"
                      value={adminPinInput}
                      onChange={e => setAdminPinInput(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                      placeholder="e.g. 1234"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-extrabold text-gray-700 block">Announcement Notice Marquee</label>
                  <input
                    type="text"
                    value={noticeMarqueeInput}
                    onChange={e => setNoticeMarqueeInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                    placeholder="e.g. Welcome to RealWin! Enjoy 24/7 instant withdrawals & 100% deposit bonus!"
                  />
                </div>

                {/* Maintenance Mode Toggle */}
                <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100 mt-2">
                  <div>
                    <span className="text-xs font-black text-rose-900 block">Maintenance Mode</span>
                    <span className="text-[11px] text-rose-700 font-medium">Temporarily disable user betting during maintenance</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaintenanceModeInput(!maintenanceModeInput)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                      maintenanceModeInput ? 'bg-rose-600 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {maintenanceModeInput ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    <span>{maintenanceModeInput ? 'ENABLED' : 'DISABLED'}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#ff5353] hover:bg-[#e04343] text-white font-extrabold rounded-2xl text-xs transition shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save All System Settings</span>
              </button>
            </form>
          )}

          {/* 7. PERIODS (SUPABASE DATABASE MANAGED) */}
          {activeTab === 'PERIODS' && (
            <div className="space-y-5">
              {/* Database Connection Banner */}
              <div className="p-4 bg-slate-900 rounded-3xl text-white space-y-2 border border-slate-800 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <h3 className="font-heading font-extrabold text-sm text-emerald-400">Supabase DB Active</h3>
                    <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-700">
                      tkvcianczzdxrjylrdyq.supabase.co
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-800/50">
                    Max Database Retention: 1,000 Periods
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Every game period result across all timer rooms (30s, 1m) is automatically recorded in Supabase. Server-side automatic pruning ensures maximum 1,000 historical periods are retained.
                </p>
              </div>

              {/* Add / Edit Period Form */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <h4 className="font-heading text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
                  <span>➕ Add or Modify Period Result in Database</span>
                </h4>
                <form onSubmit={handleAddPeriodSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Period ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 202608031024"
                      value={periodInput}
                      onChange={e => setPeriodInput(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-900 focus:outline-none focus:border-[#ff5353]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Game Room</label>
                    <select
                      value={periodRoomInput}
                      onChange={e => setPeriodRoomInput(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                    >
                      <option value="WINGO_30S">Win Go 30s</option>
                      <option value="WINGO_1M">Win Go 1 Min</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">Winning Number (0-9)</label>
                    <select
                      value={periodNumberInput}
                      onChange={e => setPeriodNumberInput(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-extrabold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <option key={n} value={n}>
                          {n} ({n === 0 ? 'Red+Violet' : n === 5 ? 'Green+Violet' : [1,3,7,9].includes(n) ? 'Green' : 'Red'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95"
                  >
                    Save to Supabase
                  </button>
                </form>
              </div>

              {/* Search & Period Table */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-heading text-xs font-black text-gray-900">
                    Stored Period Results ({dbRounds.length} / 1000)
                  </h4>
                  <input
                    type="text"
                    placeholder="Search Period ID or Room..."
                    value={periodSearch}
                    onChange={e => setPeriodSearch(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#ff5353] w-full sm:w-60"
                  />
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto shadow-xs">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50 text-[11px] font-extrabold text-gray-500 uppercase border-b border-gray-200">
                        <th className="py-2.5 px-3">Period ID</th>
                        <th className="py-2.5 px-3">Room</th>
                        <th className="py-2.5 px-3 text-center">Winning Number</th>
                        <th className="py-2.5 px-3">Colors</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3 text-right">Volume (₹)</th>
                        <th className="py-2.5 px-3 text-right font-mono">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {dbRounds
                        .filter(r => !periodSearch || r.period.includes(periodSearch) || (r.room && r.room.toLowerCase().includes(periodSearch.toLowerCase())))
                        .slice(0, 200)
                        .map(round => (
                          <tr key={`${round.period}-${round.room}`} className="hover:bg-gray-50/80 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{round.period}</td>
                            <td className="py-2.5 px-3 font-bold text-gray-600">
                              <span className="bg-gray-100 text-gray-800 text-[10px] px-2 py-0.5 rounded-md font-mono">
                                {round.room || 'WINGO_30S'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-white text-xs shadow-xs ${
                                  round.number === 0
                                    ? 'bg-gradient-to-br from-rose-500 to-purple-600'
                                    : round.number === 5
                                    ? 'bg-gradient-to-br from-emerald-500 to-purple-600'
                                    : [1, 3, 7, 9].includes(round.number)
                                    ? 'bg-emerald-500'
                                    : 'bg-rose-500'
                                }`}
                              >
                                {round.number}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex gap-1">
                                {round.colors.map((c, i) => (
                                  <span
                                    key={i}
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                                      c === 'GREEN' ? 'bg-emerald-500' : c === 'RED' ? 'bg-rose-500' : 'bg-purple-600'
                                    }`}
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-extrabold text-gray-700">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${round.bigSmall === 'BIG' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                {round.bigSmall}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">₹{(round.totalBetsAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setPeriodInput(round.period);
                                    setPeriodRoomInput(round.room || 'WINGO_30S');
                                    setPeriodNumberInput(round.number);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePeriod(round.period)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-bold transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      {dbRounds.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-gray-400 italic">
                            No database periods found yet. Plays rounds to populate automatically!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-heading font-black text-base text-gray-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#ff5353]" />
                <span>Edit User: {editingUser.name}</span>
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingUser.phone}
                    onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">Wallet Balance (₹)</label>
                  <input
                    type="number"
                    value={editingUser.balance}
                    onChange={e => setEditingUser({ ...editingUser, balance: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-emerald-600 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">VIP Level (0-10)</label>
                  <input
                    type="number"
                    value={editingUser.vipLevel || 0}
                    onChange={e => setEditingUser({ ...editingUser, vipLevel: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-gray-700 block mb-1">Account Password</label>
                <input
                  type="text"
                  value={editingUser.password || ''}
                  onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  placeholder="Leave empty or set new password"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">Referred By Code</label>
                  <input
                    type="text"
                    value={editingUser.referredBy || ''}
                    onChange={e => setEditingUser({ ...editingUser, referredBy: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">Referral Earnings (₹)</label>
                  <input
                    type="number"
                    value={editingUser.referralEarnings || 0}
                    onChange={e => setEditingUser({ ...editingUser, referralEarnings: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 mt-2">
                <div>
                  <span className="text-xs font-extrabold text-gray-900 block">Ban User Account</span>
                  <span className="text-[11px] text-gray-500 font-medium">Banned users cannot login or place bets</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser({ ...editingUser, isBanned: !editingUser.isBanned })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    editingUser.isBanned ? 'bg-rose-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {editingUser.isBanned ? 'BANNED' : 'ACTIVE'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
              <button
                type="button"
                onClick={() => handleDeleteUser(editingUser.id, editingUser.phone)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-xs transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveFullUser(editingUser)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition shadow-sm"
                >
                  Save User Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT DEPOSIT MODAL */}
      {editingDeposit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-heading font-black text-base text-gray-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>Edit Deposit #{editingDeposit.id.slice(0, 8)}</span>
              </h3>
              <button
                onClick={() => setEditingDeposit(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-gray-700 block mb-1">Deposit Amount (₹)</label>
                <input
                  type="number"
                  value={editingDeposit.amount}
                  onChange={e => setEditingDeposit({ ...editingDeposit, amount: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-600 focus:outline-none focus:border-[#ff5353]"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-gray-700 block mb-1">12-Digit UTR Reference</label>
                <input
                  type="text"
                  value={editingDeposit.utr}
                  onChange={e => setEditingDeposit({ ...editingDeposit, utr: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-gray-700 block mb-1">Payment Method</label>
                <input
                  type="text"
                  value={editingDeposit.paymentMethod || 'UPI'}
                  onChange={e => setEditingDeposit({ ...editingDeposit, paymentMethod: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-gray-700 block mb-1">Status</label>
                <select
                  value={editingDeposit.status}
                  onChange={e => setEditingDeposit({ ...editingDeposit, status: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-black text-gray-900 focus:outline-none focus:border-[#ff5353]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
              <button
                type="button"
                onClick={() => handleDeleteDeposit(editingDeposit.id)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-xs transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDeposit(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDeposit(editingDeposit)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition shadow-sm"
                >
                  Save Deposit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT WITHDRAWAL MODAL */}
      {editingWithdrawal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-heading font-black text-base text-gray-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>Edit Withdrawal #{editingWithdrawal.id.slice(0, 8)}</span>
              </h3>
              <button
                onClick={() => setEditingWithdrawal(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-gray-700 block mb-1">Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  value={editingWithdrawal.amount}
                  onChange={e => setEditingWithdrawal({ ...editingWithdrawal, amount: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-600 focus:outline-none focus:border-[#ff5353]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">Payout Type</label>
                  <select
                    value={editingWithdrawal.type}
                    onChange={e => setEditingWithdrawal({ ...editingWithdrawal, type: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-extrabold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  >
                    <option value="UPI">UPI</option>
                    <option value="BANK">BANK</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">Status</label>
                  <select
                    value={editingWithdrawal.status}
                    onChange={e => setEditingWithdrawal({ ...editingWithdrawal, status: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-black text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED (PAID)</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>

              {editingWithdrawal.type === 'UPI' ? (
                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">Payout UPI ID</label>
                  <input
                    type="text"
                    value={editingWithdrawal.upiId || ''}
                    onChange={e => setEditingWithdrawal({ ...editingWithdrawal, upiId: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-extrabold text-gray-700 block mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={editingWithdrawal.bankDetails?.accountNumber || ''}
                      onChange={e =>
                        setEditingWithdrawal({
                          ...editingWithdrawal,
                          bankDetails: {
                            accountNumber: e.target.value,
                            ifscCode: editingWithdrawal.bankDetails?.ifscCode || '',
                            holderName: editingWithdrawal.bankDetails?.holderName || '',
                            bankName: editingWithdrawal.bankDetails?.bankName || '',
                          },
                        })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-extrabold text-gray-700 block mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={editingWithdrawal.bankDetails?.ifscCode || ''}
                        onChange={e =>
                          setEditingWithdrawal({
                            ...editingWithdrawal,
                            bankDetails: {
                              accountNumber: editingWithdrawal.bankDetails?.accountNumber || '',
                              ifscCode: e.target.value,
                              holderName: editingWithdrawal.bankDetails?.holderName || '',
                              bankName: editingWithdrawal.bankDetails?.bankName || '',
                            },
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-gray-700 block mb-1">Holder Name</label>
                      <input
                        type="text"
                        value={editingWithdrawal.bankDetails?.holderName || ''}
                        onChange={e =>
                          setEditingWithdrawal({
                            ...editingWithdrawal,
                            bankDetails: {
                              accountNumber: editingWithdrawal.bankDetails?.accountNumber || '',
                              ifscCode: editingWithdrawal.bankDetails?.ifscCode || '',
                              holderName: e.target.value,
                              bankName: editingWithdrawal.bankDetails?.bankName || '',
                            },
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
              <button
                type="button"
                onClick={() => handleDeleteWithdrawal(editingWithdrawal.id)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-xs transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingWithdrawal(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveWithdrawal(editingWithdrawal)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs transition shadow-sm"
                >
                  Save Withdrawal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
