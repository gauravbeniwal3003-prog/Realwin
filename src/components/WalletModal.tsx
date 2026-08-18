import React, { useState } from 'react';
import { Wallet, QrCode, Copy, Check, ArrowDownCircle, ArrowUpCircle, AlertCircle, Clock, CheckCircle2, ShieldAlert, Building, Smartphone } from 'lucide-react';
import { User, DepositRequest, WithdrawalRequest, SystemSettings } from '../types';

interface WalletModalProps {
  user: User | null;
  settings: SystemSettings;
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  onClose: () => void;
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
  initialTab?: 'DEPOSIT' | 'WITHDRAW' | 'HISTORY';
}

export const WalletModal: React.FC<WalletModalProps> = ({
  user,
  settings,
  deposits,
  withdrawals,
  onClose,
  onSubmitDeposit,
  onSubmitWithdrawal,
  initialTab = 'DEPOSIT',
}) => {
  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAW' | 'HISTORY'>(initialTab);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<number>(300);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [isInstantDemo, setIsInstantDemo] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [depositStatusMsg, setDepositStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(500);
  const [withdrawType, setWithdrawType] = useState<'UPI' | 'BANK'>('UPI');
  const [withdrawUpi, setWithdrawUpi] = useState<string>('');
  const [accNumber, setAccNumber] = useState<string>('');
  const [ifsc, setIfsc] = useState<string>('');
  const [holderName, setHolderName] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [withdrawStatusMsg, setWithdrawStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(settings.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const minRequired = settings.minDeposit || 300;
    if (depositAmount < minRequired) {
      setDepositStatusMsg({ type: 'ERROR', text: `Minimum deposit amount is ₹${minRequired}` });
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

    if (withdrawAmount < settings.minWithdrawal) {
      setWithdrawStatusMsg({ type: 'ERROR', text: `Minimum withdrawal amount is ₹${settings.minWithdrawal}` });
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-gray-100 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Coral Red Gradient */}
        <div className="p-4 bg-gradient-to-r from-[#ff5652] via-[#ff4340] to-[#ff2a2a] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-sans text-base font-black tracking-wide text-white">Wallet & Payments</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-white/80 block uppercase font-bold">Total Balance</span>
              <span className="font-mono font-black text-amber-200 text-sm drop-shadow-xs">
                ₹{(user?.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center text-xs font-bold transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex bg-gray-100 p-1.5 gap-1 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('DEPOSIT')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              activeTab === 'DEPOSIT'
                ? 'bg-[#18b660] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Deposit</span>
          </button>

          <button
            onClick={() => setActiveTab('WITHDRAW')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              activeTab === 'WITHDRAW'
                ? 'bg-[#ff5353] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Withdraw</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              activeTab === 'HISTORY'
                ? 'bg-gray-800 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-[#f7f8ff]">
          {/* TAB 1: DEPOSIT */}
          {activeTab === 'DEPOSIT' && (
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              {/* Notification Banner */}
              {depositStatusMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    depositStatusMsg.type === 'SUCCESS'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {depositStatusMsg.type === 'SUCCESS' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{depositStatusMsg.text}</span>
                </div>
              )}

              {/* UPI QR & Details Card */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* QR Code */}
                  <div className="bg-white p-2 rounded-xl shadow-md border border-gray-200 shrink-0">
                    <img
                      src={settings.qrCodeUrl}
                      alt="UPI Payment QR Code"
                      className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                    />
                  </div>

                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <span className="text-[10px] font-black text-[#18b660] uppercase tracking-wider block">
                      Official Payment UPI ID
                    </span>
                    <div className="flex items-center justify-center sm:justify-start gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                      <span className="font-mono text-sm font-black text-gray-800 select-all">
                        {settings.upiId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium leading-tight">
                      Pay via PhonePe, Paytm, GPay or BHIM. Copy UPI or scan QR code.
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-gray-700">Select Deposit Amount (₹)</label>
                  <span className="text-[10px] font-black text-[#ff5353] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    Min ₹300
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[300, 500, 1000, 2000, 5000, 10000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-black transition ${
                        depositAmount === amt
                          ? 'bg-[#18b660] text-white shadow-xs'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
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
                  min={settings.minDeposit || 300}
                  value={depositAmount}
                  onChange={e => setDepositAmount(Number(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-black focus:outline-none focus:border-[#18b660]"
                />
              </div>

              {/* UTR Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700 flex items-center justify-between">
                  <span>12-Digit UTR / Ref Transaction ID</span>
                  <span className="text-[10px] text-[#ff5353] font-black">Mandatory</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 421598201934"
                  maxLength={12}
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#18b660]"
                />
                <p className="text-[10px] text-gray-500 font-medium">
                  Find the 12-digit UTR/Ref ID in your payment app history after sending money.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingDeposit}
                className="w-full py-3.5 bg-[#18b660] hover:bg-emerald-600 text-white font-black rounded-2xl text-sm shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {isSubmittingDeposit ? 'Submitting...' : `Submit Deposit (₹${depositAmount})`}
              </button>
            </form>
          )}

          {/* TAB 2: WITHDRAWAL */}
          {activeTab === 'WITHDRAW' && (
            <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
              {/* Mandatory 2-Hour Processing Notification */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-2.5">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong className="text-amber-900 block font-black text-xs mb-0.5">
                    Manual Payout Processing (Within 2 Hours)
                  </strong>
                  Withdrawal requests are processed manually by our finance team. Funds will be directly credited to your specified UPI ID or Bank Account within 2 hours.
                </div>
              </div>

              {/* Notification Banner */}
              {withdrawStatusMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    withdrawStatusMsg.type === 'SUCCESS'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {withdrawStatusMsg.type === 'SUCCESS' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{withdrawStatusMsg.text}</span>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700 flex justify-between">
                  <span>Withdrawal Amount (₹)</span>
                  <span className="text-[10px] text-gray-400 font-bold">Min ₹{settings.minWithdrawal}</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={settings.minWithdrawal}
                  max={user?.balance ?? 0}
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(Number(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-gray-900 focus:outline-none focus:border-[#ff5353]"
                />
              </div>

              {/* Payment Destination Selector */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-gray-700">Payout Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawType('UPI')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 border transition ${
                      withdrawType === 'UPI'
                        ? 'bg-red-50 border-[#ff5353] text-[#ff5353]'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>UPI ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawType('BANK')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 border transition ${
                      withdrawType === 'BANK'
                        ? 'bg-red-50 border-[#ff5353] text-[#ff5353]'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Bank Transfer</span>
                  </button>
                </div>
              </div>

              {/* Destination Form Fields */}
              {withdrawType === 'UPI' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-700">Your UPI ID</label>
                  <input
                    type="text"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="e.g. mobile@paytm or name@upi"
                    value={withdrawUpi}
                    onChange={e => setWithdrawUpi(e.target.value.trim().toLowerCase())}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:border-[#ff5353]"
                  />
                </div>
              ) : (
                <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-gray-600">Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="Name as in bank passbook"
                      value={holderName}
                      onChange={e => setHolderName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-bold focus:outline-none focus:border-[#ff5353]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-gray-600">Account Number</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={18}
                        placeholder="11-18 digits"
                        value={accNumber}
                        onChange={e => setAccNumber(e.target.value.replace(/\D/g, '').slice(0, 18))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-mono font-bold focus:outline-none focus:border-[#ff5353]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-gray-600">IFSC Code</label>
                      <input
                        type="text"
                        inputMode="text"
                        autoCapitalize="characters"
                        maxLength={11}
                        placeholder="e.g. SBIN0001234"
                        value={ifsc}
                        onChange={e => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-mono font-bold uppercase focus:outline-none focus:border-[#ff5353]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-gray-600">Bank Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-bold focus:outline-none focus:border-[#ff5353]"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingWithdraw}
                className="w-full py-3.5 bg-[#ff5353] hover:bg-red-600 text-white font-black rounded-2xl text-sm shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {isSubmittingWithdraw ? 'Submitting...' : `Confirm Request (₹${withdrawAmount})`}
              </button>
            </form>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              {/* Deposits History */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Recent Deposits</span>
                  <span className="text-gray-400 text-[10px] font-extrabold">{deposits.length} Records</span>
                </h4>
                {deposits.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center font-medium">No deposit requests found.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {deposits.map(dep => (
                      <div
                        key={dep.id}
                        className="p-3 bg-white rounded-2xl border border-gray-100 flex items-center justify-between text-xs shadow-2xs"
                      >
                        <div>
                          <div className="font-black text-[#18b660] text-sm">+₹{dep.amount}</div>
                          <div className="text-[10px] text-gray-500 font-mono font-bold">UTR: {dep.utr}</div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              dep.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : dep.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}
                          >
                            {dep.status}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                            {new Date(dep.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Withdrawals History */}
              <div className="space-y-2 border-t border-gray-200 pt-3">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Recent Withdrawals</span>
                  <span className="text-gray-400 text-[10px] font-extrabold">{withdrawals.length} Records</span>
                </h4>
                {withdrawals.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center font-medium">No withdrawal requests found.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {withdrawals.map(wth => (
                      <div
                        key={wth.id}
                        className="p-3 bg-white rounded-2xl border border-gray-100 flex items-center justify-between text-xs shadow-2xs"
                      >
                        <div>
                          <div className="font-black text-[#ff5353] text-sm">-₹{wth.amount}</div>
                          <div className="text-[10px] text-gray-500 font-bold">
                            {wth.type === 'UPI' ? `UPI: ${wth.upiId}` : `Bank A/C: ${wth.bankDetails?.accountNumber}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              wth.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : wth.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}
                          >
                            {wth.status === 'APPROVED' ? 'PAID' : wth.status}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
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
      </div>
    </div>
  );
};
