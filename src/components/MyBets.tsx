import React from 'react';
import { Ticket, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Bet } from '../types';

interface MyBetsProps {
  bets: Bet[];
  onRefresh: () => void;
}

export const MyBets: React.FC<MyBetsProps> = ({ bets, onRefresh }) => {
  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-amber-400" />
          <h3 className="font-heading text-lg font-bold text-slate-100">My Prediction Bids</h3>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs text-amber-400 hover:underline font-semibold"
        >
          Refresh Bids
        </button>
      </div>

      {bets.length === 0 ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <Ticket className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
          <p className="text-sm font-medium">No bids placed yet.</p>
          <p className="text-xs text-slate-600">Select Green, Violet, Red, or Numbers above to join active rounds!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {bets.map(bet => {
            const isPending = bet.status === 'PENDING';
            const isWon = bet.status === 'WON';

            return (
              <div
                key={bet.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                  isWon
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : isPending
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-950 border-slate-800/80'
                }`}
              >
                {/* Left: Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-sm font-extrabold text-slate-200">
                      #{bet.period}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      {bet.room}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Bid:</span>
                    <span className="font-bold text-amber-300 px-1.5 py-0.5 bg-amber-400/10 rounded">
                      {bet.selection}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">Amount: ₹{bet.amount}</span>
                  </div>

                  <span className="text-[10px] text-slate-500 block">
                    {new Date(bet.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>

                  {(bet.balanceBefore !== undefined || bet.balanceAfter !== undefined) && (
                    <div className="text-[10px] text-slate-400 font-mono pt-1 space-y-0.5">
                      <div>Bal Before: ₹{(bet.balanceBefore ?? 0).toFixed(2)} | After: ₹{(bet.balanceAfter ?? 0).toFixed(2)}</div>
                      {bet.status === 'WON' && bet.payoutBalanceAfter !== undefined && (
                        <div className="text-emerald-400 font-semibold">🎉 Win Credited → Final Bal: ₹{bet.payoutBalanceAfter.toFixed(2)}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Status & Payout */}
                <div className="text-right space-y-1">
                  {isPending ? (
                    <div className="flex items-center justify-end gap-1 text-amber-400 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Pending Result</span>
                    </div>
                  ) : isWon ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-end gap-1 text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>WON</span>
                      </div>
                      <span className="font-heading text-sm font-extrabold text-emerald-300 block">
                        +₹{bet.payout}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-end gap-1 text-slate-500 text-xs font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>LOST</span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium block">-₹{bet.amount}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
