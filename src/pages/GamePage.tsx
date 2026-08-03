import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { GameCanvas } from '../components/GameCanvas';
import { Gamepad2, Wallet, User as UserIcon } from 'lucide-react';
import { User, ServerGameState, GameRound, Bet, BetSelection, RoomType } from '../types';

interface GamePageProps {
  user: User | null;
  gameState: ServerGameState | null;
  activeRoom: RoomType;
  onChangeRoom: (room: RoomType) => void;
  history: GameRound[];
  myBets: Bet[];
  onPlaceBet: (selection: BetSelection, amount: number) => Promise<void>;
  onRefreshUser?: () => void;
  isRefreshing?: boolean;
}

export const GamePage: React.FC<GamePageProps> = ({
  user,
  gameState,
  activeRoom,
  onChangeRoom,
  history,
  myBets,
  onPlaceBet,
  onRefreshUser,
  isRefreshing = false,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none pb-24">
      <Header user={user} onRefreshUser={onRefreshUser} isRefreshing={isRefreshing} />

      <main className="max-w-md w-full mx-auto px-3 py-3 space-y-3 flex-1 overflow-x-hidden">
        <GameCanvas
          gameState={gameState}
          user={user}
          onPlaceBet={onPlaceBet}
          onOpenWallet={() => navigate('/wallet')}
          onOpenRules={() => navigate('/rules')}
          onOpenSupport={() => navigate('/support')}
          lastRoundResult={history[0]}
          activeRoom={activeRoom}
          onChangeRoom={onChangeRoom}
          recentRounds={history}
          myBets={myBets}
          onVerifySeed={() => navigate('/fairplay')}
        />
      </main>
    </div>
  );
};
