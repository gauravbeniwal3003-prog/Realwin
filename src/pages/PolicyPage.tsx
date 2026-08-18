import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { PolicyModal, PolicyTab } from '../components/PolicyModal';
import { ShieldCheck, Mail, Phone, MapPin, FileText, RefreshCw, Lock, IndianRupee, ArrowLeft } from 'lucide-react';
import { User } from '../types';

interface PolicyPageProps {
  user: User | null;
  defaultTab?: PolicyTab;
}

export const PolicyPage: React.FC<PolicyPageProps> = ({ user, defaultTab = 'TERMS' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromQuery = (searchParams.get('tab')?.toUpperCase() as PolicyTab) || defaultTab;
  const [activeTab, setActiveTab] = useState<PolicyTab>(tabFromQuery);

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none pb-24">
      <Header user={user} />

      <main className="max-w-2xl w-full mx-auto px-3 py-4 space-y-4 flex-1">
        {/* Header bar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-2xs border border-gray-100">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#ff4340]" />
            <h2 className="text-sm font-black tracking-wide uppercase text-gray-900">Compliance & Legal Policies</h2>
          </div>
          <div className="w-12"></div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-2 bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-x-auto text-xs no-scrollbar">
          <button
            onClick={() => setActiveTab('CONTACT')}
            className={`px-3 py-2 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'CONTACT' ? 'bg-[#ff4340] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Contact Us</span>
          </button>

          <button
            onClick={() => setActiveTab('TERMS')}
            className={`px-3 py-2 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'TERMS' ? 'bg-[#ff4340] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms & Conditions</span>
          </button>

          <button
            onClick={() => setActiveTab('REFUND')}
            className={`px-3 py-2 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'REFUND' ? 'bg-[#ff4340] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refunds & Cancellations</span>
          </button>

          <button
            onClick={() => setActiveTab('PRIVACY')}
            className={`px-3 py-2 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'PRIVACY' ? 'bg-[#ff4340] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('SERVICES')}
            className={`px-3 py-2 rounded-xl font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'SERVICES' ? 'bg-[#ff4340] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Products & Pricing (INR)</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="bg-white p-6 rounded-2xl shadow-2xs border border-gray-100 space-y-4 text-xs leading-relaxed text-gray-700">
          {activeTab === 'CONTACT' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-gray-100 pb-2">
                <h3 className="text-base font-black text-gray-900">Contact Us - REALWIN Support</h3>
                <p className="text-xs text-gray-500">24/7 dedicated support team for all payment & account queries.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/70 space-y-1">
                  <div className="flex items-center gap-2 text-[#ff4340] font-extrabold">
                    <Mail className="w-4 h-4" />
                    <span>Customer Email Support</span>
                  </div>
                  <p className="font-mono text-gray-900 font-bold text-sm">support@realwin.app</p>
                  <p className="text-[11px] text-gray-500">Average response time: 2-4 hours</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/70 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-600 font-extrabold">
                    <Phone className="w-4 h-4" />
                    <span>Helpline Phone Number</span>
                  </div>
                  <p className="font-mono text-gray-900 font-bold text-sm">+91 1800 202 9988</p>
                  <p className="text-[11px] text-gray-500">Available 24x7 all days</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/70 space-y-1 md:col-span-2">
                  <div className="flex items-center gap-2 text-blue-600 font-extrabold">
                    <MapPin className="w-4 h-4" />
                    <span>Registered Business Office</span>
                  </div>
                  <p className="text-gray-800 font-medium">
                    REALWIN Entertainment Technologies Private Limited<br />
                    Tower 4, Level 8, DLF Cyber City, Sector 24, Gurugram, Haryana - 122002, India.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TERMS' && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-2">Terms and Conditions</h3>
              <p>Welcome to REALWIN. These terms apply to all services, wallet recharges, and skill prediction entries hosted on our platform.</p>
              
              <div className="space-y-2">
                <h4 className="font-black text-gray-900">1. Account Eligibility (18+ Only)</h4>
                <p>Participation is restricted to individuals aged 18 years and above residing in India where legal skill prediction entertainment is permitted.</p>

                <h4 className="font-black text-gray-900">2. Wallet Balances & Pricing</h4>
                <p>All wallet recharges are billed in Indian Rupees (INR ₹). Wallet funds are exclusively usable for in-app skill predictions and entertainment games.</p>

                <h4 className="font-black text-gray-900">3. Provably Fair Execution</h4>
                <p>Every round outcome is verified via SHA256 cryptographic hashing seeds. Seed pairs can be inspected anytime on the Fair Play page.</p>
              </div>
            </div>
          )}

          {activeTab === 'REFUND' && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-2">Refunds & Cancellation Policy</h3>
              
              <div className="space-y-3">
                <h4 className="font-black text-gray-900">1. Payment Failures & Auto-Refunds</h4>
                <p>If money is deducted from your bank or UPI account during a Cashfree deposit but fails to credit to your wallet, the payment gateway auto-initiates reconciliation within 24 hours.</p>
                
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-semibold">
                  <strong>Refund Processing Window:</strong> Failed deposit funds are automatically refunded back to your original payment method (Bank/UPI/Card) within <strong>3 to 5 business days</strong>.
                </div>

                <h4 className="font-black text-gray-900">2. Round Predictions Cancellation</h4>
                <p>Confirmed game entries placed prior to timer lock cannot be canceled or retracted once accepted into the round queue.</p>

                <h4 className="font-black text-gray-900">3. Withdrawal Reversals</h4>
                <p>In case of bank rejection due to invalid UPI ID or account number, withdrawal funds are immediately restored back to your REALWIN wallet balance.</p>
              </div>
            </div>
          )}

          {activeTab === 'PRIVACY' && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-2">Privacy Policy</h3>
              
              <div className="space-y-2">
                <h4 className="font-black text-gray-900">1. Payment Data & Cashfree Integration</h4>
                <p>Online payments are processed securely via Cashfree Payments Payment Gateway with 256-bit SSL encryption. REALWIN does not store credit/debit card numbers, bank passwords, or UPI PINs.</p>

                <h4 className="font-black text-gray-900">2. Information Usage</h4>
                <p>Mobile details and transaction histories are strictly utilized for user authentication, fraud prevention, and account ledger management.</p>
              </div>
            </div>
          )}

          {activeTab === 'SERVICES' && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-2">Products & Services Pricing List (INR ₹)</h3>
              <p>Below is the official catalog of digital wallet credit packages available for purchase on REALWIN. All prices are listed in Indian Rupees (INR ₹):</p>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 font-bold text-gray-800 border-b border-gray-200">
                    <tr>
                      <th className="p-3">Product / Service Name</th>
                      <th className="p-3">Wallet Game Credits</th>
                      <th className="p-3 text-right">Pricing (INR ₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    <tr>
                      <td className="p-3 font-bold text-gray-900">Starter Recharge</td>
                      <td className="p-3 text-gray-600">300 Coins</td>
                      <td className="p-3 text-right font-black text-emerald-600">₹300.00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-gray-900">Standard Recharge</td>
                      <td className="p-3 text-gray-600">500 Coins</td>
                      <td className="p-3 text-right font-black text-emerald-600">₹500.00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-gray-900">Pro Recharge</td>
                      <td className="p-3 text-gray-600">1,000 Coins</td>
                      <td className="p-3 text-right font-black text-emerald-600">₹1,000.00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-gray-900">Master Package</td>
                      <td className="p-3 text-gray-600">2,000 Coins</td>
                      <td className="p-3 text-right font-black text-emerald-600">₹2,000.00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-gray-900">VIP Package</td>
                      <td className="p-3 text-gray-600">5,000 Coins</td>
                      <td className="p-3 text-right font-black text-emerald-600">₹5,000.00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-gray-900">Elite Package</td>
                      <td className="p-3 text-gray-600">10,000 Coins</td>
                      <td className="p-3 text-right font-black text-emerald-600">₹10,000.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                * Minimum prediction entry per round is <strong>₹1.00 INR</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Footer Policy links */}
        <div className="bg-white p-4 rounded-2xl shadow-2xs border border-gray-100 text-center space-y-2">
          <p className="text-xs text-gray-500 font-bold">REALWIN Entertainment Technologies Pvt Ltd © 2026</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-bold text-[#ff4340]">
            <button onClick={() => setActiveTab('CONTACT')}>Contact Us</button>
            <span>•</span>
            <button onClick={() => setActiveTab('TERMS')}>Terms & Conditions</button>
            <span>•</span>
            <button onClick={() => setActiveTab('REFUND')}>Refunds & Cancellations</button>
            <span>•</span>
            <button onClick={() => setActiveTab('PRIVACY')}>Privacy Policy</button>
            <span>•</span>
            <button onClick={() => setActiveTab('SERVICES')}>Products & Pricing (INR)</button>
          </div>
        </div>
      </main>
    </div>
  );
};
