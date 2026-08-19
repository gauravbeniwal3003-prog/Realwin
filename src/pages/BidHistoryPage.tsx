import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { 
  Ticket, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, 
  Filter, Search, ArrowLeft, RefreshCw, Layers, Award, BarChart3
} from 'lucide-react';
import { User, Bet, GameRound, RoomType } from '../types';

interface BidHistoryPageProps {
  user: User | null;
  myBets: Bet[];
  history: GameRound[];
  onRefreshUser?: () => void;
  isRefreshing?: boolean;
}

export const BidHistoryPage: React.FC<BidHistoryPageProps> = ({
  user,
  myBets = [],
  history = [],
  onRefreshUser,
  isRefreshing = false,
}) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'WON' | 'LOST'>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Filtered Bets
  const filteredBets = useMemo(() => {
    return myBets.filter(bet => {
      // Status Filter
      if (statusFilter !== 'ALL' && bet.status !== statusFilter) {
        return false;
      }
      // Room Filter
      if (roomFilter !== 'ALL' && bet.room !== roomFilter) {
        return false;
      }
      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const periodMatch = bet.period.toLowerCase().includes(query);
        const selMatch = bet.selection.toLowerCase().includes(query);
        const roomMatch = (bet.room || '').toLowerCase().includes(query);
        if (!periodMatch && !selMatch && !roomMatch) {
          return false;
        }
      }
      return true;
    });
  }, [myBets, statusFilter, roomFilter, searchQuery]);

  // Analytics Math Calculations
  const stats = useMemo(() => {
    let totalWagered = 0;
    let totalPayout = 0;
    let wonCount = 0;
    let lostCount = 0;
    let pendingCount = 0;

    myBets.forEach(b => {
      totalWagered += b.amount;
      if (b.status === 'WON') {
        wonCount++;
        totalPayout += b.payout;
      } else if (b.status === 'LOST') {
        lostCount++;
      } else {
        pendingCount++;
      }
    });

    const resolvedCount = wonCount + lostCount;
    const netProfit = totalPayout - totalWagered;
    const winRate = resolvedCount > 0 ? ((wonCount / resolvedCount) * 100).toFixed(1) : '0.0';

    return {
      totalBids: myBets.length,
      totalWagered,
      totalPayout,
      netProfit,
      wonCount,
      lostCount,
      pendingCount,
      winRate,
    };
  }, [myBets]);

  // Pagination
  const totalPages = Math.ceil(filteredBets.length / pageSize) || 1;
  const paginatedBets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBets.slice(start, start + pageSize);
  }, [filteredBets, page, pageSize]);

  // Format Helper for Date
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Just now';
    const d = new Date(timestamp);
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
  };

  const getSelectionBadge = (selection: string) => {
    const clean = String(selection).toUpperCase();
    switch (clean) {
      case 'GREEN':
        return <span className="bg-emerald-500 text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">Green</span>;
      case 'RED':
        return <span className="bg-red-500 text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">Red</span>;
      case 'VIOLET':
        return <span className="bg-purple-500 text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">Violet</span>;
      case 'BIG':
        return <span className="bg-amber-500 text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">Big</span>;
      case 'SMALL':
        return <span className="bg-blue-500 text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">Small</span>;
      default:
        return <span className="bg-gray-800 text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">Number {selection}</span>;
    }
  };

  const getRoomName = (roomStr?: string) => {
    switch (roomStr) {
      case 'WINGO_30S': return 'WinGo 30s';
      case 'WINGO_1M': return 'WinGo 1Min';
      case 'WINGO_3M': return 'WinGo 3Min';
      case 'WINGO_5M': return 'WinGo 5Min';
      default: return roomStr || 'WinGo 30s';
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none pb-24">
      <Header user={user} onRefreshUser={onRefreshUser} isRefreshing={isRefreshing} />

      <main className="max-w-md w-full mx-auto px-3 py-4 space-y-4 flex-1">
        {/* Page Top Title Card */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/account')}
              className="p-2 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition active:scale-95"
              title="Back to Account"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-black text-gray-900 flex items-center gap-1.5">
                <Ticket className="w-5 h-5 text-[#ff5353]" />
                <span>My Bid History & Audit Log</span>
              </h1>
              <p className="text-[11px] text-gray-500 font-medium">
                Last 100 bids recorded with exact win/loss analysis
              </p>
            </div>
          </div>

          {onRefreshUser && (
            <button
              onClick={onRefreshUser}
              className={`p-2 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition active:scale-95 ${
                isRefreshing ? 'animate-spin text-[#ff5353]' : ''
              }`}
              title="Refresh History"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Analytics Summary Cards Grid */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 rounded-3xl shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-extrabold tracking-wide uppercase text-gray-300">Financial Audit Summary</span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
              Win Rate: {stats.winRate}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Total Wagered */}
            <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] font-semibold text-gray-400 block">Total Wagered</span>
              <span className="text-base font-black text-white">₹{stats.totalWagered.toLocaleString('en-IN')}</span>
            </div>

            {/* Total Payout */}
            <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] font-semibold text-gray-400 block">Total Payout Received</span>
              <span className="text-base font-black text-emerald-400">₹{stats.totalPayout.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Net Profit / Loss Highlight Banner */}
          <div className="bg-white/10 p-3 rounded-2xl border border-white/15 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-300 block">Net Profit / Loss</span>
              <span className="text-[10px] text-gray-400 font-medium">Calculated across {stats.totalBids} bids</span>
            </div>
            <div>
              {stats.netProfit >= 0 ? (
                <div className="bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 px-3 py-1 rounded-xl text-sm font-black flex items-center gap-1 shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                  <span>+₹{stats.netProfit.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <div className="bg-red-500/20 border border-red-400/50 text-red-400 px-3 py-1 rounded-xl text-sm font-black flex items-center gap-1 shadow-xs">
                  <TrendingDown className="w-4 h-4" />
                  <span>-₹{Math.abs(stats.netProfit).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search period ID or selection..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#ff5353]/30"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'ALL', label: `All (${myBets.length})` },
              { id: 'PENDING', label: `Pending (${stats.pendingCount})` },
              { id: 'WON', label: `Won (${stats.wonCount})` },
              { id: 'LOST', label: `Lost (${stats.lostCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id as any); setPage(1); }}
                className={`py-1.5 px-3 rounded-xl text-xs font-extrabold transition shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-[#ff5353] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Room Filter Selector */}
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 overflow-x-auto pb-1 no-scrollbar">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>Room:</span>
            {['ALL', 'WINGO_30S', 'WINGO_1M', 'WINGO_3M', 'WINGO_5M'].map(room => (
              <button
                key={room}
                onClick={() => { setRoomFilter(room); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 ${
                  roomFilter === room
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {room === 'ALL' ? 'All Rooms' : getRoomName(room)}
              </button>
            ))}
          </div>
        </div>

        {/* Bids List Cards */}
        <div className="space-y-2.5">
          {paginatedBets.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 shadow-sm border border-gray-100 space-y-2">
              <Ticket className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-xs font-bold text-gray-600">No bids matched your current filter criteria.</p>
              <button
                onClick={() => { setStatusFilter('ALL'); setRoomFilter('ALL'); setSearchQuery(''); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-extrabold rounded-xl hover:bg-gray-200 transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            paginatedBets.map(bet => {
              const isPending = bet.status === 'PENDING';
              const isWon = bet.status === 'WON';
              const netProfit = isWon ? bet.payout - bet.amount : -bet.amount;

              // Find corresponding game round result if available
              const roundResult = history.find(r => r.period === bet.period);

              return (
                <div 
                  key={bet.id}
                  className={`bg-white rounded-2xl p-3.5 shadow-sm border transition ${
                    isPending 
                      ? 'border-amber-200 bg-amber-50/20' 
                      : isWon 
                      ? 'border-emerald-200 bg-emerald-50/10' 
                      : 'border-gray-100'
                  }`}
                >
                  {/* Card Header: Room + Period + Status */}
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-800 font-extrabold px-2 py-0.5 rounded-md text-[10px] tracking-wide uppercase">
                        {getRoomName(bet.room)}
                      </span>
                      <span className="font-mono font-medium text-gray-500 text-[11px]" title={`Full Period: ${bet.period}`}>
                        Period: {bet.period}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isPending ? (
                        <div className="bg-amber-100 text-amber-800 border border-amber-300/60 px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-2xs">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Bid Placed</span>
                        </div>
                      ) : isWon ? (
                        <div className="bg-emerald-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                          <span>WON (+₹{netProfit})</span>
                        </div>
                      ) : (
                        <div className="bg-red-50 text-red-600 border border-red-200 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span>LOST (-₹{bet.amount})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Selection + Wager Amount + Final Result Display */}
                  <div className="pt-2.5 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-semibold">Select:</span>
                        {getSelectionBadge(bet.selection)}
                      </div>

                      <div className="text-[11px] text-gray-400 font-medium">
                        {formatDate(bet.createdAt)}
                      </div>
                    </div>

                    {/* Amount & Payout Calculation display */}
                    <div className="text-right space-y-0.5">
                      <div className="text-xs text-gray-500 font-bold">
                        Wager: <span className="text-gray-900 font-black">₹{bet.amount}</span>
                      </div>

                      <div>
                        {isPending ? (
                          <span className="text-amber-600 text-[11px] font-bold animate-pulse">
                            Awaiting Result...
                          </span>
                        ) : isWon ? (
                          <div className="text-[#18b660] font-black text-sm flex items-center justify-end gap-0.5">
                            <span>+₹{bet.payout}</span>
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                              ({bet.multiplier || 2}x)
                            </span>
                          </div>
                        ) : (
                          <span className="text-red-500 font-bold text-xs">
                            -₹{bet.amount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Round Declared Result Details (If round has concluded) */}
                  {roundResult && (
                    <div className="mt-2.5 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between text-[11px] text-gray-600">
                      <span className="font-semibold text-gray-500">Declared Result:</span>
                      <div className="flex items-center gap-2 font-bold">
                        <span>Number: <strong className="text-gray-900 font-black text-xs">{roundResult.number}</strong></span>
                        <span className="text-gray-400">|</span>
                        <span>{roundResult.bigSmall}</span>
                        <div className="flex items-center gap-1 ml-1">
                          {roundResult.colors.map((c, i) => (
                            <span
                              key={i}
                              className={`w-2.5 h-2.5 rounded-full ${
                                c === 'GREEN' ? 'bg-emerald-500' : c === 'RED' ? 'bg-red-500' : 'bg-purple-500'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between text-xs font-bold text-gray-600">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition"
            >
              Previous
            </button>

            <span className="text-gray-500 font-medium">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-[#ff5353] text-white hover:bg-red-600 disabled:opacity-40 transition shadow-xs"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
