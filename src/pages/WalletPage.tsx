import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Wallet, Copy, Check, ArrowDownCircle, ArrowUpCircle, AlertCircle, Clock, CheckCircle2, Building, Smartphone, Zap, CreditCard, Lock } from 'lucide-react';
import { User, DepositRequest, WithdrawalRequest, SystemSettings } from '../types';
import { createCashfreeOrder, verifyCashfreeOrder } from '../lib/api';

declare global {
  interface Window {
    Cashfree?: any;
  }
}

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
  const rawTab = (searchParams.get('tab') || '').toUpperCase();
  const initialTab: 'DEPOSIT' | 'WITHDRAW' | 'HISTORY' =
    rawTab === 'WITHDRAW' ? 'WITHDRAW' : rawTab === 'HISTORY' ? 'HISTORY' : 'DEPOSIT';
  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAW' | 'HISTORY'>(initialTab);

  // Deposit Method State: 'CASHFREE' | 'MANUAL_UPI'
  const [depositMethod, setDepositMethod] = useState<'CASHFREE' | 'MANUAL_UPI'>('CASHFREE');

  // Deposit State
  const [depositAmount, setDepositAmount] = useState<number>(300);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [isInstantDemo, setIsInstantDemo] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [depositStatusMsg, setDepositStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const tab = (searchParams.get('tab') || '').toUpperCase();
    if (tab === 'WITHDRAW' || tab === 'HISTORY' || tab === 'DEPOSIT') {
      setActiveTab(tab as 'DEPOSIT' | 'WITHDRAW' | 'HISTORY');
    }

    // Handle Cashfree Callback Status in Query Parameters
    const cfStatus = searchParams.get('cashfree_status');
    const orderId = searchParams.get('order_id');
    const amt = searchParams.get('amount');

    if (cfStatus === 'SUCCESS') {
      setDepositStatusMsg({
        type: 'SUCCESS',
        text: `₹${amt || ''} deposited successfully via Cashfree! Wallet balance updated.`,
      });
      if (onRefreshUser) onRefreshUser();
    } else if (cfStatus === 'FAILED') {
      setDepositStatusMsg({
        type: 'ERROR',
        text: 'Cashfree payment failed or was cancelled.',
      });
    } else if (orderId && !cfStatus) {
      // Attempt verification if order_id is present
      verifyPaymentOrder(orderId);
    }
  }, [searchParams]);

  const verifyPaymentOrder = async (orderId: string) => {
    setIsSubmittingDeposit(true);
    try {
      const res = await verifyCashfreeOrder(orderId);
      if (res.success) {
        setDepositStatusMsg({
          type: 'SUCCESS',
          text: `₹${res.amount || depositAmount} deposited successfully via Cashfree! Wallet updated.`,
        });
        if (onRefreshUser) onRefreshUser();
      } else {
        setDepositStatusMsg({
          type: 'ERROR',
          text: res.error || 'Cashfree payment pending or failed.',
        });
      }
    } catch (err: any) {
      setDepositStatusMsg({ type: 'ERROR', text: err.message || 'Verification failed' });
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleCashfreeCheckout = async () => {
    if (!user) {
      setDepositStatusMsg({ type: 'ERROR', text: 'Please log in to make a deposit' });
      return;
    }

    const minD = settings.minDeposit || 300;
    const maxD = settings.maxDeposit || 50000;

    if (depositAmount < minD) {
      setDepositStatusMsg({ type: 'ERROR', text: `Minimum deposit amount allowed is ₹${minD}.` });
      return;
    }

    if (depositAmount > maxD) {
      setDepositStatusMsg({ type: 'ERROR', text: `Maximum deposit amount allowed per order is ₹${maxD.toLocaleString('en-IN')}` });
      return;
    }

    setIsSubmittingDeposit(true);
    setDepositStatusMsg(null);

    try {
      const order = await createCashfreeOrder({
        userId: user.id,
        amount: depositAmount,
      });

      if (window.Cashfree) {
        const cfMode = (order.cf_env || 'production') as 'sandbox' | 'production';
        const cashfree = window.Cashfree({ mode: cfMode });
        cashfree.checkout({
          paymentSessionId: order.payment_session_id,
          redirectTarget: '_modal',
        }).then((result: any) => {
          if (result.error) {
            console.error('Cashfree Checkout Error:', result.error);
            setDepositStatusMsg({
              type: 'ERROR',
              text: result.error.message || 'Payment was cancelled or failed.',
            });
            setIsSubmittingDeposit(false);
          } else {
            verifyPaymentOrder(order.order_id);
          }
        });
      } else {
        verifyPaymentOrder(order.order_id);
      }
    } catch (err: any) {
      setDepositStatusMsg({ type: 'ERROR', text: err.message || 'Cashfree initialization failed' });
      setIsSubmittingDeposit(false);
    }
  };

  // Withdrawal State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(300);
  const [withdrawType, setWithdrawType] = useState<'UPI' | 'BANK'>('UPI');
  const [withdrawUpi, setWithdrawUpi] = useState<string>(user?.boundUpiId || '');
  const [accNumber, setAccNumber] = useState<string>('');
  const [ifsc, setIfsc] = useState<string>('');
  const [holderName, setHolderName] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [withdrawStatusMsg, setWithdrawStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);

  // UPI Lock Change State
  const [showChangeUpiModal, setShowChangeUpiModal] = useState<boolean>(false);
  const [newUpiInput, setNewUpiInput] = useState<string>('');
  const [isChangingUpi, setIsChangingUpi] = useState<boolean>(false);
  const [changeUpiMsg, setChangeUpiMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);

  useEffect(() => {
    if (user?.boundUpiId) {
      setWithdrawUpi(user.boundUpiId);
    }
  }, [user?.boundUpiId]);

  const handleChangeUpiSubmit = async () => {
    if (!user) return;
    if (!newUpiInput || !newUpiInput.includes('@')) {
      setChangeUpiMsg({ type: 'ERROR', text: 'Please enter a valid UPI ID (e.g. name@upi)' });
      return;
    }

    if (user.balance < 500) {
      setChangeUpiMsg({
        type: 'ERROR',
        text: `Insufficient balance! You need at least ₹500 in your wallet to change your locked UPI ID. Current balance: ₹${user.balance.toFixed(2)}`,
      });
      return;
    }

    setIsChangingUpi(true);
    setChangeUpiMsg(null);

    try {
      const res = await fetch('/api/wallet/change-upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newUpiId: newUpiInput.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update UPI ID');
      }

      setChangeUpiMsg({
        type: 'SUCCESS',
        text: data.message || `₹500 fee deducted. Your UPI ID has been updated to ${newUpiInput}!`,
      });

      setWithdrawUpi(newUpiInput.trim().toLowerCase());
      if (onRefreshUser) onRefreshUser();

      setTimeout(() => {
        setShowChangeUpiModal(false);
        setChangeUpiMsg(null);
        setNewUpiInput('');
      }, 1500);
    } catch (err: any) {
      setChangeUpiMsg({ type: 'ERROR', text: err.message || 'Error updating UPI ID' });
    } finally {
      setIsChangingUpi(false);
    }
  };

  // Calculate User Approved Deposits & Balances
  const totalUserApprovedDeposits = deposits
    .filter(d => (d.userId === user?.id || d.userPhone === user?.phone) && d.status === 'APPROVED')
    .reduce((sum, d) => sum + d.amount, 0);

  const hasDepositedMin500 = totalUserApprovedDeposits >= 500;
  const unwageredDeposit = user?.unwageredDeposit || 0;
  const withdrawableBalance = Math.max(0, (user?.balance || 0) - unwageredDeposit);

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

    if (!hasDepositedMin500) {
      setWithdrawStatusMsg({
        type: 'ERROR',
        text: 'Minimum ₹500 deposit required before sending a withdrawal request. Please make a deposit first via Cashfree.'
      });
      return;
    }

    const minW = settings.minWithdrawal || 300;
    const maxW = settings.maxWithdrawal || 300000;

    if (withdrawAmount < minW || withdrawAmount > maxW) {
      setWithdrawStatusMsg({ type: 'ERROR', text: `Withdrawal amount must be between ₹${minW} and ₹${maxW.toLocaleString('en-IN')}` });
      return;
    }

    if (withdrawAmount > withdrawableBalance) {
      setWithdrawStatusMsg({
        type: 'ERROR',
        text: `Withdrawal Locked: You must place bets worth ₹${Math.ceil(unwageredDeposit)} more to unlock all funds. Current withdrawable winning balance is ₹${Math.floor(withdrawableBalance)}.`
      });
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
        {/* Total & Withdrawable Balance Breakdown */}
        <div className="bg-gradient-to-r from-[#ff5652] via-[#ff4340] to-[#ff2a2a] rounded-3xl p-5 text-white shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs text-white/80 block uppercase font-bold tracking-wider">Total Wallet Balance</span>
                <h2 className="text-3xl font-black font-mono tracking-tight text-amber-200">
                  ₹{(user?.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h2>
              </div>
            </div>
          </div>

          <div className="bg-black/20 p-3 rounded-2xl flex items-center justify-between text-xs font-bold border border-white/10">
            <div>
              <span className="text-white/70 block text-[10px] uppercase font-extrabold">Withdrawable (Winning)</span>
              <span className="text-emerald-300 text-sm font-mono font-black">
                ₹{withdrawableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {unwageredDeposit > 0 && (
              <div className="text-right">
                <span className="text-amber-200 block text-[10px] uppercase font-extrabold">Wagering Required</span>
                <span className="text-amber-300 text-sm font-mono font-black">
                  ₹{unwageredDeposit.toLocaleString('en-IN')}
                </span>
              </div>
            )}
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
            <div className="space-y-4">
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

              {/* CASHFREE PAYMENT GATEWAY METHOD */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 p-5 rounded-3xl text-white shadow-lg space-y-4 border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
                        <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                          Cashfree Payment Gateway
                        </h4>
                        <p className="text-[10px] text-emerald-100/70 font-medium">
                          Auto-Verified & Instant Wallet Credit
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                      100% SECURE
                    </span>
                  </div>

                  {/* Preset Amount Chips */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-emerald-200 uppercase tracking-wider block">
                      Select or Fill Custom Amount (₹)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[300, 500, 1000, 2000, 5000, 10000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setDepositAmount(amt);
                            setDepositStatusMsg(null);
                          }}
                          className={`py-2 rounded-xl text-xs font-black transition ${
                            depositAmount === amt
                              ? 'bg-[#18b660] text-white shadow-md border border-emerald-400'
                              : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>

                    {/* Custom Input Field */}
                    <div className="pt-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={settings.minDeposit || 300}
                        max={settings.maxDeposit || 50000}
                        value={depositAmount || ''}
                        onChange={e => {
                          setDepositAmount(Number(e.target.value));
                          setDepositStatusMsg(null);
                        }}
                        placeholder="Type custom deposit amount..."
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl px-4 py-3 text-sm font-black focus:outline-none focus:border-emerald-400 placeholder-slate-400"
                      />
                      <p className="text-[10px] text-emerald-400/80 font-medium mt-1">
                        * Minimum deposit allowed is ₹300. Custom amounts are fully supported!
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-2 text-xs text-slate-200">
                    <div className="flex items-center justify-between font-bold">
                      <span>Supported Methods:</span>
                      <span className="text-emerald-400 font-extrabold text-[11px]">UPI (GPay, PhonePe, Paytm), Cards</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Processing Time:</span>
                      <span className="text-amber-300 font-bold">Instant (0 Seconds)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCashfreeCheckout}
                    disabled={isSubmittingDeposit}
                    className="w-full py-4 bg-gradient-to-r from-[#18b660] to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-2xl text-sm shadow-xl transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isSubmittingDeposit ? 'Opening Gateway...' : `Pay via Cashfree (₹${depositAmount})`}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WITHDRAW TAB */}
          {activeTab === 'WITHDRAW' && (
            <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
              {!hasDepositedMin500 && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-3xl flex items-start gap-3 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900 leading-relaxed space-y-1">
                    <strong className="text-rose-950 block font-black text-xs">
                      Deposit Required Before First Withdrawal
                    </strong>
                    <p className="text-[11px] font-medium text-rose-900">
                      To activate withdrawal requests, you need to make a minimum deposit of at least ₹500.
                    </p>
                  </div>
                </div>
              )}

              {unwageredDeposit > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed space-y-1">
                    <strong className="text-amber-950 block font-black text-xs">
                      Wagering / Turnover Rule
                    </strong>
                    <p className="text-[11px] font-medium text-amber-900">
                      You must place bets worth ₹{unwageredDeposit.toLocaleString('en-IN')} more to unlock your deposited/referral funds for withdrawal. Only winning amounts are withdrawable without turnover.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-[#fffdf0] border border-amber-200 p-4 rounded-3xl flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong className="text-amber-900 block font-black text-xs mb-0.5">
                    Guaranteed Payout Processing (Within 2 Hours)
                  </strong>
                  Withdrawal requests are reviewed and paid manually to your specified UPI ID within 2 hours.
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
                  <span>Select or Fill Withdrawal Amount (₹)</span>
                  <span className="text-[10px] text-gray-500 font-bold">Min ₹300</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {[300, 500, 1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWithdrawAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-black transition ${
                        withdrawAmount === amt
                          ? 'bg-[#ff5353] text-white shadow-xs'
                          : 'bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={settings.minWithdrawal || 300}
                  max={Math.min(withdrawableBalance, settings.maxWithdrawal || 300000)}
                  value={withdrawAmount || ''}
                  onChange={e => setWithdrawAmount(Number(e.target.value))}
                  placeholder="Enter custom withdrawal amount..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-black text-gray-900 focus:outline-none focus:border-[#ff5353]"
                />
                <p className="text-[10px] text-gray-500 font-medium flex justify-between">
                  <span>Withdrawable Balance:</span>
                  <strong className="text-emerald-600 font-mono font-bold">₹{withdrawableBalance.toLocaleString('en-IN')}</strong>
                </p>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-800 uppercase tracking-wider block">Payout Method: UPI ID</label>
                  {user?.boundUpiId ? (
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-700" />
                      LOCKED TO ACCOUNT
                    </span>
                  ) : (
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      Auto-Locks on 1st Request
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <label className="text-xs font-extrabold text-gray-700">Your Receiving UPI ID</label>
                  
                  {user?.boundUpiId ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={user.boundUpiId}
                          className="w-full bg-gray-100 border border-gray-300 rounded-2xl px-4 py-3 text-sm text-gray-800 font-extrabold cursor-not-allowed pr-10"
                        />
                        <Lock className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      </div>

                      {/* Locked Info Banner & Unlock Action */}
                      <div className="bg-amber-50/80 border border-amber-200/90 p-3 rounded-2xl space-y-2 text-xs">
                        <div className="text-[11px] text-amber-900 font-medium leading-relaxed">
                          🔒 Your account is bound to <strong className="font-extrabold text-amber-950">{user.boundUpiId}</strong>. Once set, UPI ID cannot be changed freely.
                        </div>
                        <button
                          type="button"
                          onClick={() => { setNewUpiInput(''); setChangeUpiMsg(null); setShowChangeUpiModal(true); }}
                          className="w-full py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock & Change UPI ID (Costs ₹500)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        placeholder="e.g. 9876543210@paytm or name@upi"
                        value={withdrawUpi}
                        onChange={e => setWithdrawUpi(e.target.value.trim().toLowerCase())}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:border-[#ff5353]"
                      />
                      <p className="text-[10px] text-gray-500 font-medium mt-1">
                        🔒 Note: This UPI ID will be permanently locked to your account after your first request. Future changes will cost ₹500.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* CHANGE LOCKED UPI ID MODAL */}
              {showChangeUpiModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-scaleUp">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-[#ff5353]" />
                        <span>Change Bound UPI ID (₹500 Fee)</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowChangeUpiModal(false)}
                        className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs text-gray-700 font-medium">
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-amber-950 font-semibold text-[11px] leading-relaxed">
                        ⚠️ Updating your locked UPI ID requires a one-time <strong>₹500 fee</strong> deducted directly from your wallet balance.
                      </div>

                      <div className="space-y-1">
                        <label className="font-extrabold text-gray-800 block text-xs">Enter New Receiving UPI ID</label>
                        <input
                          type="text"
                          inputMode="email"
                          autoCapitalize="none"
                          placeholder="e.g. newupi@okaxis or 9876543210@ybl"
                          value={newUpiInput}
                          onChange={e => setNewUpiInput(e.target.value.trim().toLowerCase())}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#ff5353]"
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px] bg-gray-50 p-2 rounded-xl font-bold border border-gray-100">
                        <span className="text-gray-500">Your Wallet Balance:</span>
                        <span className="text-gray-900 font-mono font-black">₹{(user?.balance || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {changeUpiMsg && (
                      <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${changeUpiMsg.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                        {changeUpiMsg.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        <span>{changeUpiMsg.text}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowChangeUpiModal(false)}
                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isChangingUpi}
                        onClick={handleChangeUpiSubmit}
                        className="flex-1 py-2.5 bg-[#ff5353] hover:bg-red-600 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95 disabled:opacity-50"
                      >
                        {isChangingUpi ? 'Processing...' : 'Pay ₹500 & Change'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
