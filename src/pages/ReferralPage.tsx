import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Share2, Copy, Check, Users, Gift, Sparkles, ArrowRight, Wallet } from 'lucide-react';
import { User } from '../types';

interface ReferralPageProps {
  user: User | null;
}

export const ReferralPage: React.FC<ReferralPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const inviteCode = user ? (user.phone ? user.phone.slice(-6) : '849201') : '849201';
  const inviteUrl = `${window.location.origin}/login?ref=${inviteCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none pb-24">
      <Header user={user} />

      <main className="max-w-md w-full mx-auto px-3 py-4 space-y-4 flex-1">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 p-5 rounded-3xl shadow-lg space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/30 flex items-center justify-center backdrop-blur-xs">
              <Gift className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-black text-slate-950">Referral VIP Rewards</h2>
              <span className="text-xs font-black uppercase text-slate-900">Earn Up to 3% Every Bet</span>
            </div>
          </div>
          <p className="text-xs text-slate-900 font-semibold leading-relaxed">
            Invite friends using your unique referral link and earn instant commission automatically credited straight into your wallet on every prediction they place!
          </p>
        </div>

        {/* Copy Invite Box */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Your Invite Code</span>
            <span className="font-mono font-black text-base text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
              {inviteCode}
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-gray-500 block">Invitation Link</span>
            <div className="flex items-center justify-between gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
              <span className="font-mono text-xs text-gray-700 truncate select-all font-semibold">
                {inviteUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-[#ff5353] hover:bg-[#e04343] text-white text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1 active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tier Commissions */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>3-Level Tier Commission Structure</span>
          </h3>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl space-y-1">
              <span className="text-[10px] font-black text-amber-800 uppercase block">Tier 1</span>
              <span className="font-mono font-black text-base text-amber-600 block">3.0%</span>
              <span className="text-[9px] text-gray-500 font-bold block">Direct Friends</span>
            </div>

            <div className="bg-orange-50/80 border border-orange-200 p-3 rounded-2xl space-y-1">
              <span className="text-[10px] font-black text-orange-800 uppercase block">Tier 2</span>
              <span className="font-mono font-black text-base text-orange-600 block">2.0%</span>
              <span className="text-[9px] text-gray-500 font-bold block">Indirect Ref</span>
            </div>

            <div className="bg-rose-50/80 border border-rose-200 p-3 rounded-2xl space-y-1">
              <span className="text-[10px] font-black text-rose-800 uppercase block">Tier 3</span>
              <span className="font-mono font-black text-base text-rose-600 block">1.0%</span>
              <span className="text-[9px] text-gray-500 font-bold block">Sub-referrals</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Invites</span>
            <span className="font-mono font-black text-lg text-gray-900">0 Users</span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Earned Bonus</span>
            <span className="font-mono font-black text-lg text-emerald-600">₹0.00</span>
          </div>
        </div>
      </main>
    </div>
  );
};
