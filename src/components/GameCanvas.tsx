import React, { useState } from 'react';
import { 
  Wallet, RefreshCw, Volume2, Flame, Clock, HelpCircle, 
  Minus, Plus, CheckCircle2, AlertCircle, Sparkles, ChevronRight, Shuffle
} from 'lucide-react';
import { RoomType, BetSelection, ServerGameState, User, GameRound, Bet } from '../types';
import { GameHistory } from './GameHistory';

interface GameCanvasProps {
  gameState: ServerGameState | null;
  user: User | null;
  onPlaceBet: (selection: BetSelection, amount: number) => Promise<void>;
  onOpenWallet: () => void;
  onOpenRules?: () => void;
  onOpenSupport?: () => void;
  lastRoundResult?: GameRound;
  activeRoom: RoomType;
  onChangeRoom: (room: RoomType) => void;
  recentRounds: GameRound[];
  myBets?: Bet[];
  onVerifySeed?: (round: GameRound) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  user,
  onPlaceBet,
  onOpenWallet,
  onOpenRules,
  onOpenSupport,
  lastRoundResult,
  activeRoom,
  onChangeRoom,
  recentRounds,
  myBets = [],
  onVerifySeed,
}) => {
  const [selectedBet, setSelectedBet] = useState<BetSelection | null>(null);
  
  // Bet Drawer Modal state
  const [balancePreset, setBalancePreset] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(1);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [isAgreed, setIsAgreed] = useState<boolean>(true);
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [betSuccessMsg, setBetSuccessMsg] = useState<string | null>(null);
  const [betErrorMsg, setBetErrorMsg] = useState<string | null>(null);

  const rooms: { id: RoomType; name: string; subtitle: string }[] = [
    { id: 'WINGO_30S', name: 'WinGo 30sec', subtitle: '30s' },
    { id: 'WINGO_1M', name: 'WinGo 1 Min', subtitle: '1m' },
  ];

  const handleOpenBetModal = (selection: BetSelection) => {
    setSelectedBet(selection);
    setBetSuccessMsg(null);
    setBetErrorMsg(null);
  };

  const handleRandomSelect = () => {
    const options: BetSelection[] = ['GREEN', 'RED', 'VIOLET', 'BIG', 'SMALL', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const randomPick = options[Math.floor(Math.random() * options.length)];
    handleOpenBetModal(randomPick);
  };

  const handleConfirmBet = async () => {
    if (!selectedBet) return;
    if (!isAgreed) {
      setBetErrorMsg('Please agree to the pre-sale rules to proceed.');
      return;
    }

    const totalAmount = balancePreset * quantity * multiplier;

    if (!user) {
      setBetErrorMsg('Please login to place your bid.');
      return;
    }

    if (user.balance < totalAmount) {
      setBetErrorMsg(`Insufficient balance! Need ₹${totalAmount}, current balance is ₹${user.balance}. Please deposit.`);
      return;
    }

    setIsSubmitting(true);
    setBetErrorMsg(null);

    try {
      await onPlaceBet(selectedBet, totalAmount);
      setBetSuccessMsg(`Bid placed successfully! ₹${totalAmount} on ${selectedBet}`);
      setTimeout(() => {
        setSelectedBet(null);
        setBetSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setBetErrorMsg(err.message || 'Failed to place bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const secondsRemaining = gameState?.secondsRemaining ?? 30;
  const isLocked = gameState?.isLocked ?? false;
  const period = gameState?.period ?? '100001';

  // Format digital countdown e.g. 0 0 : 2 8
  const formatTimeDigits = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const mStr = String(m).padStart(2, '0');
    const sStr = String(s).padStart(2, '0');
    return { m1: mStr[0], m2: mStr[1], s1: sStr[0], s2: sStr[1] };
  };

  const { m1, m2, s1, s2 } = formatTimeDigits(secondsRemaining);

  // Get active selection title & color for bottom sheet drawer
  const getBetColorConfig = (sel: BetSelection) => {
    if (sel === 'SMALL') {
      return {
        title: 'Select Small',
        bgHeader: 'bg-[#4086f4]',
        bgBtn: 'bg-[#4086f4] hover:bg-[#2e74e3]',
        textColor: 'text-[#4086f4]',
        borderColor: 'border-[#4086f4]',
      };
    }
    if (sel === 'BIG') {
      return {
        title: 'Select Big',
        bgHeader: 'bg-[#feaa38]',
        bgBtn: 'bg-[#feaa38] hover:bg-[#ea9725]',
        textColor: 'text-[#feaa38]',
        borderColor: 'border-[#feaa38]',
      };
    }
    if (sel === 'GREEN') {
      return {
        title: 'Select Green',
        bgHeader: 'bg-[#18b660]',
        bgBtn: 'bg-[#18b660] hover:bg-[#149b51]',
        textColor: 'text-[#18b660]',
        borderColor: 'border-[#18b660]',
      };
    }
    if (sel === 'RED') {
      return {
        title: 'Select Red',
        bgHeader: 'bg-[#ff5353]',
        bgBtn: 'bg-[#ff5353] hover:bg-[#e04343]',
        textColor: 'text-[#ff5353]',
        borderColor: 'border-[#ff5353]',
      };
    }
    if (sel === 'VIOLET') {
      return {
        title: 'Select Violet',
        bgHeader: 'bg-[#b659fe]',
        bgBtn: 'bg-[#b659fe] hover:bg-[#a042eb]',
        textColor: 'text-[#b659fe]',
        borderColor: 'border-[#b659fe]',
      };
    }
    // Numbers 0..9
    const num = Number(sel);
    if (num === 0) return { title: 'Select 0', bgHeader: 'bg-gradient-to-r from-[#ff5353] to-[#b659fe]', bgBtn: 'bg-[#b659fe]', textColor: 'text-[#b659fe]', borderColor: 'border-[#b659fe]' };
    if (num === 5) return { title: 'Select 5', bgHeader: 'bg-gradient-to-r from-[#18b660] to-[#b659fe]', bgBtn: 'bg-[#18b660]', textColor: 'text-[#18b660]', borderColor: 'border-[#18b660]' };
    if ([1, 3, 7, 9].includes(num)) return { title: `Select ${num}`, bgHeader: 'bg-[#18b660]', bgBtn: 'bg-[#18b660]', textColor: 'text-[#18b660]', borderColor: 'border-[#18b660]' };
    return { title: `Select ${num}`, bgHeader: 'bg-[#ff5353]', bgBtn: 'bg-[#ff5353]', textColor: 'text-[#ff5353]', borderColor: 'border-[#ff5353]' };
  };

  const totalCalculatedBet = balancePreset * quantity * multiplier;

  // Recent 5 numbers for the ticket card
  const recentBalls = recentRounds.slice(0, 5).map(r => r.number);
  // Default fallback numbers if history empty
  const displayBalls = recentBalls.length >= 5 ? recentBalls : [2, 9, 7, 7, 9];

  return (
    <div className="space-y-3 max-w-md mx-auto">
      {/* 1. Wallet Balance Card (Top Card in Screenshot 4) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-heading font-black text-3xl sm:text-4xl text-gray-900 tracking-tight">
            ₹{(user?.balance ?? 0).toFixed(2)}
          </span>
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-4">
          <Wallet className="w-3.5 h-3.5 text-gray-400" />
          <span>Wallet balance</span>
        </div>

        {/* Withdraw & Deposit Buttons */}
        <div className="flex items-center justify-center gap-4 w-full">
          <button
            onClick={onOpenWallet}
            className="flex-1 bg-[#ff5353] hover:bg-[#e04343] text-white font-bold text-sm py-2.5 px-6 rounded-full shadow-md shadow-red-200 transition active:scale-95 text-center"
          >
            Withdraw
          </button>
          <button
            onClick={onOpenWallet}
            className="flex-1 bg-[#18b660] hover:bg-[#159f53] text-white font-bold text-sm py-2.5 px-6 rounded-full shadow-md shadow-emerald-200 transition active:scale-95 text-center"
          >
            Deposit
          </button>
        </div>
      </div>

      {/* 2. Marquee Notice Bar */}
      <div className="bg-[#fff0f0] border border-[#ffe0e0] rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs text-[#e53935] shadow-xs">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <Volume2 className="w-4 h-4 text-[#ff5353] shrink-0" />
          <p className="truncate text-[11px] font-medium text-gray-700">
            If you have not received your withdrawal within 3 days, please contact our customer service immediately.
          </p>
        </div>
        <button 
          onClick={onOpenSupport || onOpenWallet}
          className="bg-[#ff5353] text-white text-[10px] font-bold px-3 py-1 rounded-full shrink-0 flex items-center gap-0.5 active:scale-95"
        >
          <Flame className="w-3 h-3 text-amber-200 fill-amber-200" />
          <span>Detail</span>
        </button>
      </div>

      {/* 3. Time Mode Tabs (WinGo 30sec, 1 Min) */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 grid grid-cols-2 gap-2">
        {rooms.map(room => {
          const isActive = activeRoom === room.id;
          return (
            <button
              key={room.id}
              onClick={() => onChangeRoom(room.id)}
              className={`py-2 px-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                isActive
                  ? 'bg-gradient-to-b from-[#ff5652] to-[#ff3b38] text-white shadow-md shadow-red-200'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Clock className={`w-5 h-5 mb-1 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span className="text-xs font-bold leading-none">{room.name}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Timer & Game Result Red Ticket Box */}
      <div className="bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-[#ffffff] rounded-2xl p-3.5 sm:p-4 shadow-md relative overflow-hidden">
        <div className="flex items-start justify-between gap-2 min-w-0">
          {/* Left: How to play & Recent Balls */}
          <div className="space-y-2 min-w-0 flex-1">
            <button 
              onClick={onOpenRules || (() => {})}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white font-bold text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 transition active:scale-95 w-fit"
            >
              <HelpCircle className="w-3.5 h-3.5 text-white" />
              <span>How to play</span>
            </button>

            <div className="text-xs font-semibold text-white/90 truncate">
              {rooms.find(r => r.id === activeRoom)?.name}
            </div>

            {/* 5 Result Number Balls */}
            <div className="flex items-center gap-1 flex-wrap">
              {displayBalls.map((num, idx) => {
                let ballColor = 'bg-[#ff5353]';
                if (num === 0) ballColor = 'bg-gradient-to-r from-[#ff5353] to-[#b659fe]';
                else if (num === 5) ballColor = 'bg-gradient-to-r from-[#18b660] to-[#b659fe]';
                else if ([1, 3, 7, 9].includes(num)) ballColor = 'bg-[#18b660]';

                return (
                  <span
                    key={idx}
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${ballColor} text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center shadow-xs border border-white/40 shrink-0`}
                  >
                    {num}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Right: Time remaining & Clock */}
          <div className="text-right space-y-1 shrink-0">
            <span className="text-[11px] font-medium text-white/90 block">Time remaining</span>
            
            {/* Clock Digit Boxes */}
            <div className="flex items-center justify-end gap-1 font-mono font-bold">
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-sm sm:text-base font-extrabold">{m1}</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-sm sm:text-base font-extrabold">{m2}</span>
              <span className="text-sm sm:text-base font-extrabold">:</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-sm sm:text-base font-extrabold">{s1}</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-sm sm:text-base font-extrabold">{s2}</span>
            </div>

            {/* Period Number */}
            <span className="text-[10px] sm:text-[11px] font-mono tracking-tight text-white/80 block pt-0.5 truncate max-w-[130px] ml-auto">
              {period}
            </span>
          </div>
        </div>

        {/* Lock Overlay Notification */}
        {isLocked && (
          <div className="mt-2 bg-black/30 backdrop-blur-xs border border-white/20 rounded-xl p-2 text-center text-xs font-bold text-amber-200 animate-pulse">
            Bidding Locked for Calculation
          </div>
        )}
      </div>

      {/* 5. Main Prediction Area */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 space-y-3">
        {/* Color Prediction Buttons (Green, Violet, Red) */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            disabled={isLocked}
            onClick={() => handleOpenBetModal('GREEN')}
            className="bg-[#18b660] hover:bg-[#149b51] disabled:opacity-50 text-white font-extrabold text-sm py-3 px-2 rounded-xl shadow-md shadow-emerald-100 transition active:scale-95 text-center flex items-center justify-center"
          >
            Green
          </button>

          <button
            disabled={isLocked}
            onClick={() => handleOpenBetModal('VIOLET')}
            className="bg-[#b659fe] hover:bg-[#a042eb] disabled:opacity-50 text-white font-extrabold text-sm py-3 px-2 rounded-xl shadow-md shadow-purple-100 transition active:scale-95 text-center flex items-center justify-center"
          >
            Violet
          </button>

          <button
            disabled={isLocked}
            onClick={() => handleOpenBetModal('RED')}
            className="bg-[#ff5353] hover:bg-[#e04343] disabled:opacity-50 text-white font-extrabold text-sm py-3 px-2 rounded-xl shadow-md shadow-red-100 transition active:scale-95 text-center flex items-center justify-center"
          >
            Red
          </button>
        </div>

        {/* 6. Number Balls Grid (0 to 9) */}
        <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
          <div className="grid grid-cols-5 gap-2.5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
              let ballClass = 'bg-[#ff5353] text-white';
              if (num === 0) ballClass = 'bg-gradient-to-br from-[#ff5353] via-[#b659fe] to-[#b659fe] text-white';
              else if (num === 5) ballClass = 'bg-gradient-to-br from-[#18b660] via-[#b659fe] to-[#b659fe] text-white';
              else if ([1, 3, 7, 9].includes(num)) ballClass = 'bg-[#18b660] text-white';

              return (
                <button
                  key={num}
                  disabled={isLocked}
                  onClick={() => handleOpenBetModal(String(num) as BetSelection)}
                  className={`w-12 h-12 rounded-full ${ballClass} font-heading font-black text-xl shadow-sm border-2 border-white/80 hover:scale-105 transition active:scale-95 flex items-center justify-center mx-auto disabled:opacity-50`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>

        {/* 7. Random & Multipliers Row */}
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto py-1">
          <button
            disabled={isLocked}
            onClick={handleRandomSelect}
            className="border border-[#ff5353] text-[#ff5353] font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-red-50 shrink-0 flex items-center gap-1 active:scale-95"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Random</span>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {[1, 5, 10, 20, 50, 100].map(m => (
              <button
                key={m}
                onClick={() => setMultiplier(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  multiplier === m
                    ? 'bg-[#ff5353] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                X{m}
              </button>
            ))}
          </div>
        </div>

        {/* 8. Big / Small Split Button (Matches Screenshot 3) */}
        <div className="pt-1">
          <div className="rounded-full overflow-hidden shadow-md flex h-12">
            <button
              disabled={isLocked}
              onClick={() => handleOpenBetModal('BIG')}
              className="bg-gradient-to-r from-[#feaa38] to-[#f99306] hover:from-[#ea9725] hover:to-[#e58300] text-white font-extrabold text-lg flex items-center justify-center flex-1 transition active:scale-98 disabled:opacity-50"
            >
              Big
            </button>
            <button
              disabled={isLocked}
              onClick={() => handleOpenBetModal('SMALL')}
              className="bg-gradient-to-r from-[#4086f4] to-[#256cf0] hover:from-[#2e74e3] hover:to-[#175ce0] text-white font-extrabold text-lg flex items-center justify-center flex-1 transition active:scale-98 disabled:opacity-50"
            >
              Small
            </button>
          </div>
        </div>
      </div>

      {/* 9. Game History Section directly under Big/Small */}
      <div className="pt-1">
        <GameHistory history={recentRounds} myBets={myBets} onVerifySeed={onVerifySeed || (() => {})} />
      </div>

      {/* 9. Bottom Sheet Drawer Modal (Positioned cleanly above bottom nav with z-[100]) */}
      {selectedBet && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-end justify-center animate-fadeIn">
          <div className="bg-white rounded-t-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp max-h-[92vh] flex flex-col pb-6">
            {/* Drawer Header Trapezoid Top matching selection color */}
            {(() => {
              const cfg = getBetColorConfig(selectedBet);
              return (
                <div className={`${cfg.bgHeader} text-white p-3.5 sm:p-4 text-center relative shrink-0`}>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5 opacity-90">
                    <span>{rooms.find(r => r.id === activeRoom)?.name}</span>
                    <button
                      onClick={() => setSelectedBet(null)}
                      className="text-white hover:opacity-75 font-bold text-lg p-1"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Center White Pill Label */}
                  <div className="bg-white text-gray-900 font-extrabold text-base py-1.5 px-6 rounded-full shadow-md inline-block">
                    {cfg.title}
                  </div>
                </div>
              );
            })()}

            {/* Drawer Content */}
            <div className="p-4 sm:p-5 space-y-3.5 text-gray-800 overflow-y-auto">
              {/* Notification Messages */}
              {betSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{betSuccessMsg}</span>
                </div>
              )}

              {betErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{betErrorMsg}</span>
                </div>
              )}

              {/* Balance Preset Row */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-600 block">Balance</span>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 10, 100, 1000].map(val => {
                    const cfg = getBetColorConfig(selectedBet);
                    const isSelected = balancePreset === val;
                    return (
                      <button
                        key={val}
                        onClick={() => setBalancePreset(val)}
                        className={`py-2 rounded-xl text-xs font-extrabold transition ${
                          isSelected
                            ? `${cfg.bgBtn} text-white shadow-md`
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Counter Row */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-600 block">Quantity</span>
                <div className="flex items-center justify-between bg-gray-100 p-1.5 rounded-xl">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg bg-white shadow-xs font-bold text-gray-700 hover:bg-gray-200 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-extrabold text-base text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-9 h-9 rounded-lg bg-white shadow-xs font-bold text-gray-700 hover:bg-gray-200 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Multiplier Row */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-600 block">Multiplier</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 5, 10, 20, 50, 100].map(m => {
                    const cfg = getBetColorConfig(selectedBet);
                    const isSelected = multiplier === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setMultiplier(m)}
                        className={`py-1.5 rounded-lg text-xs font-extrabold transition ${
                          isSelected
                            ? `${cfg.bgBtn} text-white shadow-xs`
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        X{m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rules Checkbox */}
              <div className="flex items-center gap-2 pt-1 text-xs">
                <input
                  type="checkbox"
                  id="agree-rules"
                  checked={isAgreed}
                  onChange={e => setIsAgreed(e.target.checked)}
                  className="rounded text-[#ff5353] focus:ring-[#ff5353] w-4 h-4 accent-[#ff5353]"
                />
                <label htmlFor="agree-rules" className="text-gray-600">
                  I agree <span className="text-[#ff5353] font-semibold cursor-pointer">《Pre-sale rules》</span>
                </label>
              </div>

              {/* Footer Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setSelectedBet(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl text-sm transition"
                >
                  Cancel
                </button>

                {(() => {
                  const cfg = getBetColorConfig(selectedBet);
                  return (
                    <button
                      disabled={isSubmitting || isLocked}
                      onClick={handleConfirmBet}
                      className={`flex-1 ${cfg.bgBtn} text-white font-extrabold py-3 px-4 rounded-xl text-sm shadow-md transition active:scale-95 disabled:opacity-50 text-center`}
                    >
                      {isSubmitting ? 'Processing...' : `Total amount ₹${totalCalculatedBet.toFixed(2)}`}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
