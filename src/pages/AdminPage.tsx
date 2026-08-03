import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { RealWinLogo } from '../components/RealWinLogo';
import { Lock, RefreshCw, Zap, Settings, AlertCircle, CheckCircle2, ShieldAlert, ArrowLeft, Users, DollarSign, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
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
} from '../lib/api';
import { GameRound } from '../types';

interface AdminPageProps {
  user: User | null;
  onRefreshGlobalState: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ user, onRefreshGlobalState }) => {
  const navigate = useNavigate();
  const [pinInput, setPinInput] = useState<string>('admin123');

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

  // Period Form State
  const [periodInput, setPeriodInput] = useState<string>('');
  const [periodNumberInput, setPeriodNumberInput] = useState<number>(5);
  const [periodRoomInput, setPeriodRoomInput] = useState<string>('WINGO_30S');
  const [periodSearch, setPeriodSearch] = useState<string>('');

  // Form states
  const [userSearch, setUserSearch] = useState<string>('');
  const [upiIdInput, setUpiIdInput] = useState<string>('');
  const [minDepInput, setMinDepInput] = useState<number>(500);
  const [maxDepInput, setMaxDepInput] = useState<number>(5000);
  const [minWthInput, setMinWthInput] = useState<number>(300);
  const [maxWthInput, setMaxWthInput] = useState<number>(300000);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ok = await adminLogin(pinInput);
      if (ok) {
        setIsAuthenticated(true);
        loadAdminData();
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid PIN');
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
        setUpiIdInput(s.settings.upiId);
        setMinDepInput(s.settings.minDeposit);
        setMaxDepInput(s.settings.maxDeposit || 5000);
        setMinWthInput(s.settings.minWithdrawal);
        setMaxWthInput(s.settings.maxWithdrawal || 300000);
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
      const msg = await overrideRoundNumber(num);
      setFeedbackMsg({ type: 'SUCCESS', text: msg });
      loadAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAdminSettings({
        upiId: upiIdInput,
        minDeposit: minDepInput,
        maxDeposit: maxDepInput,
        minWithdrawal: minWthInput,
        maxWithdrawal: maxWthInput,
      });
      setFeedbackMsg({ type: 'SUCCESS', text: 'System UPI & Limits updated!' });
      loadAdminData();
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
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Admin PIN (Default: admin123)</label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  placeholder="admin123"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-center text-lg font-mono tracking-widest text-gray-900 focus:outline-none focus:border-[#ff5353]"
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
                  className="flex-1 py-3 bg-gradient-to-r from-[#ff5652] to-[#ff3b38] hover:from-[#e04541] hover:to-[#e02d2a] text-white font-extrabold rounded-2xl text-xs shadow-md transition active:scale-95"
                >
                  Authenticate
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
        <div className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <RealWinLogo size="md" lightMode={true} />
            <div className="border-l border-gray-200 pl-3">
              <h2 className="font-heading text-base font-black text-gray-900">Admin Control Portal</h2>
              <span className="text-xs text-gray-500 font-medium">Live financial management & game control</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={loadAdminData}
              className={`p-2.5 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition ${isLoading ? 'animate-spin' : ''}`}
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/game')}
              className="px-4 py-2.5 rounded-2xl bg-[#ff5353] hover:bg-[#e04343] text-white font-bold text-xs flex-1 sm:flex-initial transition active:scale-95 shadow-xs"
            >
              Back to Game
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white border border-gray-100 rounded-2xl p-1.5 overflow-x-auto gap-1 shadow-xs">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap ${
              activeTab === 'OVERVIEW'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab('DEPOSITS')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1.5 ${
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
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1.5 ${
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
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap ${
              activeTab === 'USERS'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Users
          </button>

          <button
            onClick={() => setActiveTab('GAME_CONTROL')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap ${
              activeTab === 'GAME_CONTROL'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Result Override
          </button>

          <button
            onClick={() => setActiveTab('PERIODS')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap flex items-center gap-1.5 ${
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
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap ${
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
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-500 font-black text-[10px] uppercase border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">12-Digit UTR</th>
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
                          {dep.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveDeposit(dep.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs active:scale-95 transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectDeposit(dep.id)}
                                className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-xl text-xs active:scale-95 transition"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
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
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-500 font-black text-[10px] uppercase border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Payout Details</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
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
                            <span className="font-mono text-amber-800 font-bold">A/C: {wth.bankDetails?.accountNumber}</span>
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
                          {wth.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveWithdrawal(wth.id)}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs active:scale-95 transition"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => handleRejectWithdrawal(wth.id)}
                                className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-xl text-xs active:scale-95 transition"
                              >
                                Reject & Refund
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. USERS */}
          {activeTab === 'USERS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-heading text-base font-black text-gray-900">Registered Users ({users.length})</h4>
                <input
                  type="text"
                  placeholder="Search name or phone..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#ff5353]"
                />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-500 font-black text-[10px] uppercase border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-3">Name</th>
                      <th className="py-3 px-3">Phone</th>
                      <th className="py-3 px-3">Balance</th>
                      <th className="py-3 px-3 text-right">Adjust Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users
                      .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.phone.includes(userSearch))
                      .map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/60">
                          <td className="py-3 px-3 font-bold text-gray-900">{u.name}</td>
                          <td className="py-3 px-3 font-mono text-gray-500 font-medium">{u.phone}</td>
                          <td className="py-3 px-3 font-bold text-amber-600">₹{u.balance}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleUpdateBalance(u.id, 500)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-extrabold text-xs transition"
                              >
                                +₹500
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. GAME_CONTROL */}
          {activeTab === 'GAME_CONTROL' && (
            <div className="space-y-4">
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-3">
                <h4 className="font-heading text-sm font-black text-gray-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Manual Round Result Override</span>
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                  Click any number (0-9) to force it as the winning number for the next round. Reset Auto restores normal random SHA-256 seed calculations.
                </p>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => handleSetOverride(num)}
                      className="w-10 h-10 rounded-2xl bg-white hover:bg-[#ff5353] text-gray-800 hover:text-white font-black text-sm border border-gray-200 transition shadow-xs active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => handleSetOverride(null)}
                    className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-2xl transition"
                  >
                    Reset Auto
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. SETTINGS */}
          {activeTab === 'SETTINGS' && (
            <form onSubmit={handleSaveSettings} className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100 space-y-4 max-w-lg">
              <h4 className="font-heading text-sm font-black text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#ff5353]" />
                <span>System Payment & Limit Settings</span>
              </h4>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 block">Official Deposit UPI ID</label>
                <input
                  type="text"
                  value={upiIdInput}
                  onChange={e => setUpiIdInput(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:border-[#ff5353]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 block">Min Deposit (₹)</label>
                  <input
                    type="number"
                    value={minDepInput}
                    onChange={e => setMinDepInput(Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 block">Max Deposit (₹)</label>
                  <input
                    type="number"
                    value={maxDepInput}
                    onChange={e => setMaxDepInput(Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 block">Min Withdrawal (₹)</label>
                  <input
                    type="number"
                    value={minWthInput}
                    onChange={e => setMinWthInput(Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 block">Max Withdrawal (₹)</label>
                  <input
                    type="number"
                    value={maxWthInput}
                    onChange={e => setMaxWthInput(Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#ff5353] hover:bg-[#e04343] text-white font-extrabold rounded-2xl text-xs transition shadow-md active:scale-95"
              >
                Save Payment Settings
              </button>
            </form>
          )}

          {/* 6. PERIODS (SUPABASE DATABASE MANAGED) */}
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
                  Every game period result across all timer rooms (30s, 1m, 3m, 5m) is automatically recorded in Supabase. Server-side automatic pruning ensures maximum 1,000 historical periods are retained as per requirements.
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
                      <option value="WINGO_3M">Win Go 3 Min</option>
                      <option value="WINGO_5M">Win Go 5 Min</option>
                      <option value="PARITY">Parity</option>
                      <option value="SAPRE">Sapre</option>
                      <option value="BCONE">Bcone</option>
                      <option value="EMERD">Emerd</option>
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
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-gray-50 text-[11px] font-extrabold text-gray-500 uppercase border-b border-gray-200">
                        <th className="py-2.5 px-3">Period ID</th>
                        <th className="py-2.5 px-3">Room</th>
                        <th className="py-2.5 px-3 text-center">Winning Number</th>
                        <th className="py-2.5 px-3">Colors</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3 text-right">Total Bets</th>
                        <th className="py-2.5 px-3 text-right">Volume (₹)</th>
                        <th className="py-2.5 px-3 text-right">Timestamp</th>
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
                            <td className="py-2.5 px-3 text-right font-semibold text-gray-600">{round.totalBetsCount || 0}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">₹{(round.totalBetsAmount || 0).toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 text-right text-[11px] text-gray-400 font-mono">
                              {new Date(round.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      {dbRounds.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-xs text-gray-400 italic">
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
    </div>
  );
};
