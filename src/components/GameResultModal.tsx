import React from 'react';
import { Trophy, Sparkles, TrendingUp, TrendingDown, X, CheckCircle2, AlertCircle, Coins } from 'lucide-react';
import { Bet, GameRound } from '../types';

export interface GameResultModalData {
  period: string;
  room: string;
  round?: GameRound;
  bets: Bet[];
  totalInvested: number;
  totalPayout: number;
  netProfit: number;
  isWin: boolean;
}

interface GameResultModalProps {
  data: GameResultModalData | null;
  onClose: () => void;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  const { period, room, round, bets, totalInvested, totalPayout, netProfit, isWin } = data;

  // Format room display name
  const roomName =
    room === 'WINGO_30S'
      ? 'WinGo 30 Seconds'
      : room === 'WINGO_1M'
      ? 'WinGo 1 Minute'
      : room;

  // Result Number Details
  const resultNum = round?.number ?? bets[0]?.resultNumber ?? 0;
  let colors: ('GREEN' | 'RED' | 'VIOLET')[] = round?.colors ?? [];
  if (colors.length === 0) {
    if (resultNum === 0) colors = ['RED', 'VIOLET'];
    else if (resultNum === 5) colors = ['GREEN', 'VIOLET'];
    else if ([1, 3, 7, 9].includes(resultNum)) colors = ['GREEN'];
    else colors = ['RED'];
  }
  const bigSmall = round?.bigSmall ?? (resultNum >= 5 ? 'BIG' : 'SMALL');

  // Result Ball Color
  let ballBg = 'bg-[#ff5353]';
  if (resultNum === 0) ballBg = 'bg-gradient-to-r from-[#ff5353] to-[#b659fe]';
  else if (resultNum === 5) ballBg = 'bg-gradient-to-r from-[#18b660] to-[#b659fe]';
  else if ([1, 3, 7, 9].includes(resultNum)) ballBg = 'bg-[#18b660]';

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-scaleUp">
        
        {/* Modal Top Banner */}
        {isWin ? (
          <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-emerald-600 text-white p-6 text-center relative overflow-hidden">
            {/* Background Decorative Sparkles */}
            <div className="absolute top-2 left-3 opacity-20 animate-pulse">
              <Sparkles className="w-12 h-12" />
            </div>
            <div className="absolute bottom-1 right-3 opacity-20 animate-pulse">
              <Trophy className="w-16 h-16" />
            </div>

            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 mx-auto bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-2 border border-white/40 shadow-inner">
              <Trophy className="w-10 h-10 text-amber-100 animate-bounce" />
            </div>

            <h3 className="font-heading text-2xl font-black tracking-tight text-white drop-shadow-sm">
              CONGRATULATIONS!
            </h3>
            <p className="text-xs text-amber-100 font-semibold mt-0.5">
              You won the bid in {roomName}!
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-rose-950 text-white p-6 text-center relative overflow-hidden">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 mx-auto bg-rose-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-2 border border-rose-500/30">
              <AlertCircle className="w-10 h-10 text-rose-400" />
            </div>

            <h3 className="font-heading text-2xl font-black tracking-tight text-white">
              BETTER LUCK NEXT TIME!
            </h3>
            <p className="text-xs text-slate-300 font-semibold mt-0.5">
              Result did not match your prediction
            </p>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-5 space-y-4 bg-white text-gray-800">
          {/* Period ID & Winning Result Card */}
          <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">
                Period #{period}
              </span>
              <span className="text-xs font-bold text-gray-700 block">
                Winning Result:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full ${ballBg} text-white font-black text-lg flex items-center justify-center shadow-sm border-2 border-white`}>
                {resultNum}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-gray-500 block">
                  {bigSmall}
                </span>
                <div className="flex items-center gap-1 justify-end">
                  {colors.map((c, i) => (
                    <span
                      key={i}
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full text-white ${
                        c === 'GREEN' ? 'bg-emerald-500' : c === 'RED' ? 'bg-rose-500' : 'bg-purple-600'
                      }`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Investment & Payout Summary Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-2xl">
              <span className="text-[10px] text-gray-500 font-bold block uppercase">Invested</span>
              <span className="text-sm font-mono font-black text-gray-900">
                ₹{totalInvested.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-2xl">
              <span className="text-[10px] text-gray-500 font-bold block uppercase">Payout</span>
              <span className={`text-sm font-mono font-black ${totalPayout > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                ₹{totalPayout.toLocaleString('en-IN')}
              </span>
            </div>

            <div className={`p-2.5 rounded-2xl border ${isWin ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              <span className="text-[10px] font-bold block uppercase opacity-80">
                {isWin ? 'Net Profit' : 'Net Loss'}
              </span>
              <span className="text-sm font-mono font-black flex items-center justify-center gap-0.5">
                {isWin ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-600" />}
                <span>{isWin ? `+₹${netProfit}` : `-₹${Math.abs(netProfit)}`}</span>
              </span>
            </div>
          </div>

          {/* User's Bids Breakdown List */}
          <div className="space-y-1.5">
            <span className="text-xs font-black text-gray-700 uppercase tracking-wide block">
              Your Bids Breakdown ({bets.length})
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {bets.map(bet => (
                <div
                  key={bet.id}
                  className="bg-gray-50 border border-gray-100 p-2.5 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-800 rounded-md font-mono font-black text-[11px]">
                      {bet.selection}
                    </span>
                    <span className="text-gray-500 font-medium">₹{bet.amount}</span>
                  </div>

                  <div className="text-right flex items-center gap-1.5">
                    {bet.status === 'WON' ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Won ₹{bet.payout}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-bold text-[10px]">
                        Lost ₹{bet.amount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className={`w-full py-3.5 rounded-2xl font-black text-sm text-white transition shadow-md active:scale-95 ${
              isWin
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-200'
                : 'bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black shadow-slate-200'
            }`}
          >
            {isWin ? '🎉 Continue Playing & Win More' : '🔄 Try Again Next Round'}
          </button>
        </div>
      </div>
    </div>
  );
};
