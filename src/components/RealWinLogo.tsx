import React from 'react';
import { Crown } from 'lucide-react';

interface RealWinLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  lightMode?: boolean;
  className?: string;
  onClick?: () => void;
}

export const RealWinLogo: React.FC<RealWinLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  lightMode = false,
  className = '',
  onClick,
}) => {
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const containerSizes = {
    sm: 'w-6 h-6 rounded-lg',
    md: 'w-7.5 h-7.5 rounded-xl',
    lg: 'w-10 h-10 rounded-2xl',
    xl: 'w-14 h-14 rounded-2xl',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex flex-col items-center justify-center select-none ${onClick ? 'cursor-pointer active:scale-95 transition' : ''} ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {/* Emblem Box */}
        <div
          className={`flex items-center justify-center shadow-xs transition-all ${containerSizes[size]} ${
            lightMode
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-amber-400/20 border border-amber-300/40'
          }`}
        >
          <Crown className={`${iconSizes[size]} text-amber-500 fill-amber-500`} />
        </div>

        {/* Brand Name */}
        <span className={`font-heading font-black tracking-wider uppercase leading-none ${textSizes[size]}`}>
          <span className={lightMode ? 'text-gray-900' : 'text-white drop-shadow-xs'}>REAL</span>
          <span className={lightMode ? 'text-[#ff5353]' : 'text-amber-300 drop-shadow-xs'}>WIN</span>
        </span>
      </div>

      {showSubtitle && (
        <span
          className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
            lightMode ? 'text-gray-500' : 'text-amber-200/90'
          }`}
        >
          India's #1 Provably Fair Predictor
        </span>
      )}
    </div>
  );
};
