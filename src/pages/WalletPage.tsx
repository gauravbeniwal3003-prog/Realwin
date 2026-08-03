import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Wallet, Copy, Check, ArrowDownCircle, ArrowUpCircle, AlertCircle, Clock, CheckCircle2, Building, Smartphone } from 'lucide-react';
import { User, DepositRequest, WithdrawalRequest, SystemSettings } from '../types';

interface WalletPageProps {
  user: User | null;
  settings: SystemSettings;
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  onSubmitDeposit: (amount: number, utr: string, instantSimulated?: boolean) => Promise<void>;
  onSubmitWithdrawal: (params: {
    amount: number;
    type: 'UPI' | 'BANK';
    upiId?: string;
    bankDetails?: {
      accountNumber: string;
      ifscCode: string;
      holderName: string;
      bankName: string;
    };
  }) => Promise<void>;
  onRefreshUser?: () => void;
  isRefreshing?: boolean;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  user,
  settings,
  deposits,
  withdrawals,
  onSubmitDeposit,
  onSubmitWithdrawal,
  onRefreshUser,
  isRefreshing = false,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'DEPOSIT' | 'WITHDRAW' | 'HISTORY') || 'DEPOSIT';
  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAW' | 'HISTORY'>(initialTab);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Deposit State
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [isInstantDemo, setIsInstantDemo] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [depositStatusMsg, setDepositStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);

  // Withdrawal State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(500);
  const [withdrawType, setWithdrawType] = useState<'UPI' | 'BANK'>('UPI');
  const [withdrawUpi, setWithdrawUpi] = useState<string>('');
  const [accNumber, setAccNumber] = useState<string>('');
  const [ifsc, setIfsc] = useState<string>('');
  const [holderName, setHolderName] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [withdrawStatusMsg, setWithdrawStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);

  // Calculate user total approved deposits
  const totalUserApprovedDeposits = deposits
    .filter(d => (d.userId === user?.id || d.userPhone === user?.phone) && d.status === 'APPROVED')
    .reduce((sum, d) => sum + d.amount, 0);

  const hasDepositedMin100 = totalUserApprovedDeposits >= 100;

  const handleTabChange = (tab: 'DEPOSIT' | 'WITHDRAW' | 'HISTORY') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(settings.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const minD = settings.minDeposit || 500;
    const maxD = settings.maxDeposit || 5000;

    if (depositAmount < 500) {
      setDepositStatusMsg({ type: 'ERROR', text: '₹100 deposit option is currently NOT AVAILABLE. Minimum deposit amount is ₹500.' });
      return;
    }

    if (depositAmount < minD || depositAmount > maxD) {
      setDepositStatusMsg({ type: 'ERROR', text: `Deposit amount must be between ₹${minD} and ₹${maxD.toLocaleString('en-IN')}` });
      return;
    }

    if (!utrNumber || utrNumber.trim().length < 8) {
      setDepositStatusMsg({ type: 'ERROR', text: 'Please enter valid 12-digit UTR/Ref transaction ID' });
      return;
    }

    setIsSubmittingDeposit(true);
    setDepositStatusMsg(null);

    try {
      await onSubmitDeposit(depositAmount, utrNumber.trim(), isInstantDemo);
      setDepositStatusMsg({
        type: 'SUCCESS',
        text: isInstantDemo
          ? `₹${depositAmount} added instantly to your balance!`
          : `Deposit request for ₹${depositAmount} submitted successfully! Admin will verify UTR and credit your account shortly.`,
      });
      setUtrNumber('');
    } catch (err: any) {
      setDepositStatusMsg({ type: 'ERROR', text: err.message || 'Deposit submission failed' });
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!hasDepositedMin100) {
      setWithdrawStatusMsg({
        type: 'ERROR',
        text: 'Minimum ₹100 deposit required before sending a withdrawal request. Please make a deposit first (Note: Minimum available deposit option is ₹500).'
      });
      return;
    }

    const minW = settings.minWithdrawal || 300;
    const maxW = settings.maxWithdrawal || 300000;

    if (withdrawAmount < minW || withdrawAmount > maxW) {
      setWithdrawStatusMsg({ type: 'ERROR', text: `Withdrawal amount must be between ₹${minW} and ₹${maxW.toLocaleString('en-IN')}` });
      return;
    }

    if (user.balance < withdrawAmount) {
      setWithdrawStatusMsg({ type: 'ERROR', text: 'Insufficient wallet balance!' });
      return;
    }

    if (withdrawType === 'UPI' && (!withdrawUpi || !withdrawUpi.includes('@'))) {
      setWithdrawStatusMsg({ type: 'ERROR', text: 'Enter valid UPI ID (e.g. name@upi)' });
      return;
    }

    if (withdrawType === 'BANK' && (!accNumber || !ifsc || !holderName)) {
      setWithdrawStatusMsg({ type: 'ERROR', text: 'Fill all bank account fields' });
      return;
    }

    setIsSubmittingWithdraw(true);
    setWithdrawStatusMsg(null);

    try {
      await onSubmitWithdrawal({
        amount: withdrawAmount,
        type: withdrawType,
        upiId: withdrawType === 'UPI' ? withdrawUpi.trim() : undefined,
        bankDetails:
          withdrawType === 'BANK'
            ? {
                accountNumber: accNumber.trim(),
                ifscCode: ifsc.trim().toUpperCase(),
                holderName: holderName.trim(),
                bankName: bankName.trim() || 'Bank',
              }
            : undefined,
      });

      setWithdrawStatusMsg({
        type: 'SUCCESS',
        text: `Withdrawal request of ₹${withdrawAmount} submitted! Manual payout will be processed to your specified account within 2 hours.`,
      });
    } catch (err: any) {
      setWithdrawStatusMsg({ type: 'ERROR', text: err.message || 'Withdrawal submission failed' });
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none pb-24">
      <Header user={user} onRefreshUser={onRefreshUser} isRefreshing={isRefreshing} />

      <main className="max-w-md w-full mx-auto px-3 py-4 space-y-4 flex-1">
        {/* Total Balance Card */}
        <div className="bg-gradient-to-r from-[#ff5652] via-[#ff4340] to-[#ff2a2a] rounded-3xl p-5 text-white shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs text-white/80 block uppercase font-bold tracking-wider">Total Available Balance</span>
                <h2 className="text-3xl font-black font-mono tracking-tight text-amber-200">
                  ₹{(user?.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-xs gap-1">
          <button
            onClick={() => handleTabChange('DEPOSIT')}
            className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              activeTab === 'DEPOSIT'
                ? 'bg-[#18b660] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Deposit</span>
          </button>

          <button
            onClick={() => handleTabChange('WITHDRAW')}
            className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              activeTab === 'WITHDRAW'
                ? 'bg-[#ff5353] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Withdraw</span>
          </button>

          <button
            onClick={() => handleTabChange('HISTORY')}
            className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              activeTab === 'HISTORY'
                ? 'bg-gray-800 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {/* DEPOSIT TAB */}
          {activeTab === 'DEPOSIT' && (
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              {depositStatusMsg && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
                    depositStatusMsg.type === 'SUCCESS'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {depositStatusMsg.type === 'SUCCESS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span>{depositStatusMsg.text}</span>
                </div>
              )}

              {/* QR & UPI ID Box */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="text-xs font-black text-[#18b660] uppercase tracking-wider block">
                    Official Payment UPI QR Code
                  </span>
                  <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-200">
                    <img
                      src={settings.qrCodeUrl}
                      alt="UPI QR"
                      className="w-40 h-40 sm:w-48 sm:h-48 object-contain"
                    />
                  </div>

                  <div className="w-full space-y-2">
                    <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider block">
                      Pay Directly to UPI ID
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-gray-50 px-3.5 py-2.5 rounded-2xl border border-gray-200">
                      <span className="font-mono text-sm font-black text-gray-900 select-all">
                        {settings.upiId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-3 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition flex items-center gap-1"
                      >
                        {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Amount Selector */}
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex justify-between items-center">
                  <span>Select Deposit Amount (₹)</span>
                  <span className="text-[10px] text-[#18b660]">Min ₹500 - Max ₹5,000</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {/* ₹100 Option - Marked as NOT AVAILABLE */}
                  <button
                    type="button"
                    onClick={() => {
                      setDepositAmount(100);
                      setDepositStatusMsg({
                        type: 'ERROR',
                        text: '₹100 deposit option is currently NOT AVAILABLE. Minimum deposit allowed is ₹500.',
                      });
                    }}
                    className="py-2 px-1 rounded-2xl text-xs font-black bg-gray-100 text-gray-400 border border-dashed border-gray-300 relative flex flex-col items-center justify-center gap-0.5 hover:bg-rose-50 hover:border-rose-300 transition"
                  >
                    <span className="line-through text-gray-400 font-extrabold">₹100</span>
                    <span className="text-[7.5px] bg-rose-600 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-tighter">
                      UNAVAILABLE
                    </span>
                  </button>

                  {[500, 1000, 2000, 3000, 4000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setDepositAmount(amt);
                        setDepositStatusMsg(null);
                      }}
                      className={`py-2.5 rounded-2xl text-xs font-black transition ${
                        depositAmount === amt
                          ? 'bg-[#18b660] text-white shadow-xs ring-2 ring-[#18b660]/30'
                          : 'bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <div className="pt-1 space-y-1">
                  <input
                    type="number"
                    min={settings.minDeposit || 500}
                    max={settings.maxDeposit || 5000}
                    value={depositAmount}
                    onChange={e => setDepositAmount(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-black focus:outline-none focus:border-[#18b660]"
                  />
                  <p className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>₹100 deposit option is currently locked. Minimum deposit option available is ₹500.</span>
                  </p>
                </div>
              </div>

              {/* 12-Digit UTR Form */}
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-2">
                <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center justify-between">
                  <span>12-Digit UTR / Ref Transaction ID</span>
                  <span className="text-[10px] text-[#ff5353]">Required</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 421598201934"
                  maxLength={20}
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18b660]"
                />
                <p className="text-[10px] text-gray-500 font-medium">
                  Copy the 12-digit UTR/Ref ID from GPay, PhonePe, or Paytm after completing payment.
                </p>
              </div>

              {/* Instant Simulated Checkbox */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-3xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-amber-900 block">Simulated Demo Credit</span>
                  <span className="text-[10px] text-amber-700 font-medium">Instantly add test balance for preview</span>
                </div>
                <input
                  type="checkbox"
                  checked={isInstantDemo}
                  onChange={e => setIsInstantDemo(e.target.checked)}
                  className="w-5 h-5 accent-[#18b660] cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingDeposit}
                className="w-full py-4 bg-[#18b660] hover:bg-emerald-600 text-white font-black rounded-2xl text-sm shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {isSubmittingDeposit ? 'Submitting Deposit...' : `Confirm Deposit (₹${depositAmount})`}
              </button>
            </form>
          )}

          {/* WITHDRAW TAB */}
          {activeTab === 'WITHDRAW' && (
            <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
              {!hasDepositedMin100 && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-3xl flex items-start gap-3 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900 leading-relaxed space-y-1">
                    <strong className="text-rose-950 block font-black text-xs">
                      Deposit Required Before First Withdrawal
                    </strong>
                    <p className="text-[11px] font-medium text-rose-900">
                      You are playing with trial bonus funds. To activate withdrawal requests, you need to make a minimum deposit of at least ₹100.
                    </p>
                    <div className="text-[10px] bg-rose-100/80 text-rose-900 font-bold p-2 rounded-xl border border-rose-200">
                      * Note: ₹100 deposit option is currently unavailable. Minimum available deposit option is ₹500.
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong className="text-amber-900 block font-black text-xs mb-0.5">
                    Guaranteed Payout Processing (Within 2 Hours)
                  </strong>
                  Withdrawal requests are reviewed and paid manually to your specified UPI or Bank Account within 2 hours.
                </div>
              </div>

              {withdrawStatusMsg && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
                    withdrawStatusMsg.type === 'SUCCESS'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {withdrawStatusMsg.type === 'SUCCESS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span>{withdrawStatusMsg.text}</span>
                </div>
              )}

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex justify-between">
                  <span>Withdrawal Amount (₹)</span>
                  <span className="text-[10px] text-gray-500 font-bold">₹300 - ₹3,00,000</span>
                </label>
                <input
                  type="number"
                  min={settings.minWithdrawal || 300}
                  max={Math.min(user?.balance ?? 0, settings.maxWithdrawal || 300000)}
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-black text-gray-900 focus:outline-none focus:border-[#ff5353]"
                />
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <label className="text-xs font-black text-gray-800 uppercase tracking-wider block">Payout Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawType('UPI')}
                    className={`py-3 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border transition ${
                      withdrawType === 'UPI'
                        ? 'bg-red-50 border-[#ff5353] text-[#ff5353]'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>UPI ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawType('BANK')}
                    className={`py-3 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border transition ${
                      withdrawType === 'BANK'
                        ? 'bg-red-50 border-[#ff5353] text-[#ff5353]'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Bank Transfer</span>
                  </button>
                </div>

                {withdrawType === 'UPI' ? (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-extrabold text-gray-700">Your Receiving UPI ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210@paytm or name@upi"
                      value={withdrawUpi}
                      onChange={e => setWithdrawUpi(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:border-[#ff5353]"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-gray-700">Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="Name as in bank account"
                        value={holderName}
                        onChange={e => setHolderName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 font-bold focus:outline-none focus:border-[#ff5353]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-gray-700">Account Number</label>
                        <input
                          type="text"
                          placeholder="11-16 digits"
                          value={accNumber}
                          onChange={e => setAccNumber(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 font-mono font-bold focus:outline-none focus:border-[#ff5353]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-gray-700">IFSC Code</label>
                        <input
                          type="text"
                          placeholder="e.g. SBIN0001234"
                          value={ifsc}
                          onChange={e => setIfsc(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 font-mono font-bold uppercase focus:outline-none focus:border-[#ff5353]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmittingWithdraw}
                className="w-full py-4 bg-[#ff5353] hover:bg-red-600 text-white font-black rounded-2xl text-sm shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {isSubmittingWithdraw ? 'Submitting Request...' : `Submit Withdrawal (₹${withdrawAmount})`}
              </button>
            </form>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Deposit History</span>
                  <span className="text-gray-400 text-[10px]">{deposits.length} Records</span>
                </h4>

                {deposits.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center font-medium">No deposit requests recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {deposits.map(dep => (
                      <div
                        key={dep.id}
                        className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-black text-[#18b660] text-sm">+₹{dep.amount}</div>
                          <div className="text-[10px] text-gray-500 font-mono font-bold">UTR: {dep.utr}</div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              dep.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : dep.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {dep.status}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold block mt-1">
                            {new Date(dep.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Withdrawal History</span>
                  <span className="text-gray-400 text-[10px]">{withdrawals.length} Records</span>
                </h4>

                {withdrawals.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center font-medium">No withdrawal requests recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {withdrawals.map(wth => (
                      <div
                        key={wth.id}
                        className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-black text-[#ff5353] text-sm">-₹{wth.amount}</div>
                          <div className="text-[10px] text-gray-600 font-bold">
                            {wth.type === 'UPI' ? `UPI: ${wth.upiId}` : `A/C: ${wth.bankDetails?.accountNumber}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              wth.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : wth.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {wth.status === 'APPROVED' ? 'PAID' : wth.status}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold block mt-1">
                            {new Date(wth.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
