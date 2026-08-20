import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getAppPath } from '../config/appConfig';
import {
  Gamepad2,
  Trophy,
  Flame,
  Zap,
  Sparkles,
  ShieldCheck,
  Headset,
  ArrowRight,
  Lock,
  Wallet,
  TrendingUp,
  UserCheck,
  Gift,
  ChevronRight,
  Play,
  Award,
  Crown,
} from 'lucide-react';
import { User } from '../types';

interface LandingPageProps {
  user: User | null;
}

interface WinnerItem {
  id: string;
  avatar: string;
  userName: string;
  amount: number;
  timeAgo: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ user }) => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Top leaderboard podium winners (clean, no game name or period)
  const topWinners = [
    { rank: 1, name: '98***912', amount: 185400, avatar: '👑' },
    { rank: 2, name: '91***483', amount: 124500, avatar: '🥈' },
    { rank: 3, name: '88***309', amount: 89200, avatar: '🥉' },
  ];

  // Live feed simulation state (clean name, avatar, time & amount)
  const [recentWinners, setRecentWinners] = useState<WinnerItem[]>([
    { id: 'w1', avatar: '😎', userName: '98***821', amount: 14500, timeAgo: 'Just now' },
    { id: 'w2', avatar: '🚀', userName: '91***204', amount: 28900, timeAgo: '2s ago' },
    { id: 'w3', avatar: '🔥', userName: '87***911', amount: 4800, timeAgo: '4s ago' },
    { id: 'w4', avatar: '💎', userName: '96***502', amount: 52000, timeAgo: '7s ago' },
    { id: 'w5', avatar: '⚡', userName: '93***118', amount: 9600, timeAgo: '10s ago' },
  ]);

  // Dynamically push new live winner every 3 seconds
  useEffect(() => {
    const avatars = ['😎', '🚀', '🔥', '💎', '⚡', '🌟', '🤑', '🏆'];
    const prefixes = ['98', '91', '97', '88', '70', '96', '93', '81'];

    const interval = setInterval(() => {
      const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const name = `${randomPrefix}***${randomSuffix}`;
      const avatar = avatars[Math.floor(Math.random() * avatars.length)];
      const amount = Math.floor(Math.random() * 80) * 500 + 1200;

      const newWinner: WinnerItem = {
        id: 'w_' + Date.now(),
        avatar,
        userName: name,
        amount,
        timeAgo: 'Just now',
      };

      setRecentWinners(prev => [newWinner, ...prev.slice(0, 7)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const gamesList = [
    {
      id: 'wingo',
      name: 'Win Go',
      desc: 'Predict Color & Numbers',
      active: true,
      image: '🎮',
      badge: 'LIVE NOW',
      color: 'from-[#ff5353] to-[#d92222]',
    },
    {
      id: 'trx_wingo',
      name: 'Trx Win Go',
      desc: 'TRX Hash Lotre',
      active: false,
      image: '⚡',
      badge: 'COMING SOON',
    },
    {
      id: 'k3_lotre',
      name: 'K3 Lotre',
      desc: 'Dice Roll Game',
      active: false,
      image: '🎲',
      badge: 'COMING SOON',
    },
    {
      id: '5d_lotre',
      name: '5D Lotre',
      desc: '5 Digit Combination',
      active: false,
      image: '🔮',
      badge: 'COMING SOON',
    },
    {
      id: 'aviator',
      name: 'Aviator',
      desc: 'Crash Multiplier',
      active: false,
      image: '✈️',
      badge: 'COMING SOON',
    },
    {
      id: 'slots',
      name: 'Slots',
      desc: 'Spin Jackpot',
      active: false,
      image: '🎰',
      badge: 'COMING SOON',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none pb-28">
      <Header user={user} />

      <main className="max-w-md w-full mx-auto px-3.5 py-3 space-y-4 flex-1">
        {/* Sleek Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 border border-rose-900/30 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ff5353]/20 text-[#ff5353] font-black text-[10px] uppercase tracking-wider">
                <Flame className="w-3 h-3" />
                Official Platform
              </span>
              <h1 className="font-heading text-2xl font-black tracking-tight text-white">
                RealWin
              </h1>
              <p className="text-xs text-gray-300 font-medium">
                Instant UPI Deposit & 24/7 Fast Withdrawals
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff5353] to-[#d03232] flex items-center justify-center text-white shadow-md shadow-rose-500/30 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
          </div>

          <button
            onClick={() => navigate('/game')}
            className="w-full py-3 bg-gradient-to-r from-[#ff5353] to-[#e03a3a] hover:from-[#e03a3a] text-white font-extrabold text-sm rounded-2xl shadow-md shadow-rose-500/30 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>PLAY WIN GO NOW</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Live Winner Leaderboard (Cleaned & Minimal) */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Crown className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Live Leaderboard
              </h3>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Wins
            </span>
          </div>

          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Rank 2 */}
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex flex-col items-center justify-between">
              <span className="text-lg">🥈</span>
              <span className="text-[11px] font-black text-gray-800">{topWinners[1].name}</span>
              <span className="text-xs font-black text-[#18b660] mt-1 font-mono">
                ₹{topWinners[1].amount.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Rank 1 */}
            <div className="bg-gradient-to-b from-amber-50 to-amber-100/50 p-2.5 rounded-2xl border border-amber-300 flex flex-col items-center justify-between relative -mt-1 shadow-xs">
              <span className="text-2xl">👑</span>
              <span className="text-xs font-black text-gray-900">{topWinners[0].name}</span>
              <span className="text-xs font-black text-[#18b660] mt-1 font-mono">
                ₹{topWinners[0].amount.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Rank 3 */}
            <div className="bg-orange-50/60 p-2.5 rounded-2xl border border-orange-100 flex flex-col items-center justify-between">
              <span className="text-lg">🥉</span>
              <span className="text-[11px] font-black text-gray-800">{topWinners[2].name}</span>
              <span className="text-xs font-black text-[#18b660] mt-1 font-mono">
                ₹{topWinners[2].amount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Live Recent Wins List */}
          <div className="space-y-1.5 pt-1">
            <div className="space-y-1.5 max-h-48 overflow-hidden">
              {recentWinners.map((win) => (
                <div
                  key={win.id}
                  className="p-2 bg-gray-50/80 rounded-xl flex items-center justify-between gap-2 border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{win.avatar}</span>
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">{win.userName}</span>
                      <span className="text-[9px] text-gray-400 font-medium">{win.timeAgo}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-[#18b660] font-mono block">
                      +₹{win.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Games Lobby */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider px-1">
            Games Lobby
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {gamesList.map((game) => (
              <div
                key={game.id}
                onClick={() => {
                  if (game.active) {
                    navigate(getAppPath('/game'));
                  }
                }}
                className={`relative rounded-3xl overflow-hidden p-4 flex flex-col justify-between h-36 border transition-all ${
                  game.active
                    ? 'bg-gradient-to-br ' + game.color + ' text-white shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 border-transparent'
                    : 'bg-white border-gray-200/80 text-gray-800'
                }`}
              >
                {/* ACTIVE WIN GO GAME CARD */}
                {game.active ? (
                  <>
                    <div className="flex items-start justify-between">
                      <span className="text-3xl">{game.image}</span>
                      <span className="bg-white/20 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/30">
                        {game.badge}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="font-heading text-lg font-black leading-tight text-white flex items-center gap-1">
                        <span>{game.name}</span>
                        <ChevronRight className="w-4 h-4" />
                      </h4>
                      <p className="text-[10px] text-white/80 font-medium">
                        {game.desc}
                      </p>
                    </div>
                  </>
                ) : (
                  /* INACTIVE / COMING SOON BLURRED GAMES */
                  <>
                    <div className="filter blur-[2px] opacity-30 select-none space-y-2 pointer-events-none">
                      <span className="text-3xl">{game.image}</span>
                      <h4 className="font-heading text-base font-black text-gray-900">{game.name}</h4>
                    </div>

                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-center p-3 z-10">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-amber-300 mb-1 border border-white/20">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        COMING SOON
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => navigate(getAppPath('/wallet'))}
            className="p-3 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-2xl flex items-center gap-2 text-gray-800 text-xs font-bold transition active:scale-95 shadow-xs"
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Wallet & UPI</span>
          </button>

          <button
            onClick={() => navigate(getAppPath('/support'))}
            className="p-3 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-2xl flex items-center gap-2 text-gray-800 text-xs font-bold transition active:scale-95 shadow-xs"
          >
            <Headset className="w-4 h-4 text-rose-600" />
            <span>24/7 Support</span>
          </button>
        </div>
      </main>
    </div>
  );
};
