import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { 
  User as UserIcon, Copy, RefreshCw, FileText, ArrowUpDown, 
  Bell, Gift, BarChart3, Globe, ShieldCheck, Headset, ChevronRight, LogOut, Check, Wallet, Lock
} from 'lucide-react';
import { User } from '../types';

interface ProfilePageProps {
  user: User | null;
  onRefreshUser?: () => void;
  isRefreshing?: boolean;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onRefreshUser,
  isRefreshing = false,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const uid = user ? (user.phone ? user.phone.slice(-8) : '14890673') : '14890673';
  const username = user ? (user.name || 'VIPPREDICTOR') : 'VIPPREDICTOR';
  const balance = user ? user.balance.toFixed(2) : '0.00';

  const formatLastLogin = () => {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}`;
  };

  const handleCopyUid = () => {
    navigator.clipboard.writeText(uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none pb-24">
      <Header user={user} onRefreshUser={onRefreshUser} isRefreshing={isRefreshing} />

      <main className="max-w-md w-full mx-auto px-3 py-4 space-y-4 flex-1">
        {/* Profile Card Header */}
        <div className="bg-gradient-to-br from-[#ff5652] via-[#ff4340] to-[#ff2a2a] text-white pt-6 pb-10 px-4 rounded-3xl shadow-md relative">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-gray-300 shadow-lg border-2 border-white/60 shrink-0">
              <UserIcon className="w-10 h-10 text-gray-400 fill-gray-200" />
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <h2 className="text-lg font-black tracking-wide truncate drop-shadow-xs">
                {username}
              </h2>

              <div className="flex items-center gap-2">
                <div className="bg-amber-400/20 backdrop-blur-xs border border-amber-300/40 text-amber-100 text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-mono font-bold">
                  <span>UID | {uid}</span>
                  <button 
                    onClick={handleCopyUid}
                    className="hover:text-white transition active:scale-90"
                    title="Copy UID"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                {copied && <span className="text-[10px] text-amber-200 font-bold">Copied!</span>}
              </div>

              <p className="text-[11px] text-white/80 font-medium">
                Last login: {formatLastLogin()}
              </p>
            </div>
          </div>
        </div>

        {/* Total Balance Floating Card */}
        <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 mx-2 -mt-8 relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total balance</span>
            {onRefreshUser && (
              <button
                onClick={onRefreshUser}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                title="Refresh balance"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#ff5353]' : ''}`} />
              </button>
            )}
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              ₹{balance}
            </div>
            <button
              onClick={() => navigate('/wallet')}
              className="px-3 py-1.5 bg-[#18b660] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-600 transition flex items-center gap-1"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Wallet</span>
            </button>
          </div>
        </div>

        {/* Quick Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => navigate('/wallet?tab=deposit')}
            className="bg-white p-3.5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3 hover:bg-gray-50/80 transition text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold text-gray-800 truncate">Deposit Funds</h4>
              <p className="text-[10px] text-gray-400 font-medium truncate">Instant UPI payment</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/wallet?tab=withdraw')}
            className="bg-white p-3.5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3 hover:bg-gray-50/80 transition text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold text-gray-800 truncate">Withdraw Payout</h4>
              <p className="text-[10px] text-gray-400 font-medium truncate">2-Hour processing</p>
            </div>
          </button>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden divide-y divide-gray-50">
          <div 
            onClick={() => navigate('/fairplay')}
            className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">Provably Fair Verification</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>

          <div 
            onClick={() => navigate('/referral')}
            className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">Referral VIP Rewards (3%)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>

          <div 
            onClick={() => navigate('/rules')}
            className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">WinGo Game Rules</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>

          <div 
            onClick={() => navigate('/wallet?tab=history')}
            className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">Transaction History</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>

          <div 
            onClick={() => navigate('/support')}
            className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center">
                <Headset className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">24/7 Customer Support</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </div>

        {/* Switch / Logout */}
        <button
          onClick={() => navigate('/login')}
          className="w-full py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-800 text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-gray-50 transition shadow-xs"
        >
          <LogOut className="w-4 h-4 text-[#ff5353]" />
          <span>{user ? 'Switch / Logout Account' : 'Sign In / Register'}</span>
        </button>
      </main>
    </div>
  );
};
