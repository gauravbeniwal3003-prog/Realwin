import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Gamepad2, Wallet, User as UserIcon } from 'lucide-react';
import { getAppPath, APP_SECRET_SLUG } from '../config/appConfig';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Only show bottom navigation if we are inside the active app slug
  const validPrefix = `/${APP_SECRET_SLUG}`;
  if (!location.pathname.startsWith(validPrefix)) {
    return null;
  }

  // Hide bottom nav on login page if needed
  if (location.pathname === getAppPath('/login') || location.pathname === getAppPath('/register')) {
    return null;
  }

  const isHome = location.pathname === getAppPath('/') || location.pathname === getAppPath('/home') || location.pathname === validPrefix;
  const isGame = location.pathname === getAppPath('/game');
  const isWallet = location.pathname === getAppPath('/wallet');
  const isAccount = location.pathname === getAppPath('/account') || location.pathname === getAppPath('/profile');

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200/80 px-4 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-w-md mx-auto">
      {/* Home Tab */}
      <button
        onClick={() => navigate(getAppPath('/game'))}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition active:scale-95 ${
          isHome && !isGame ? 'text-[#ff5353]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Home className={`w-5 h-5 ${isHome && !isGame ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span>Home</span>
      </button>

      {/* WinGo Tab */}
      <button
        onClick={() => navigate(getAppPath('/game'))}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition active:scale-95 ${
          isGame ? 'text-[#ff5353]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Gamepad2 className={`w-5 h-5 ${isGame ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span>WinGo</span>
      </button>

      {/* Wallet Floating Button */}
      <button
        onClick={() => navigate(getAppPath('/wallet'))}
        className="flex flex-col items-center text-[10px] font-extrabold transition hover:scale-105 active:scale-95 group -mt-4"
      >
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all ${
            isWallet
              ? 'bg-gradient-to-tr from-[#18b660] to-[#20e276] text-white shadow-emerald-400/40 scale-105 ring-2 ring-emerald-400/30'
              : 'bg-gradient-to-tr from-[#18b660] to-[#25d366] text-white shadow-emerald-200'
          }`}
        >
          <Wallet className="w-5 h-5" />
        </div>
        <span className={`text-[10px] font-extrabold mt-0.5 ${isWallet ? 'text-[#18b660]' : 'text-gray-500'}`}>
          Wallet
        </span>
      </button>

      {/* Account Tab */}
      <button
        onClick={() => navigate(getAppPath('/account'))}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition active:scale-95 ${
          isAccount ? 'text-[#ff5353]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <UserIcon className={`w-5 h-5 ${isAccount ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span>Account</span>
      </button>
    </div>
  );
};
