import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { HelpCircle, Sparkles, CheckCircle2, ShieldCheck, ArrowLeft, Trophy, DollarSign } from 'lucide-react';
import { User } from '../types';
import { getAppPath } from '../config/appConfig';

interface RulesPageProps {
  user: User | null;
}

export const RulesPage: React.FC<RulesPageProps> = ({ user }) => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none pb-24">
      <Header user={user} />

      <main className="max-w-md w-full mx-auto px-3 py-4 space-y-4 flex-1">
        {/* Banner */}
        <div className="bg-gradient-to-r from-[#ff5652] via-[#ff4340] to-[#ff2a2a] text-white p-5 rounded-3xl shadow-lg space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <HelpCircle className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-black tracking-tight text-white">WinGo Game Rules</h2>
              <span className="text-xs text-amber-200 font-bold uppercase tracking-wider">Official Payout Guide</span>
            </div>
          </div>
          <p className="text-xs text-white/90 leading-relaxed pt-1 font-medium">
            Learn how to predict colors, numbers, and Big/Small sizes to win up to <strong className="text-amber-300">9x multiplier returns</strong> on every 30-second round!
          </p>
        </div>

        {/* Payout Table Card */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Color Prediction Multipliers</span>
          </h3>

          <div className="space-y-2 text-xs">
            {/* Green */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#18b660] inline-block shadow-xs" />
                <div className="font-extrabold text-emerald-950">
                  Select Green <span className="text-[10px] text-emerald-700 font-normal">(Numbers 1, 3, 7, 9)</span>
                </div>
              </div>
              <span className="font-black font-mono text-emerald-700 text-sm">2.0x Payout</span>
            </div>

            {/* Red */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#ff5353] inline-block shadow-xs" />
                <div className="font-extrabold text-rose-950">
                  Select Red <span className="text-[10px] text-rose-700 font-normal">(Numbers 2, 4, 6, 8)</span>
                </div>
              </div>
              <span className="font-black font-mono text-rose-700 text-sm">2.0x Payout</span>
            </div>

            {/* Violet */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#b659fe] inline-block shadow-xs" />
                <div className="font-extrabold text-purple-950">
                  Select Violet <span className="text-[10px] text-purple-700 font-normal">(Numbers 0, 5)</span>
                </div>
              </div>
              <span className="font-black font-mono text-purple-700 text-sm">4.5x Payout</span>
            </div>

            {/* Numbers */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <div className="font-extrabold text-amber-950">
                  Exact Number <span className="text-[10px] text-amber-800 font-normal">(Any 0 to 9)</span>
                </div>
              </div>
              <span className="font-black font-mono text-amber-700 text-sm">9.0x Payout</span>
            </div>

            {/* Big / Small */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="px-1.5 py-0.5 bg-[#feaa38] text-white rounded text-[9px] font-black">BIG</span>
                  <span className="px-1.5 py-0.5 bg-[#4086f4] text-white rounded text-[9px] font-black">SMALL</span>
                </div>
                <div className="font-extrabold text-blue-950">
                  Big (5-9) or Small (0-4)
                </div>
              </div>
              <span className="font-black font-mono text-blue-700 text-sm">2.0x Payout</span>
            </div>
          </div>
        </div>

        {/* Round Timings */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Round Cycle & Locks</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Each round consists of a 25-second prediction phase followed by a 5-second countdown lock phase. Predictions cannot be modified or canceled once submitted.
          </p>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% SHA-256 Provably Fair - Hash seed locked before round start</span>
          </div>
        </div>

        <button
          onClick={() => navigate(getAppPath('/game'))}
          className="w-full py-3.5 bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white font-black rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Game</span>
        </button>
      </main>
    </div>
  );
};
