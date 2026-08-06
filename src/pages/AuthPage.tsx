import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, Sparkles, ShieldCheck, Zap, Award, ArrowRight, Smartphone, Lock, Gift, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { loginUser, registerUser } from '../lib/api';
import { RealWinLogo } from '../components/RealWinLogo';

interface AuthPageProps {
  onSuccess: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form Fields
  const [phone, setPhone] = useState('9876543210');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref);
      setActiveTab('REGISTER');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long');
      return;
    }

    if (activeTab === 'REGISTER') {
      if (password !== confirmPassword) {
        setErrorMsg('Password and Confirm Password do not match');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let user: User;
      if (activeTab === 'LOGIN') {
        user = await loginUser(phone, password);
      } else {
        user = await registerUser({
          phone,
          password,
          referralCode,
          name: `Player_${phone.slice(-4)}`,
        });
      }
      onSuccess(user);
      navigate('/game');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async () => {
    setIsSubmitting(true);
    try {
      const user = await loginUser('9876543210', '123456');
      onSuccess(user);
      navigate('/game');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col items-center justify-between p-3 sm:p-4 font-sans select-none pb-6">
      {/* Top Header Bar */}
      <div className="w-full max-w-md flex items-center justify-between pt-2 pb-3">
        <RealWinLogo size="md" lightMode={true} />
        <button
          onClick={handleQuickDemo}
          className="px-3.5 py-1.5 bg-white hover:bg-gray-50 text-amber-600 font-extrabold text-xs rounded-2xl border border-amber-200 shadow-xs flex items-center gap-1.5 transition active:scale-95"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Demo Play</span>
        </button>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-xl my-auto space-y-5">
        {/* Banner inside Login Card */}
        <div className="bg-gradient-to-r from-[#ff5652] via-[#ff4340] to-[#ff2a2a] text-white p-4 sm:p-5 rounded-2xl shadow-md space-y-1.5 text-center">
          <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white/20 border border-white/30 text-amber-200 text-[10px] font-black uppercase tracking-wider">
            <Gift className="w-3 h-3 text-amber-200" />
            <span>₹100 Free Trial Bonus</span>
          </div>
          <h1 className="font-heading font-black text-2xl text-white tracking-tight">
            Predict & Win Real Cash
          </h1>
          <p className="text-xs text-white/90 font-medium leading-relaxed">
            India's most trusted WinGo color prediction platform with instant 2-hour UPI payouts.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('LOGIN');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
              activeTab === 'LOGIN'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 font-bold'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('REGISTER');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
              activeTab === 'REGISTER'
                ? 'bg-gradient-to-r from-[#ff5652] to-[#ff3b38] text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 font-bold'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Register</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold text-center flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Mobile Number */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>Mobile Number</span>
              <span className="text-[10px] text-[#ff5353] font-black">+91 India</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#ff5353] focus:bg-white transition"
              />
              <Smartphone className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#ff5353] focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Registration Extra Fields */}
          {activeTab === 'REGISTER' && (
            <>
              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#ff5353] focus:bg-white transition"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
                </div>
              </div>

              {/* Optional Referral Code */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>Referral Code</span>
                  <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value)}
                    placeholder="Enter referral code (Optional)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#ff5353] focus:bg-white transition uppercase"
                  />
                  <Gift className="w-4 h-4 text-amber-500 absolute right-3.5 top-3.5" />
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-[#ff5652] to-[#ff3b38] hover:from-[#e04541] hover:to-[#e02d2a] text-white font-black rounded-2xl text-sm shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            <span>{activeTab === 'LOGIN' ? 'Login & Play' : 'Register Account (Get ₹500)'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center">
          <div className="p-2 rounded-2xl bg-gray-50 border border-gray-100">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500 mx-auto mb-1" />
            <span className="text-[10px] font-extrabold text-gray-800 block">Fast Payouts</span>
            <span className="text-[9px] text-gray-500 block">Within 2 Hours</span>
          </div>

          <div className="p-2 rounded-2xl bg-gray-50 border border-gray-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <span className="text-[10px] font-extrabold text-gray-800 block">SHA-256</span>
            <span className="text-[9px] text-gray-500 block">100% Fair Play</span>
          </div>

          <div className="p-2 rounded-2xl bg-gray-50 border border-gray-100">
            <Award className="w-4 h-4 text-rose-500 mx-auto mb-1" />
            <span className="text-[10px] font-extrabold text-gray-800 block">4 VIP Rooms</span>
            <span className="text-[9px] text-gray-500 block">30s to 5M</span>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center text-[11px] text-gray-400 py-2">
        <p>© 2026 RealWin Official. All rights reserved. 18+ Play Responsibly.</p>
      </div>
    </div>
  );
};
