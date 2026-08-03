import React, { useState } from 'react';
import { 
  User as UserIcon, Copy, RefreshCw, FileText, ArrowUpDown, 
  ArrowDownCircle, ArrowUpCircle, Bell, Gift, BarChart3, 
  Globe, ShieldCheck, Headset, ChevronRight, LogOut, Check
} from 'lucide-react';
import { User, Bet, DepositRequest, WithdrawalRequest } from '../types';

interface ProfileScreenProps {
  user: User | null;
  onOpenWallet: (tab?: 'DEPOSIT' | 'WITHDRAW' | 'TRANSACTIONS') => void;
  onOpenAuth: () => void;
  onRefreshUser: () => void;
  isRefreshing: boolean;
  onOpenFairPlay: () => void;
  myBetsCount: number;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onOpenWallet,
  onOpenAuth,
  onRefreshUser,
  isRefreshing,
  onOpenFairPlay,
  myBetsCount,
}) => {
  const [copied, setCopied] = useState(false);

  const uid = user ? (user.phone ? user.phone.slice(-8) : '14890673') : '14890673';
  const username = user ? (user.name || 'VIPPREDICTOR') : 'VIPPREDICTOR';
  const balance = user ? user.balance.toFixed(2) : '0.43';

  // Format current date time for last login string
  const formatLastLogin = () => {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
  };

  const handleCopyUid = () => {
    navigator.clipboard.writeText(uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 pb-12 max-w-md mx-auto animate-fadeIn">
      {/* 1. Header with Gradient Background & Profile details */}
      <div className="bg-gradient-to-br from-[#ff5652] via-[#ff4340] to-[#ff2a2a] text-white pt-6 pb-10 px-4 rounded-b-3xl shadow-md relative">
        <div className="flex items-center gap-3.5">
          {/* Circular Avatar */}
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-gray-300 shadow-lg border-2 border-white/60 shrink-0">
            <UserIcon className="w-10 h-10 text-gray-400 fill-gray-200" />
          </div>

          {/* User Details */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-wide truncate drop-shadow-xs">
                {username}
              </h2>
            </div>

            {/* UID Badge */}
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
              {copied && <span className="text-[10px] text-amber-200 font-bold animate-fadeIn">Copied!</span>}
            </div>

            {/* Last Login */}
            <p className="text-[11px] text-white/80 font-medium">
              Last login: {formatLastLogin()}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Total Balance Card (Floating over header bottom edge) */}
      <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 mx-3 -mt-8 relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500">Total balance</span>
          <button
            onClick={onRefreshUser}
            className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            title="Refresh balance"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#ff5353]' : ''}`} />
          </button>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-black text-gray-900 tracking-tight">
            ₹{balance}
          </div>
        </div>
      </div>

      {/* 3. Quick Feature Action Grid */}
      <div className="px-3 grid grid-cols-2 gap-2.5">
        {/* Game History */}
        <button
          onClick={() => onOpenWallet('HISTORY')}
          className="bg-white p-3.5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3 hover:bg-gray-50/80 transition text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-extrabold text-gray-800 truncate">Game History</h4>
            <p className="text-[10px] text-gray-400 font-medium truncate">My game history</p>
          </div>
        </button>

        {/* Transaction */}
        <button
          onClick={() => onOpenWallet('HISTORY')}
          className="bg-white p-3.5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3 hover:bg-gray-50/80 transition text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
            <ArrowUpDown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-extrabold text-gray-800 truncate">Transaction</h4>
            <p className="text-[10px] text-gray-400 font-medium truncate">My transaction history</p>
          </div>
        </button>
      </div>

      {/* 4. Menu Items List */}
      <div className="px-3">
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {/* Notification */}
          <div className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">Notification</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>

          {/* Gifts */}
          <div className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-500 flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">Gifts</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>

          {/* Game Statistics */}
          <div className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">Game statistics</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>

          {/* Language */}
          <div className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-500 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">Language</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <span>English</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          {/* Fair Play Seeds */}
          <div 
            onClick={onOpenFairPlay}
            className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">Fair Play Verification</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>

          {/* Customer Support */}
          <div className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center">
                <Headset className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-800">24/7 Customer Support</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </div>
      </div>

      {/* 5. Auth / Switch Account Button */}
      <div className="px-3 pt-2">
        <button
          onClick={onOpenAuth}
          className="w-full py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition shadow-2xs"
        >
          <LogOut className="w-4 h-4 text-[#ff5353]" />
          <span>{user ? 'Switch / Logout Account' : 'Sign In / Register'}</span>
        </button>
      </div>
    </div>
  );
};
