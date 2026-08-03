import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, LineChart, Ticket } from 'lucide-react';
import { GameRound, Bet } from '../types';

interface GameHistoryProps {
  history: GameRound[];
  myBets?: Bet[];
  onVerifySeed: (round: GameRound) => void;
}

export const GameHistory: React.FC<GameHistoryProps> = ({ history, myBets = [], onVerifySeed }) => {
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'CHART' | 'MY_BIDS'>('HISTORY');
  const [historyPage, setHistoryPage] = useState(1);
  const [bidsPage, setBidsPage] = useState(1);
  const pageSize = 10;

  // Game History Pagination
  const historyTotalPages = Math.ceil(history.length / pageSize) || 1;
  const historyStart = (historyPage - 1) * pageSize;
  const paginatedHistory = history.slice(historyStart, historyStart + pageSize);

  // My Bids Pagination
  const bidsTotalPages = Math.ceil(myBets.length / pageSize) || 1;
  const bidsStart = (bidsPage - 1) * pageSize;
  const paginatedBids = myBets.slice(bidsStart, bidsStart + pageSize);

  // Helper to format period numbers cleanly
  const formatPeriodNumber = (periodStr: string) => {
    if (!periodStr) return '';
    return periodStr;
  };

  const getSelectionBadge = (selection: string) => {
    switch (selection) {
      case 'GREEN':
        return <span className="bg-emerald-50 text-[#18b660] border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-extrabold">Green</span>;
      case 'RED':
        return <span className="bg-red-50 text-[#ff5353] border border-red-200 px-2 py-0.5 rounded text-[11px] font-extrabold">Red</span>;
      case 'VIOLET':
        return <span className="bg-purple-50 text-[#b659fe] border border-purple-200 px-2 py-0.5 rounded text-[11px] font-extrabold">Violet</span>;
      case 'BIG':
        return <span className="bg-amber-50 text-[#f99306] border border-amber-200 px-2 py-0.5 rounded text-[11px] font-extrabold">Big</span>;
      case 'SMALL':
        return <span className="bg-blue-50 text-[#256cf0] border border-blue-200 px-2 py-0.5 rounded text-[11px] font-extrabold">Small</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 border border-gray-300 px-2.5 py-0.5 rounded text-[11px] font-black">{selection}</span>;
    }
  };

  return (
    <div className="space-y-3 max-w-md mx-auto">
      {/* 3 Pill Tabs (Game history, Chart, My History) matching 91CLUB style */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`py-2 px-4 rounded-xl text-xs font-extrabold transition shrink-0 shadow-2xs ${
            activeTab === 'HISTORY'
              ? 'bg-[#ff5353] text-white shadow-red-200'
              : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
          }`}
        >
          Game history
        </button>

        <button
          onClick={() => setActiveTab('CHART')}
          className={`py-2 px-4 rounded-xl text-xs font-extrabold transition shrink-0 shadow-2xs ${
            activeTab === 'CHART'
              ? 'bg-[#ff5353] text-white shadow-red-200'
              : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
          }`}
        >
          Chart
        </button>

        <button
          onClick={() => setActiveTab('MY_BIDS')}
          className={`py-2 px-4 rounded-xl text-xs font-extrabold transition shrink-0 shadow-2xs ${
            activeTab === 'MY_BIDS'
              ? 'bg-[#ff5353] text-white shadow-red-200'
              : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
          }`}
        >
          My History
        </button>
      </div>

      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header (Coral Red header like 91CLUB) */}
          <div className="bg-[#ff5353] text-white text-xs font-extrabold py-3 px-3 grid grid-cols-4 text-center tracking-wide">
            <span>Period</span>
            <span>Number</span>
            <span>Big Small</span>
            <span>Color</span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
            {paginatedHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-sans">
                No game history available yet.
              </div>
            ) : (
              paginatedHistory.map(round => (
                <div key={round.period} className="grid grid-cols-4 items-center py-3 px-3 text-center hover:bg-gray-50/80 transition">
                  {/* Period (Hides start digits if long, shows end digits) */}
                  <span className="font-mono text-[11px] font-medium text-gray-600 truncate" title={round.period}>
                    {formatPeriodNumber(round.period)}
                  </span>

                  {/* Number */}
                  <div className="flex justify-center">
                    <span
                      className={`font-heading font-black text-xl ${
                        round.colors.includes('GREEN') && round.colors.includes('VIOLET')
                          ? 'text-[#18b660]'
                          : round.colors.includes('RED') && round.colors.includes('VIOLET')
                          ? 'text-[#ff5353]'
                          : round.colors.includes('GREEN')
                          ? 'text-[#18b660]'
                          : 'text-[#ff5353]'
                      }`}
                    >
                      {round.number}
                    </span>
                  </div>

                  {/* Big / Small */}
                  <span className="text-xs font-medium text-gray-700">
                    {round.bigSmall === 'BIG' ? 'Big' : 'Small'}
                  </span>

                  {/* Color Dot Indicator */}
                  <div className="flex items-center justify-center gap-1">
                    {round.colors.map((c, idx) => (
                      <span
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full shadow-xs ${
                          c === 'GREEN'
                            ? 'bg-[#18b660]'
                            : c === 'RED'
                            ? 'bg-[#ff5353]'
                            : 'bg-[#b659fe]'
                        }`}
                      />
                    ))}
                    <button
                      onClick={() => onVerifySeed(round)}
                      className="ml-1 p-0.5 text-gray-300 hover:text-emerald-600 transition"
                      title="Verify Fair Seed"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Bottom Bar (< 1/50 >) - matches 91CLUB style */}
          <div className="bg-white p-3 flex items-center justify-center gap-6 text-xs font-bold text-gray-600 border-t border-gray-100">
            <button
              disabled={historyPage === 1}
              onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>

            <span className="font-medium text-gray-500">
              {historyPage}/{historyTotalPages}
            </span>

            <button
              disabled={historyPage >= historyTotalPages}
              onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
              className="p-2 rounded-lg bg-[#ff5353] text-white hover:bg-red-600 disabled:opacity-40 transition shadow-xs"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'CHART' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
              <LineChart className="w-4 h-4 text-[#ff5353]" />
              <span>Result Trend Line</span>
            </span>
            <span className="text-xs text-gray-400">Last 20 Rounds</span>
          </div>

          <div className="flex items-end justify-between gap-1 h-32 pt-4 px-2">
            {history.slice(0, 20).reverse().map((r, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] font-bold text-gray-700">{r.number}</span>
                <div
                  style={{ height: `${(r.number + 1) * 9}px` }}
                  className={`w-full max-w-[12px] rounded-t-md transition-all ${
                    r.colors.includes('GREEN') ? 'bg-[#18b660]' : 'bg-[#ff5353]'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'MY_BIDS' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header (Coral Red header matching Game History theme) */}
          <div className="bg-[#ff5353] text-white text-xs font-extrabold py-3 px-3 grid grid-cols-4 text-center tracking-wide">
            <span>Period</span>
            <span>Select</span>
            <span>Amount</span>
            <span>Result</span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
            {paginatedBids.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-sans space-y-1">
                <Ticket className="w-8 h-8 mx-auto text-gray-300" />
                <p>No bids placed yet.</p>
              </div>
            ) : (
              paginatedBids.map(bet => {
                const isPending = bet.status === 'PENDING';
                const isWon = bet.status === 'WON';

                return (
                  <div key={bet.id} className="grid grid-cols-4 items-center py-3 px-3 text-center hover:bg-gray-50/80 transition">
                    {/* Period */}
                    <span className="font-mono text-[11px] font-medium text-gray-600 truncate" title={bet.period}>
                      {formatPeriodNumber(bet.period)}
                    </span>

                    {/* Select */}
                    <div className="flex justify-center">
                      {getSelectionBadge(bet.selection)}
                    </div>

                    {/* Amount */}
                    <span className="text-xs font-bold text-gray-700">
                      ₹{bet.amount}
                    </span>

                    {/* Result / Payout */}
                    <div className="flex items-center justify-center">
                      {isPending ? (
                        <span className="text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                          Pending
                        </span>
                      ) : isWon ? (
                        <span className="text-[#18b660] font-black text-xs">
                          +₹{bet.payout}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium text-xs">
                          -₹{bet.amount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Bottom Bar matching Game History theme */}
          <div className="bg-white p-3 flex items-center justify-center gap-6 text-xs font-bold text-gray-600 border-t border-gray-100">
            <button
              disabled={bidsPage === 1}
              onClick={() => setBidsPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>

            <span className="font-medium text-gray-500">
              {bidsPage}/{bidsTotalPages}
            </span>

            <button
              disabled={bidsPage >= bidsTotalPages}
              onClick={() => setBidsPage(p => Math.min(bidsTotalPages, p + 1))}
              className="p-2 rounded-lg bg-[#ff5353] text-white hover:bg-red-600 disabled:opacity-40 transition shadow-xs"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


