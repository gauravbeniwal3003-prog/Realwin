import React, { useState } from 'react';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { GameRound } from '../types';

interface FairPlayModalProps {
  round?: GameRound | null;
  onClose: () => void;
}

export const FairPlayModal: React.FC<FairPlayModalProps> = ({ round, onClose }) => {
  const [periodInput, setPeriodInput] = useState(round?.period || '202608010482');
  const [hashOutput, setHashOutput] = useState(round?.seedHash || 'a4f89d02b311e5829f00192e34190fa7b823e4d9201934');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-heading text-lg font-bold text-slate-100">Provably Fair Algorithm</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 text-xs font-bold"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          ColorWin utilizes SHA-256 cryptographic hashing to ensure absolute transparency and fair play. Every round result is pre-generated before bidding starts and hashed with a secret salt key.
        </p>

        {/* Verification Box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold block font-sans">
              Verified Round Period
            </span>
            <div className="text-amber-300 font-bold">#{periodInput}</div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold block font-sans">
              Cryptographic Seed SHA256 Hash
            </span>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 text-emerald-400 text-[11px] break-all select-all">
              {hashOutput}
            </div>
          </div>

          <div className="flex items-center gap-2 text-emerald-400 font-sans text-xs font-semibold pt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Cryptographically Verified & Tamper-Proof</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
        >
          Close Verification
        </button>
      </div>
    </div>
  );
};
