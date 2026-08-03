import React, { useState, useRef, useEffect } from 'react';
import { Header } from '../components/Header';
import {
  Headset,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  ArrowDownCircle,
  ArrowUpCircle,
  Dices,
  Users,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { User, DepositRequest, WithdrawalRequest, Bet } from '../types';

interface SupportPageProps {
  user: User | null;
  deposits?: DepositRequest[];
  withdrawals?: WithdrawalRequest[];
  myBets?: Bet[];
}

type IssueCategory = 'DEPOSIT' | 'WITHDRAWAL' | 'BET' | 'REFERRAL';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'AGENT';
  text: string;
  time: string;
  step?: 'CHOICES' | 'LOGS' | 'CONFIRMATION' | 'CUSTOM';
  category?: IssueCategory;
  selectedLog?: any;
}

export const SupportPage: React.FC<SupportPageProps> = ({
  user,
  deposits = [],
  withdrawals = [],
  myBets = [],
}) => {
  const getNowTime = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      sender: 'AGENT',
      text: '👋 Hello! Welcome to RealWin 24/7 Support Desk. Please select what issue you are facing today:',
      time: getNowTime(),
      step: 'CHOICES',
    },
  ]);

  const [inputMsg, setInputMsg] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [isTyping, setIsTyping] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSelectCategory = (category: IssueCategory) => {
    const time = getNowTime();
    let userMsgText = '';
    let agentMsgText = '';

    if (category === 'DEPOSIT') {
      userMsgText = '💳 I am facing an issue with my Deposit';
      agentMsgText = 'Here are your recent Deposit records. Please select the specific transaction you need help with:';
    } else if (category === 'WITHDRAWAL') {
      userMsgText = '💸 I am facing an issue with my Withdrawal';
      agentMsgText = 'Here are your recent Withdrawal records. Please select the specific transaction you need help with:';
    } else if (category === 'BET') {
      userMsgText = '🎲 I am facing an issue with my Recent Bid / Game Bet';
      agentMsgText = 'Here are your recent Game Bids. Please select the specific bet you need help with:';
    } else if (category === 'REFERRAL') {
      userMsgText = '🎁 I am facing an issue with Referral or Bonus';
      agentMsgText = `Your account phone: ${user?.phone || 'N/A'}. Total wallet balance: ₹${(user?.balance ?? 0).toLocaleString('en-IN')}. Click below to submit this referral query to admin:`;
    }

    const newUserMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      sender: 'USER',
      text: userMsgText,
      time,
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const newAgentMsg: ChatMessage = {
        id: 'agent_' + Date.now(),
        sender: 'AGENT',
        text: agentMsgText,
        time: getNowTime(),
        step: 'LOGS',
        category,
      };
      setMessages(prev => [...prev, newAgentMsg]);
    }, 600);
  };

  const handleSelectLogItem = (category: IssueCategory, item: any) => {
    const time = getNowTime();
    let userText = '';

    if (category === 'DEPOSIT') {
      userText = `Selected Deposit: ₹${item.amount} (UTR: ${item.utr}) - Status: ${item.status}`;
    } else if (category === 'WITHDRAWAL') {
      userText = `Selected Withdrawal: ₹${item.amount} (${item.type}) - Status: ${item.status}`;
    } else if (category === 'BET') {
      userText = `Selected Bet: Period ${item.period} (${item.room}) - Selection: ${item.selection} - Amount: ₹${item.amount}`;
    } else if (category === 'REFERRAL') {
      userText = `Submitted Referral Query for Account ${user?.phone || 'N/A'}`;
    }

    const newUserMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      sender: 'USER',
      text: userText,
      time,
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const confirmAgentMsg: ChatMessage = {
        id: 'agent_' + Date.now(),
        sender: 'AGENT',
        text: 'Admin will verify and solve your problem soon.',
        time: getNowTime(),
        step: 'CONFIRMATION',
        selectedLog: item,
      };
      setMessages(prev => [...prev, confirmAgentMsg]);
    }, 600);
  };

  const handleStartNewIssue = () => {
    const time = getNowTime();
    const newUserMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      sender: 'USER',
      text: '🔄 Select another issue topic',
      time,
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const choiceMsg: ChatMessage = {
        id: 'agent_' + Date.now(),
        sender: 'AGENT',
        text: 'Please select what issue you are facing:',
        time: getNowTime(),
        step: 'CHOICES',
      };
      setMessages(prev => [...prev, choiceMsg]);
    }, 500);
  };

  const handleCustomTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg.trim();
    const time = getNowTime();

    setMessages(prev => [
      ...prev,
      { id: 'user_' + Date.now(), sender: 'USER', text: userText, time },
    ]);
    setInputMsg('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: 'agent_' + Date.now(),
          sender: 'AGENT',
          text: 'Admin will verify and solve your problem soon.',
          time: getNowTime(),
          step: 'CONFIRMATION',
        },
      ]);
    }, 600);
  };

  const faqs = [
    {
      q: 'Minimum and Maximum Deposit Limits?',
      a: 'Minimum deposit is ₹500 and maximum deposit limit is ₹5,000 per transaction.',
    },
    {
      q: 'Minimum and Maximum Withdrawal Limits?',
      a: 'Minimum withdrawal is ₹300 and maximum withdrawal limit is ₹3,00,000 (3 Lakh).',
    },
    {
      q: 'How long does withdrawal take to hit my bank account?',
      a: 'All withdrawal payouts are processed manually within 2 hours. Admin verifies each request and credits funds to your specified UPI ID or Bank account.',
    },
    {
      q: 'Where do I find my 12-Digit UTR Number?',
      a: 'UTR (Unique Transaction Reference) is the official 12-digit payment confirmation ID found in Google Pay, PhonePe, Paytm, or BHIM app after completing payment.',
    },
    {
      q: 'Is RealWin game prediction SHA-256 fair?',
      a: 'Yes! Every game round hash is pre-generated using cryptographic SHA-256 before betting opens. You can verify every period on our Fair Play Verification page.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8ff] text-gray-900 flex flex-col font-sans select-none pb-24">
      <Header user={user} />

      <main className="max-w-md w-full mx-auto px-3 py-4 space-y-4 flex-1">
        {/* Support Top Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg space-y-2 border border-indigo-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff5353] to-[#e03a3a] text-white flex items-center justify-center shadow-sm">
                <Headset className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                  <span>24/7 Automated Support</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h2>
                <span className="text-xs text-indigo-200 font-semibold">Fast Verification & Instant Resolution</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Support Chat Container */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-md overflow-hidden flex flex-col h-[460px]">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs font-bold text-gray-700">
            <span className="flex items-center gap-2 text-emerald-600">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>24/7 Support Assistant</span>
            </span>
            <button
              onClick={handleStartNewIssue}
              className="text-[11px] text-[#ff5353] font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restart Flow</span>
            </button>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-slate-50/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}
              >
                {/* Text Bubble */}
                <div
                  className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                    msg.sender === 'USER'
                      ? 'bg-[#ff5353] text-white rounded-br-xs shadow-xs'
                      : 'bg-white text-gray-800 rounded-bl-xs border border-gray-200/80 shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line font-medium">{msg.text}</p>

                  {/* STEP 1: Render Issue Category Choices */}
                  {msg.sender === 'AGENT' && msg.step === 'CHOICES' && (
                    <div className="mt-3 pt-2 border-t border-gray-100 space-y-2">
                      <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">
                        Select an issue:
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => handleSelectCategory('DEPOSIT')}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold text-xs transition active:scale-95 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                            <span>Deposit Related Issue (डिपॉजिट समस्या)</span>
                          </div>
                          <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded-md font-mono font-bold">₹500-₹5k</span>
                        </button>

                        <button
                          onClick={() => handleSelectCategory('WITHDRAWAL')}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 font-bold text-xs transition active:scale-95 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle className="w-4 h-4 text-rose-600" />
                            <span>Withdrawal Related Issue (विथड्रॉल समस्या)</span>
                          </div>
                          <span className="text-[10px] bg-rose-200/60 px-2 py-0.5 rounded-md font-mono font-bold">₹300-₹3L</span>
                        </button>

                        <button
                          onClick={() => handleSelectCategory('BET')}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs transition active:scale-95 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Dices className="w-4 h-4 text-amber-600" />
                            <span>Recent Bid / Game Bet Issue (हाल की बोली)</span>
                          </div>
                        </button>

                        <button
                          onClick={() => handleSelectCategory('REFERRAL')}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-bold text-xs transition active:scale-95 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-600" />
                            <span>Referral & Bonus Issue (रेफरल और बोनस)</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Render Logs associated with the selected Category */}
                  {msg.sender === 'AGENT' && msg.step === 'LOGS' && msg.category && (
                    <div className="mt-3 pt-2 border-t border-gray-100 space-y-2">
                      {/* Deposit Logs */}
                      {msg.category === 'DEPOSIT' && (
                        <div>
                          {deposits.length === 0 ? (
                            <div className="p-3 bg-gray-50 border rounded-xl text-center space-y-2">
                              <span className="text-gray-500 text-[11px] block font-medium">No recent deposit records found.</span>
                              <button
                                onClick={() =>
                                  handleSelectLogItem('DEPOSIT', {
                                    amount: 500,
                                    utr: 'GENERAL_INQUIRY',
                                    status: 'PENDING',
                                  })
                                }
                                className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs"
                              >
                                Submit General Deposit Inquiry
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {deposits.slice(0, 5).map((dep) => (
                                <div
                                  key={dep.id}
                                  className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-black text-xs text-gray-900">₹{dep.amount}</span>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                                          dep.status === 'APPROVED'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : dep.status === 'REJECTED'
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {dep.status}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono block">UTR: {dep.utr}</span>
                                  </div>
                                  <button
                                    onClick={() => handleSelectLogItem('DEPOSIT', dep)}
                                    className="px-2.5 py-1.5 bg-[#ff5353] hover:bg-[#e04343] text-white text-[10px] font-bold rounded-lg shadow-xs active:scale-95 shrink-0"
                                  >
                                    Report This
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Withdrawal Logs */}
                      {msg.category === 'WITHDRAWAL' && (
                        <div>
                          {withdrawals.length === 0 ? (
                            <div className="p-3 bg-gray-50 border rounded-xl text-center space-y-2">
                              <span className="text-gray-500 text-[11px] block font-medium">No recent withdrawal records found.</span>
                              <button
                                onClick={() =>
                                  handleSelectLogItem('WITHDRAWAL', {
                                    amount: 300,
                                    type: 'UPI',
                                    status: 'PENDING',
                                  })
                                }
                                className="w-full py-2 bg-rose-600 text-white rounded-lg font-bold text-xs"
                              >
                                Submit General Withdrawal Inquiry
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {withdrawals.slice(0, 5).map((wth) => (
                                <div
                                  key={wth.id}
                                  className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-black text-xs text-gray-900">₹{wth.amount}</span>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                                          wth.status === 'APPROVED'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : wth.status === 'REJECTED'
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {wth.status}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono block">Type: {wth.type}</span>
                                  </div>
                                  <button
                                    onClick={() => handleSelectLogItem('WITHDRAWAL', wth)}
                                    className="px-2.5 py-1.5 bg-[#ff5353] hover:bg-[#e04343] text-white text-[10px] font-bold rounded-lg shadow-xs active:scale-95 shrink-0"
                                  >
                                    Report This
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recent Bets Logs */}
                      {msg.category === 'BET' && (
                        <div>
                          {myBets.length === 0 ? (
                            <div className="p-3 bg-gray-50 border rounded-xl text-center space-y-2">
                              <span className="text-gray-500 text-[11px] block font-medium">No recent bets placed yet.</span>
                              <button
                                onClick={() =>
                                  handleSelectLogItem('BET', {
                                    period: 'LATEST',
                                    room: 'WINGO_30S',
                                    selection: 'GREEN',
                                    amount: 100,
                                  })
                                }
                                className="w-full py-2 bg-amber-600 text-white rounded-lg font-bold text-xs"
                              >
                                Submit General Bet Query
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {myBets.slice(0, 5).map((bet) => (
                                <div
                                  key={bet.id}
                                  className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-black text-xs text-gray-900">₹{bet.amount}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-gray-200 text-gray-800">
                                        {bet.selection}
                                      </span>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                                          bet.status === 'WON'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : bet.status === 'LOST'
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {bet.status}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono block">Period: {bet.period}</span>
                                  </div>
                                  <button
                                    onClick={() => handleSelectLogItem('BET', bet)}
                                    className="px-2.5 py-1.5 bg-[#ff5353] hover:bg-[#e04343] text-white text-[10px] font-bold rounded-lg shadow-xs active:scale-95 shrink-0"
                                  >
                                    Report This
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Referral & Bonus Option */}
                      {msg.category === 'REFERRAL' && (
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-center">
                          <p className="text-xs text-indigo-950 font-medium">
                            Click below to submit your referral bonus query directly to Admin:
                          </p>
                          <button
                            onClick={() =>
                              handleSelectLogItem('REFERRAL', {
                                type: 'REFERRAL_QUERY',
                                phone: user?.phone,
                              })
                            }
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                          >
                            Submit Referral Query to Admin
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3: Confirmation Message Option */}
                  {msg.sender === 'AGENT' && msg.step === 'CONFIRMATION' && (
                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ticket Priority: High</span>
                      </span>
                      <button
                        onClick={handleStartNewIssue}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-extrabold rounded-lg border border-gray-200 transition"
                      >
                        Select Another Issue
                      </button>
                    </div>
                  )}
                </div>

                {/* Message Timestamp */}
                <span className="text-[9px] text-gray-400 mt-0.5 px-1 font-mono">{msg.time}</span>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-2xl w-fit shadow-xs animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#ff5353] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#ff5353] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[#ff5353] animate-bounce [animation-delay:0.4s]" />
                <span className="text-[10px] font-bold text-gray-400 ml-1">Support Bot Typing...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Bottom Custom Message Input Bar */}
          <form onSubmit={handleCustomTextSubmit} className="p-2.5 bg-gray-50 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              placeholder="Type your query or UTR here..."
              className="flex-1 bg-white border border-gray-200 rounded-2xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#ff5353]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#ff5353] hover:bg-[#e04343] text-white rounded-2xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Quick FAQ Section */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#ff5353]" />
            <span>Frequently Asked Questions</span>
          </h3>

          <div className="space-y-2">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-3 text-left text-xs font-bold text-gray-800 flex items-center justify-between gap-2"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="p-3 pt-0 text-xs text-gray-600 border-t border-gray-100/60 leading-relaxed font-medium">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
