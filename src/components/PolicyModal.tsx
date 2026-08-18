import React, { useState } from 'react';
import { X, ShieldCheck, Mail, Phone, MapPin, FileText, RefreshCw, Lock, IndianRupee, HelpCircle } from 'lucide-react';

export type PolicyTab = 'CONTACT' | 'TERMS' | 'REFUND' | 'PRIVACY' | 'SERVICES';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PolicyTab;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose, initialTab = 'TERMS' }) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ff5652] to-[#ff2a2a] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            <h3 className="font-black text-sm tracking-wide uppercase">Legal Policies & Compliance</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 overflow-x-auto text-xs shrink-0 no-scrollbar">
          <button
            onClick={() => setActiveTab('CONTACT')}
            className={`px-3 py-2 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'CONTACT'
                ? 'bg-[#ff4340] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-200/60'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Contact Us</span>
          </button>

          <button
            onClick={() => setActiveTab('TERMS')}
            className={`px-3 py-2 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'TERMS'
                ? 'bg-[#ff4340] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms & Conditions</span>
          </button>

          <button
            onClick={() => setActiveTab('REFUND')}
            className={`px-3 py-2 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'REFUND'
                ? 'bg-[#ff4340] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-200/60'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refunds & Cancellations</span>
          </button>

          <button
            onClick={() => setActiveTab('PRIVACY')}
            className={`px-3 py-2 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'PRIVACY'
                ? 'bg-[#ff4340] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-200/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('SERVICES')}
            className={`px-3 py-2 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'SERVICES'
                ? 'bg-[#ff4340] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-200/60'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Products & Pricing (INR)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-gray-700 text-xs leading-relaxed">
          {/* 1. CONTACT US */}
          {activeTab === 'CONTACT' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-gray-100 pb-2">
                <h4 className="text-sm font-black text-gray-900">Contact Us - Customer Support</h4>
                <p className="text-[11px] text-gray-500">We are here to assist you 24 hours a day, 7 days a week.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/70 space-y-1">
                  <div className="flex items-center gap-2 text-[#ff4340] font-bold">
                    <Mail className="w-4 h-4" />
                    <span>Official Email Support</span>
                  </div>
                  <p className="font-mono text-gray-900 font-semibold">support@realwin.app</p>
                  <p className="text-[10px] text-gray-500">Response time within 2-4 hours</p>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/70 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <Phone className="w-4 h-4" />
                    <span>Customer Care Helpline</span>
                  </div>
                  <p className="font-mono text-gray-900 font-semibold">+91 1800 202 9988</p>
                  <p className="text-[10px] text-gray-500">Mon - Sun (24/7 Helpline)</p>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/70 space-y-1 md:col-span-2">
                  <div className="flex items-center gap-2 text-blue-600 font-bold">
                    <MapPin className="w-4 h-4" />
                    <span>Registered Office Address</span>
                  </div>
                  <p className="text-gray-800 font-medium">
                    REALWIN Entertainment Technologies Pvt. Ltd.<br />
                    Tower 4, Level 8, DLF Cyber City, Sector 24, Gurugram, Haryana - 122002, India.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. TERMS & CONDITIONS */}
          {activeTab === 'TERMS' && (
            <div className="space-y-3.5 animate-fadeIn">
              <h4 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-1.5">
                Terms and Conditions
              </h4>
              <p>Welcome to REALWIN ("Platform"). By accessing or using our platform, you agree to comply with and be bound by the following Terms and Conditions.</p>

              <div className="space-y-2">
                <h5 className="font-extrabold text-gray-900">1. Eligibility</h5>
                <p>You must be at least 18 years of age or older to register an account and participate in skill prediction games on REALWIN. Access from states where online gaming is restricted is prohibited.</p>

                <h5 className="font-extrabold text-gray-900">2. Account Registration & Security</h5>
                <p>Users must provide accurate mobile number details during registration. Each user is allowed only one account. Account credentials and OTPs must remain confidential.</p>

                <h5 className="font-extrabold text-gray-900">3. Provably Fair Skill Predictions</h5>
                <p>All game round outcomes on REALWIN utilize Provably Fair cryptographic hashing algorithm (SHA256). Players can verify seed hashes anytime via the Fair Play verification tool.</p>

                <h5 className="font-extrabold text-gray-900">4. Payments & Wallet Balances</h5>
                <p>Deposits and withdrawals are processed in Indian Rupees (INR - ₹). Wallet funds are strictly intended for platform participation and skill game entries.</p>
              </div>
            </div>
          )}

          {/* 3. REFUNDS & CANCELLATIONS */}
          {activeTab === 'REFUND' && (
            <div className="space-y-3.5 animate-fadeIn">
              <h4 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-1.5">
                Refunds & Cancellation Policy
              </h4>

              <div className="space-y-2">
                <h5 className="font-extrabold text-gray-900">1. Payment Gateway & Failed Transactions</h5>
                <p>If money is deducted from your bank account or UPI application during a deposit but not reflected in your REALWIN wallet due to a network interruption or bank failure, Cashfree payment gateway automatically reconciles the transaction within 24 hours.</p>
                <p className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900 font-medium">
                  <strong>Automatic Refund Window:</strong> In case of failed deposits, funds are automatically refunded to your original source account within <strong>3 to 5 business days</strong>.
                </p>

                <h5 className="font-extrabold text-gray-900">2. Order Cancellation</h5>
                <p>Once a game round prediction entry is confirmed and placed before the timer lock, it cannot be canceled or modified for that specific round.</p>

                <h5 className="font-extrabold text-gray-900">3. Withdrawal Requests</h5>
                <p>Approved withdrawals are transferred directly to your verified UPI ID or Bank account. In case of withdrawal rejection due to incorrect UPI details, funds are safely re-credited back to your REALWIN wallet balance immediately.</p>
              </div>
            </div>
          )}

          {/* 4. PRIVACY POLICY */}
          {activeTab === 'PRIVACY' && (
            <div className="space-y-3.5 animate-fadeIn">
              <h4 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-1.5">
                Privacy Policy
              </h4>

              <div className="space-y-2">
                <h5 className="font-extrabold text-gray-900">1. Information We Collect</h5>
                <p>We collect mobile numbers, transaction records, and game activity to maintain service functionality, security, and account verification.</p>

                <h5 className="font-extrabold text-gray-900">2. Payment Security & Encryption</h5>
                <p>All online payment transactions are processed securely via Cashfree Payments Payment Gateway with PCI-DSS Level 1 compliance and 256-bit SSL encryption. We do not store sensitive bank credentials, card numbers, or UPI PINs.</p>

                <h5 className="font-extrabold text-gray-900">3. Data Protection</h5>
                <p>Your information is stored in strict confidence and is never sold or rented to third-party marketing companies.</p>
              </div>
            </div>
          )}

          {/* 5. PRODUCTS, SERVICES & PRICING IN INR */}
          {activeTab === 'SERVICES' && (
            <div className="space-y-3.5 animate-fadeIn">
              <h4 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-1.5">
                Products & Services Pricing List (All prices in INR - ₹)
              </h4>

              <p className="text-gray-600">
                REALWIN provides online provably fair prediction entertainment services and game credits. All transactions on our platform are processed exclusively in Indian National Rupees (INR - ₹).
              </p>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 font-bold text-gray-800 border-b border-gray-200">
                    <tr>
                      <th className="p-2.5">Product / Service Package</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Price (INR ₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    <tr>
                      <td className="p-2.5 font-bold text-gray-900">Starter Recharge</td>
                      <td className="p-2.5 text-gray-600">300 Game Wallet Coins</td>
                      <td className="p-2.5 text-right font-black text-emerald-600">₹300.00</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-gray-900">Standard Recharge</td>
                      <td className="p-2.5 text-gray-600">500 Game Wallet Coins</td>
                      <td className="p-2.5 text-right font-black text-emerald-600">₹500.00</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-gray-900">Pro Recharge</td>
                      <td className="p-2.5 text-gray-600">1,000 Game Wallet Coins</td>
                      <td className="p-2.5 text-right font-black text-emerald-600">₹1,000.00</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-gray-900">Master Package</td>
                      <td className="p-2.5 text-gray-600">2,000 Game Wallet Coins</td>
                      <td className="p-2.5 text-right font-black text-emerald-600">₹2,000.00</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-gray-900">VIP Package</td>
                      <td className="p-2.5 text-gray-600">5,000 Game Wallet Coins</td>
                      <td className="p-2.5 text-right font-black text-emerald-600">₹5,000.00</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-gray-900">Elite Package</td>
                      <td className="p-2.5 text-gray-600">10,000 Game Wallet Coins</td>
                      <td className="p-2.5 text-right font-black text-emerald-600">₹10,000.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                * Note: Minimum prediction entry per game round starts from <strong>₹1.00 INR</strong> up to custom wallet amounts.
              </p>
            </div>
          )}
        </div>

        {/* Footer close button */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-400 font-bold">REALWIN Tech Pvt Ltd © 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
