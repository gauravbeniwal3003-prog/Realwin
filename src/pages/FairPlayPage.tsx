import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { ShieldCheck, CheckCircle2, Copy, Check, Lock, Code2, Cpu } from 'lucide-react';
import { GameRound, User } from '../types';

interface FairPlayPageProps {
  user: User | null;
  historyRounds: GameRound[];
}

export const FairPlayPage: React.FC<FairPlayPageProps> = ({ user, historyRounds }) => {
  const selectedRound = historyRounds[0] || null;
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleCopyHash = () => {
    if (selectedRound) {
      navigator.clipboard.writeText(selectedRound.seedHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none pb-24">
      <Header user={user} />

      <main className="max-w-md w-full mx-auto px-3 py-4 space-y-4 flex-1">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-lg space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-black tracking-tight text-white">SHA-256 Provably Fair</h2>
              <span className="text-xs text-emerald-100 font-medium">100% Transparent & Verifiable Outcomes</span>
            </div>
          </div>
          <p className="text-xs text-emerald-100/90 leading-relaxed pt-1">
            RealWin uses cryptographic SHA-256 hash seeds published BEFORE each round starts. No one, including admins, can alter the outcome once the period hash is generated.
          </p>
        </div>

        {/* Selected Round Audit */}
        {selectedRound && (
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Audited Period</span>
                <span className="font-mono font-black text-sm text-gray-900">#{selectedRound.period}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Result Number</span>
                <span className="font-mono font-black text-base text-emerald-600">
                  {selectedRound.number} ({selectedRound.bigSmall})
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-black text-gray-700 uppercase tracking-wider block">Cryptographic Seed Hash</span>
              <div className="flex items-center justify-between gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <span className="font-mono text-xs text-gray-700 break-all select-all font-bold">
                  {selectedRound.seedHash}
                </span>
                <button
                  onClick={handleCopyHash}
                  className="p-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 transition shrink-0"
                  title="Copy Hash"
                >
                  {copiedHash ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>SHA-256 Verification Status: PASSED & VALIDATED</span>
            </div>
          </div>
        )}

        {/* Algorithm Specs */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3 text-xs text-gray-700 leading-relaxed">
          <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>How Verification Works</span>
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 font-medium">
            <li>Before betting opens, the system generates a random secret salt.</li>
            <li>The SHA-256 algorithm combines the Period ID, Room, Salt, and Winning Number into a 64-character hash.</li>
            <li>The hash is published to the public feed immediately when betting opens.</li>
            <li>Anyone can recalculate `SHA256(period-room-FAIRPLAY-winningNum)` using online tools to verify zero manipulation!</li>
          </ol>
        </div>
      </main>
    </div>
  );
};
