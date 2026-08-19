import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, XCircle, Users, Wallet, TrendingUp, AlertCircle, RefreshCw, Zap, ShieldAlert, ArrowDownCircle, ArrowUpCircle, Settings } from 'lucide-react';
import {
  AdminStats,
  DepositRequest,
  WithdrawalRequest,
  User,
  SystemSettings,
} from '../types';
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
} from '../lib/api';

interface AdminPanelProps {
  onClose: () => void;
  onRefreshGlobalState: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onRefreshGlobalState }) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DEPOSITS' | 'WITHDRAWALS' | 'USERS' | 'GAME_CONTROL' | 'SETTINGS'>('OVERVIEW');

  // Data State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [liveBets, setLiveBets] = useState<any>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Form states
  const [userSearch, setUserSearch] = useState<string>('');
  const [manualNumberInput, setManualNumberInput] = useState<string>('7');
  const [upiIdInput, setUpiIdInput] = useState<string>('');
  const [minDepInput, setMinDepInput] = useState<number>(300);
  const [minWthInput, setMinWthInput] = useState<number>(300);

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
      const [s, dep, wth, usr, live] = await Promise.all([
        fetchAdminStats(),
        fetchAdminDeposits(),
        fetchAdminWithdrawals(),
        fetchAdminUsers(),
        fetchLiveBets(),
      ]);
      setStats(s);
      setDeposits(dep);
      setWithdrawals(wth);
      setUsers(usr);
      setLiveBets(live);
      if (s.settings) {
        setSettings(s.settings);
        setUpiIdInput(s.settings.upiId);
        setMinDepInput(s.settings.minDeposit);
        setMinWthInput(s.settings.minWithdrawal);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  // Actions
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAdminSettings({
        upiId: upiIdInput,
        minDeposit: minDepInput,
        minWithdrawal: minWthInput,
      });
      setFeedbackMsg({ type: 'SUCCESS', text: 'System UPI & Limits updated!' });
      loadAdminData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'ERROR', text: err.message });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-amber-500/30">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-100">Admin Control Panel</h3>
            <p className="text-xs text-slate-400">Enter Admin PIN to manage deposits & withdrawals</p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Admin Access Key</label>
              <input
                type="password"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                placeholder="Enter Access Key"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition"
              >
                Authenticate
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const pendingDeposits = deposits.filter(d => d.status === 'PENDING');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col p-2 sm:p-4 overflow-hidden">
      <div className="max-w-7xl w-full mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <div className="p-3 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h3 className="font-heading text-lg font-bold text-slate-100">ColorWin Admin Dashboard</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              LIVE ADMIN
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAdminData}
              className={`p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition ${isLoading ? 'animate-spin' : ''}`}
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              Exit Admin
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950 border-b border-slate-800 overflow-x-auto p-1">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'OVERVIEW' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview & Metrics
          </button>

          <button
            onClick={() => setActiveTab('DEPOSITS')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'DEPOSITS' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Verify Deposits</span>
            {pendingDeposits.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {pendingDeposits.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('WITHDRAWALS')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'WITHDRAWALS' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Manual Withdrawals (2h)</span>
            {pendingWithdrawals.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {pendingWithdrawals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'USERS' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Manage Users
          </button>

          <button
            onClick={() => setActiveTab('GAME_CONTROL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'GAME_CONTROL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Game Override
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'SETTINGS' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            UPI Settings
          </button>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <div
            className={`m-3 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              feedbackMsg.type === 'SUCCESS'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold">✕</button>
          </div>
        )}

        {/* Admin Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* OVERVIEW TAB */}
          {activeTab === 'OVERVIEW' && stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Registered Users</span>
                  <div className="font-heading text-2xl font-extrabold text-slate-100">{stats.totalUsers}</div>
                  <span className="text-[10px] text-slate-500">Active player accounts</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">User Wallet Liabilities</span>
                  <div className="font-heading text-2xl font-extrabold text-amber-300">
                    ₹{stats.totalWalletBalance.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-500">Combined user balances</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Pending Deposits</span>
                  <div className="font-heading text-2xl font-extrabold text-emerald-400">
                    {stats.pendingDepositsCount} (₹{stats.pendingDepositsAmount})
                  </div>
                  <span className="text-[10px] text-emerald-300/70">Awaiting UTR verification</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Pending Withdrawals</span>
                  <div className="font-heading text-2xl font-extrabold text-amber-400">
                    {stats.pendingWithdrawalsCount} (₹{stats.pendingWithdrawalsAmount})
                  </div>
                  <span className="text-[10px] text-amber-300/70">Requires 2-hour manual payout</span>
                </div>
              </div>

              {/* Volume & Margin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 uppercase font-bold block">Total Bidding Volume</span>
                  <div className="font-heading text-xl font-extrabold text-teal-300">
                    ₹{stats.totalVolumeBet.toLocaleString('en-IN')} across {stats.totalBetsPlaced} bids
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 uppercase font-bold block">Net House Profit / Loss</span>
                  <div
                    className={`font-heading text-xl font-extrabold ${
                      stats.netHouseMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    ₹{stats.netHouseMargin.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEPOSITS VERIFICATION TAB */}
          {activeTab === 'DEPOSITS' && (
            <div className="space-y-3">
              <h4 className="font-heading text-base font-bold text-slate-200">
                Deposit Requests ({deposits.length})
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-semibold text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">12-Digit UTR</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Time</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {deposits.map(dep => (
                      <tr key={dep.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-200">{dep.userName}</div>
                          <div className="text-[10px] text-slate-500">{dep.userPhone}</div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">₹{dep.amount}</td>
                        <td className="py-2.5 px-3 font-mono text-amber-300">{dep.utr}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              dep.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : dep.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {dep.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                          {new Date(dep.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {dep.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveDeposit(dep.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-[11px]"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectDeposit(dep.id)}
                                className="px-2 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold rounded text-[11px]"
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

          {/* WITHDRAWALS PROCESSING TAB */}
          {activeTab === 'WITHDRAWALS' && (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200">
                <strong>Manual Payout Rule:</strong> User requests must be verified and manually paid via your UPI app or bank netbanking within 2 hours of request. Mark as Paid after transferring funds.
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-semibold text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Payment Details</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Requested Time</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {withdrawals.map(wth => (
                      <tr key={wth.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-200">{wth.userName}</div>
                          <div className="text-[10px] text-slate-500">{wth.userPhone}</div>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-amber-300">₹{wth.amount}</td>
                        <td className="py-2.5 px-3">
                          {wth.type === 'UPI' ? (
                            <div className="font-mono text-emerald-300">UPI: {wth.upiId}</div>
                          ) : (
                            <div className="text-[11px] space-y-0.5">
                              <div className="font-bold text-slate-200">{wth.bankDetails?.holderName}</div>
                              <div className="font-mono text-amber-300">A/C: {wth.bankDetails?.accountNumber}</div>
                              <div className="font-mono text-slate-400">IFSC: {wth.bankDetails?.ifscCode}</div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              wth.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : wth.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {wth.status === 'APPROVED' ? 'PAID' : wth.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                          {new Date(wth.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {wth.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveWithdrawal(wth.id)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px]"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => handleRejectWithdrawal(wth.id)}
                                className="px-2 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold rounded text-[11px]"
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

          {/* USER MANAGEMENT TAB */}
          {activeTab === 'USERS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-heading text-base font-bold text-slate-200">Registered Players ({users.length})</h4>
                <input
                  type="text"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-semibold text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Name</th>
                      <th className="py-3 px-3">Phone</th>
                      <th className="py-3 px-3">Current Balance</th>
                      <th className="py-3 px-3">Joined</th>
                      <th className="py-3 px-3 text-right">Adjust Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users
                      .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.phone.includes(userSearch))
                      .map(u => (
                        <tr key={u.id} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-3 font-bold text-slate-200">{u.name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{u.phone}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-300">₹{u.balance}</td>
                          <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                            {new Date(u.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleUpdateBalance(u.id, 500)}
                                className="px-2 py-0.5 bg-emerald-600/30 text-emerald-300 rounded hover:bg-emerald-600 hover:text-slate-950 font-bold text-[10px]"
                              >
                                +₹500
                              </button>
                              <button
                                onClick={() => handleUpdateBalance(u.id, -200)}
                                className="px-2 py-0.5 bg-rose-600/30 text-rose-300 rounded hover:bg-rose-600 hover:text-white font-bold text-[10px]"
                              >
                                -₹200
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

          {/* GAME CONTROL & OVERRIDE TAB */}
          {activeTab === 'GAME_CONTROL' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-heading text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Manual Game Result Override</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Force a specific winning number (0-9) for the upcoming round result. If set to Auto, the system generates a provably fair random number.
                </p>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-bold">Override Number:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button
                        key={num}
                        onClick={() => handleSetOverride(num)}
                        className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-extrabold text-sm border border-amber-500/30 transition"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleSetOverride(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg"
                  >
                    Reset Auto
                  </button>
                </div>
              </div>

              {/* Live Bets Distribution */}
              {liveBets && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="font-heading text-sm font-bold text-slate-200">
                    Live Active Bets (Period #{liveBets.period})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Total Bets Count</span>
                      <span className="font-bold text-slate-100 text-base">{liveBets.totalBets}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Total Active Volume</span>
                      <span className="font-bold text-amber-300 text-base">₹{liveBets.totalVolume}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'SETTINGS' && (
            <form onSubmit={handleSaveSettings} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 max-w-lg">
              <h4 className="font-heading text-sm font-bold text-slate-200 flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>System Payment Settings</span>
              </h4>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Deposit Receive UPI ID</label>
                <input
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  value={upiIdInput}
                  onChange={e => setUpiIdInput(e.target.value.trim().toLowerCase())}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Min Deposit (₹)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={minDepInput}
                    onChange={e => setMinDepInput(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Min Withdrawal (₹)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={minWthInput}
                    onChange={e => setMinWthInput(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Save Settings
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
