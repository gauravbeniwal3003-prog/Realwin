import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, RefreshCw, ShieldCheck, UserCheck, LogIn } from 'lucide-react';
import { User } from '../types';
import { RealWinLogo } from './RealWinLogo';

interface HeaderProps {
  user: User | null;
  onRefreshUser?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onRefreshUser,
  isRefreshing = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isGamePage = location.pathname === '/' || location.pathname === '/game';

  const handleBack = () => {
    navigate('/game');
  };

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-[#ff5652] via-[#ff4340] to-[#ff2a2a] text-white px-3 py-2.5 sm:px-4 shadow-md">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Left Side: Back Arrow (if not on home/game) + RealWin Logo */}
        <div className="flex items-center gap-1.5">
          {!isGamePage && (
            <button 
              onClick={handleBack}
              className="p-1 rounded-full hover:bg-white/10 transition active:scale-95 text-white"
              title="Back to Game"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <RealWinLogo size="md" onClick={() => navigate('/game')} />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => navigate('/fairplay')}
            className={`p-1.5 rounded-full hover:bg-white/20 text-white transition active:scale-95 ${
              location.pathname === '/fairplay' ? 'bg-white/30 text-amber-200 ring-2 ring-white/50' : 'bg-white/10'
            }`}
            title="Fair Play Verification"
          >
            <ShieldCheck className="w-4 h-4 text-white" />
          </button>

          {onRefreshUser && (
            <button
              onClick={onRefreshUser}
              className={`p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 ${
                isRefreshing ? 'animate-spin text-amber-300' : ''
              }`}
              title="Refresh Balance"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => navigate(user ? '/account' : '/login')}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 flex items-center gap-1 text-xs font-bold"
            title={user ? user.name : 'Login / Register'}
          >
            {user ? <UserCheck className="w-4 h-4 text-emerald-200" /> : <LogIn className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </header>
  );
};

