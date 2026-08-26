import React, { useState, useEffect, useRef } from "react";
import { 
  Copy, 
  Check, 
  Plus, 
  AlertCircle, 
  Download, 
  Volume2, 
  VolumeX, 
  QrCode, 
  ChevronRight, 
  X, 
  ShieldCheck, 
  Zap, 
  Trash2, 
  Sparkles, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Inbox,
  History,
  FileText,
  Ban,
  CheckCircle2,
  Radio,
  RefreshCw,
  Heart
} from "lucide-react";
import { playNotificationSound } from "./utils/audio";
import { BrandLogo } from "./components/BrandLogo";
import { MailEngine, UnifiedMessage, UnifiedMessageDetail, MailboxSession } from "./utils/mailService";

export default function App() {
  // Active mailbox session
  const [currentSession, setCurrentSession] = useState<MailboxSession | null>(null);

  // Inbox display states
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [domain, setDomain] = useState<string>("");
  const [domains, setDomains] = useState<string[]>([
    "bugfoo.com",
    "vmani.com",
    "1secmail.net",
    "wwjmp.com",
    "esiix.com"
  ]);
  
  // Custom Email form
  const [customUsername, setCustomUsername] = useState<string>("");
  const [customDomain, setCustomDomain] = useState<string>("");
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);

  // Email messages states
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<UnifiedMessageDetail | null>(null);

  // Loading & Error states
  const [isListLoading, setIsListLoading] = useState<boolean>(false);
  const [isMessageLoading, setIsMessageLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sound & Polling settings (Live Auto-Sync)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(5);
  const [pulseSync, setPulseSync] = useState<boolean>(false);

  // Saved inboxes history (LocalStorage)
  const [savedInboxes, setSavedInboxes] = useState<MailboxSession[]>([]);

  // UI helpers
  const [copied, setCopied] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"html" | "text" | "raw">("html");

  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Keep track of message count to play sound on new incoming emails
  const prevMessagesCountRef = useRef<number>(0);
  const isInitialMount = useRef<boolean>(true);

  // Show Toast function
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Helper: Persist active session in LocalStorage so page refresh DOES NOT change email
  const persistSession = (sess: MailboxSession) => {
    try {
      localStorage.setItem("tempemailo_active_session", JSON.stringify(sess));
    } catch (e) {
      console.error("Storage error", e);
    }
  };

  // Helper: Save mailbox to LocalStorage history
  const saveSessionToList = (sess: MailboxSession) => {
    setSavedInboxes((prev) => {
      const filtered = prev.filter((item) => item.email !== sess.email);
      const updated = [sess, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("tempemailo_inboxes_sessions", JSON.stringify(updated));
      } catch (e) {
        console.error("Could not write inboxes to storage", e);
      }
      return updated;
    });
  };

  // Generate a brand new random email
  const generateRandomEmail = async (showNotification = true) => {
    setIsListLoading(true);
    setError(null);

    let newSession = await MailEngine.createMailtmAccount();
    if (!newSession) {
      newSession = await MailEngine.createOneSecMailAccount();
    }

    if (newSession) {
      setCurrentSession(newSession);
      setEmail(newSession.email);
      setUsername(newSession.username);
      setDomain(newSession.domain);
      setCustomUsername(newSession.username);
      setCustomDomain(newSession.domain);
      setMessages([]);
      setSelectedMessage(null);
      prevMessagesCountRef.current = 0;
      
      persistSession(newSession);
      saveSessionToList(newSession);
      if (showNotification) {
        showToast("✨ New temporary email ready! Live auto-refresh active.", "success");
      }
      loadMessagesForSession(newSession, true);
    } else {
      setError("Failed to create temporary mailbox. Please check network connection.");
    }

    setIsListLoading(false);
    setCountdown(5);
  };

  // Initial Load: Check if an email was already active previously so page reload KEEPS the exact same email
  useEffect(() => {
    const initApp = async () => {
      // 1. Fetch available domain list
      try {
        const domList = await MailEngine.getAvailableDomains();
        if (domList.length > 0) {
          const domNames = domList.map((d) => d.domain);
          setDomains(domNames);
          setCustomDomain(domNames[0]);
        }
      } catch (err) {
        console.warn("Using default domains", err);
      }

      // 2. Load saved history inboxes
      try {
        const stored = localStorage.getItem("tempemailo_inboxes_sessions");
        if (stored) {
          setSavedInboxes(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load saved data", e);
      }

      // 3. Check for existing active session (Refresh persistence)
      try {
        const existingSessionRaw = localStorage.getItem("tempemailo_active_session");
        if (existingSessionRaw) {
          const sess: MailboxSession = JSON.parse(existingSessionRaw);
          if (sess && sess.email && sess.username && sess.domain) {
            setCurrentSession(sess);
            setEmail(sess.email);
            setUsername(sess.username);
            setDomain(sess.domain);
            setCustomUsername(sess.username);
            setCustomDomain(sess.domain);
            loadMessagesForSession(sess, true);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }

      // First ever visit: Generate an email
      generateRandomEmail(false);
    };

    if (isInitialMount.current) {
      isInitialMount.current = false;
      initApp();
    }
  }, []);

  // Switch to an existing inbox from history
  const handleSwitchInbox = (inboxSession: MailboxSession) => {
    setCurrentSession(inboxSession);
    setEmail(inboxSession.email);
    setUsername(inboxSession.username);
    setDomain(inboxSession.domain);
    setCustomUsername(inboxSession.username);
    setCustomDomain(inboxSession.domain);
    setMessages([]);
    setSelectedMessage(null);
    prevMessagesCountRef.current = 0;
    persistSession(inboxSession);
    showToast(`Switched to inbox: ${inboxSession.email}`, "success");
    loadMessagesForSession(inboxSession, true);
  };

  // Delete an inbox from history
  const handleDeleteInbox = (e: React.MouseEvent, inboxEmail: string) => {
    e.stopPropagation();
    const updated = savedInboxes.filter((item) => item.email !== inboxEmail);
    setSavedInboxes(updated);
    try {
      localStorage.setItem("tempemailo_inboxes_sessions", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast("Inbox removed from session history", "info");
  };

  // Custom email form submit
  const handleCustomEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!cleanUser) {
      showToast("Please enter a valid username", "error");
      return;
    }

    setIsListLoading(true);
    let newSess = await MailEngine.createMailtmAccount(cleanUser, customDomain);
    if (!newSess) {
      newSess = await MailEngine.createOneSecMailAccount(cleanUser, customDomain);
    }

    if (newSess) {
      setCurrentSession(newSess);
      setEmail(newSess.email);
      setUsername(newSess.username);
      setDomain(newSess.domain);
      setMessages([]);
      setSelectedMessage(null);
      prevMessagesCountRef.current = 0;
      persistSession(newSess);
      saveSessionToList(newSess);
      setIsCustomizing(false);
      showToast(`Custom inbox activated: ${newSess.email}`, "success");
      loadMessagesForSession(newSess, true);
    } else {
      showToast("Failed to create custom email. Please try another username.", "error");
    }
    setIsListLoading(false);
  };

  // Fetch messages from active session (Live Auto-Refresh)
  const loadMessagesForSession = async (sess: MailboxSession, showIndicator = false) => {
    if (!sess) return;
    if (showIndicator) setIsListLoading(true);
    setPulseSync(true);
    setError(null);
    try {
      const data = await MailEngine.fetchMessages(sess);
      setMessages(data || []);

      // Sound & Toast Alert on new incoming message
      if (data && data.length > prevMessagesCountRef.current) {
        const newCount = data.length - prevMessagesCountRef.current;
        showToast(`📬 Received ${newCount} new email${newCount > 1 ? "s" : ""}!`, "success");
        if (soundEnabled) {
          playNotificationSound();
        }
      }
      prevMessagesCountRef.current = data ? data.length : 0;
    } catch (err) {
      if (showIndicator) {
        setError("Connecting to server...");
      }
    } finally {
      setIsListLoading(false);
      setTimeout(() => setPulseSync(false), 800);
    }
  };

  // Fetch full message details
  const fetchMessageDetail = async (id: string | number) => {
    if (!currentSession) return;
    setIsMessageLoading(true);
    setError(null);
    try {
      const data = await MailEngine.readMessage(currentSession, id);
      if (data) {
        setSelectedMessage(data);
        if (data.htmlBody) {
          setActiveTab("html");
        } else {
          setActiveTab("text");
        }
      } else {
        throw new Error("Failed to retrieve email body");
      }
    } catch (err) {
      showToast("Error loading email content.", "error");
    } finally {
      setIsMessageLoading(false);
    }
  };

  // Auto-refresh continuous loop (Every 5 seconds automatically)
  useEffect(() => {
    if (!currentSession) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadMessagesForSession(currentSession, false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentSession, soundEnabled]);

  // Handle Copy Email Address
  const handleCopyEmail = () => {
    if (!email) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(email)
        .then(() => {
          setCopied(true);
          showToast("Email address copied to clipboard!", "success");
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => fallbackCopyText(email));
    } else {
      fallbackCopyText(email);
    }
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      showToast("Email address copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast("Failed to copy text", "error");
    }
    document.body.removeChild(textArea);
  };

  // Format bytes helper
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // FAQs data
  const faqs = [
    {
      q: "Does my temporary email stay the same when I refresh the page?",
      a: "YES! Your temporary email address is automatically saved in your browser session. Refreshing (F5 or reloading) the page will NOT change your email or delete your received emails. It will only change when you explicitly click the 'Change' button or create a custom address."
    },
    {
      q: "Is TempEmailo 100% free with no ads?",
      a: "Yes, 100%! TempEmailo is completely free forever and does not display any annoying ads, pop-ups, or banners. Enjoy a clean, super-fast, and distraction-free temporary email experience."
    },
    {
      q: "Do I need to manually refresh the inbox to see new emails?",
      a: "No! TempEmailo features a fully automatic live auto-refresh system. Our background listener automatically polls the inbox every 5 seconds. As soon as an email or OTP verification code arrives, it appears immediately with a notification sound."
    },
    {
      q: "Can I receive verification emails from Gmail, Google, Microsoft, and Discord?",
      a: "Yes! TempEmailo uses high-deliverability cloud MX servers that reliably receive verification codes and sign-up OTPs from all major platforms."
    },
    {
      q: "What is the usage limit for TempEmailo?",
      a: "There are ZERO usage limits. You can generate unlimited temporary email addresses, create custom usernames, receive unlimited emails, and download attachments at no cost."
    },
    {
      q: "Can I switch between multiple active temporary mailboxes?",
      a: "Yes! Your recent active session mailboxes (up to 5) are saved in your history panel so you can toggle between them without losing any incoming messages."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-fadeIn shadow-2xl rounded-2xl border border-blue-100 bg-white p-4 max-w-sm flex items-center space-x-3 transition-all duration-300">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-ping" />
          <p className="text-sm font-semibold text-slate-800">{toast.message}</p>
        </div>
      )}

      {/* Top Banner: 100% Free & No Ads */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-xs md:text-sm font-semibold py-2.5 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2 md:gap-4 text-center">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            100% FREE
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white text-xs font-bold tracking-wide">
            <Ban className="w-3.5 h-3.5 text-rose-300" />
            NO ANY ADS
          </span>
          <span className="hidden sm:inline text-white/95 font-medium">
            ⚡ Instant disposable temporary mail with automatic live sync &amp; persistent inbox!
          </span>
        </div>
      </div>

      {/* Main Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 py-3.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand Name */}
          <div className="flex items-center space-x-3.5">
            <BrandLogo size={42} />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
                  TempEmailo
                </h1>
                <span className="hidden sm:inline-flex text-[10px] uppercase bg-emerald-50 text-emerald-600 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 tracking-wider">
                  Ad-Free
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5">
                100% Free &amp; No Any Ads Temp Mail Service
              </p>
            </div>
          </div>

          {/* Header Controls: Live Sync Pill, Sound Toggle & GitHub Link */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Live Auto-Refresh Status Pill */}
            <div 
              className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 shadow-sm"
              title="Continuous live background polling active. No manual refresh needed!"
            >
              <Radio className={`w-3.5 h-3.5 text-emerald-600 ${pulseSync ? "animate-spin" : "animate-pulse"}`} />
              <span className="hidden sm:inline">Live Auto-Sync</span>
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {countdown}s
              </span>
            </div>

            {/* Manual check trigger */}
            <button
              onClick={() => {
                if (currentSession) loadMessagesForSession(currentSession, true);
              }}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all flex items-center space-x-1 text-xs font-bold shadow-sm"
              title="Check inbox now"
            >
              <RefreshCw className={`w-4 h-4 text-blue-600 ${pulseSync ? "animate-spin" : ""}`} />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                showToast(soundEnabled ? "Sound Alerts Muted" : "Sound Alerts Enabled", "info");
              }}
              className={`p-2 rounded-xl border transition-all flex items-center space-x-1 text-xs font-semibold ${
                soundEnabled 
                  ? "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm" 
                  : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
              }`}
              title={soundEnabled ? "Mute notification sound" : "Enable notification sound"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* GitHub Repository Star Link */}
            <a
              href="https://github.com/Sk-Gaming-007/TempEmailo"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl border border-slate-200 bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center space-x-1.5 text-xs font-bold shadow-sm"
              title="View Source on GitHub"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span className="hidden md:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 md:py-10 space-y-8">
        
        {/* Hero & Email Generation Box */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 md:p-10 space-y-6 relative overflow-hidden">
          
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

          {/* Heading and tagline */}
          <div className="relative text-center max-w-3xl mx-auto space-y-2.5">
            <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-100 text-blue-700 px-3.5 py-1 rounded-full text-xs font-bold shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>100% Free &amp; No Any Ads Temp Mail Service</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Your Temporary Disposable Mailbox
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              Your temporary mailbox stays persistent across page refreshes. Zero ads, instant OTP code reception, and unlimited disposable emails.
            </p>
          </div>

          {/* Email Address Display or Customizer */}
          <div className="relative max-w-3xl mx-auto">
            {isCustomizing ? (
              /* Custom Email Generator Form */
              <form onSubmit={handleCustomEmailSubmit} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4 animate-fadeIn shadow-inner">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Create Your Custom Address
                  </h3>
                  <span className="text-[11px] text-blue-600 font-semibold">100% Free</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={customUsername}
                      onChange={(e) => setCustomUsername(e.target.value.toLowerCase())}
                      placeholder="e.g. mysecuremail"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="flex-shrink-0 sm:w-52">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Choose Domain
                    </label>
                    <select
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      {domains.map((dom) => (
                        <option key={dom} value={dom}>@{dom}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsCustomizing(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-200"
                  >
                    Save &amp; Activate Email
                  </button>
                </div>
              </form>
            ) : (
              /* Main Email Address Display Box */
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                {/* Email Address Bar */}
                <div className="flex-grow flex items-center justify-between bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3 sm:py-3.5 select-all shadow-inner group">
                  <div className="flex items-center space-x-3 overflow-hidden mr-2">
                    <BrandLogo size={32} />
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-mono text-base md:text-lg font-bold text-slate-800 truncate select-all">
                        {email || "Loading mailbox..."}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCopyEmail}
                    className={`flex-shrink-0 flex items-center space-x-1.5 font-bold px-4 py-2.5 rounded-xl text-xs transition-all ${
                      copied 
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" 
                        : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                {/* Actions: Custom, Change, QR */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCustomUsername(username);
                      setCustomDomain(domain);
                      setIsCustomizing(true);
                    }}
                    className="flex-1 sm:flex-initial bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-sm"
                    title="Choose your own custom email name"
                  >
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <span>Custom Email</span>
                  </button>

                  <button
                    onClick={() => generateRandomEmail(true)}
                    disabled={isListLoading}
                    className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-blue-200"
                    title="Generate a new random email address"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Change</span>
                  </button>

                  <button
                    onClick={() => setQrModalOpen(true)}
                    className="bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold p-3 rounded-2xl text-sm flex items-center justify-center transition-all shadow-sm"
                    title="Show QR Code to open on mobile"
                  >
                    <QrCode className="w-4 h-4 text-purple-600" />
                  </button>
                </div>
              </div>
            )}

            {/* Live Auto-Refresh Notice */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-medium px-1">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>
                  Live Auto-Sync: Checking in <strong className="text-slate-700 font-bold">{countdown}s</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Active Inboxes History Panel */}
        {savedInboxes.length > 1 && (
          <section className="bg-slate-100/60 rounded-2xl border border-slate-200/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-slate-700">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Active Session Mailboxes ({savedInboxes.length}/5)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Click to switch</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedInboxes.map((item) => (
                <div
                  key={item.email}
                  onClick={() => handleSwitchInbox(item)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    item.email === email
                      ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate max-w-[170px] font-mono">{item.email}</span>
                  <button
                    onClick={(e) => handleDeleteInbox(e, item.email)}
                    className={`p-0.5 rounded-full transition-colors ${
                      item.email === email ? "text-blue-200 hover:text-white" : "text-slate-400 hover:text-slate-600"
                    }`}
                    title="Remove from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Inbox List & Message Reader Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          
          {/* Email Messages List */}
          <div className={`${selectedMessage ? "lg:col-span-5" : "lg:col-span-12"} bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-5 md:p-6 space-y-4 transition-all duration-300`}>
            
            {/* Inbox header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  Incoming Messages
                  <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-blue-100">
                    {messages.length} {messages.length === 1 ? "Email" : "Emails"}
                  </span>
                </h3>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-emerald-600 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Live Listening</span>
              </div>
            </div>

            {/* List state handling */}
            {isListLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="border border-slate-100 rounded-2xl p-4 animate-pulse space-y-2.5 bg-slate-50/50">
                    <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                    <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-200 rounded-md w-1/4" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100 space-y-2">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-sm font-semibold text-red-700">{error}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-sm animate-pulse">
                  <Inbox className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-800 text-base">Your Inbox is Ready &amp; Waiting</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Any email or OTP verification code sent to <strong className="font-mono text-slate-700">{email}</strong> will appear here automatically in real time.
                  </p>
                </div>
                <div className="inline-flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 font-semibold">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span>Cloud MX live listener active</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {messages.map((msg) => {
                  const isSelected = selectedMessage?.id === msg.id;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => fetchMessageDetail(msg.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative group ${
                        isSelected 
                          ? "border-blue-600 bg-blue-50/70 shadow-md ring-1 ring-blue-500/20" 
                          : "border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/70 shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5 gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate block max-w-[200px]">
                          {msg.from}
                        </span>
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[10px] text-slate-400 font-semibold">{msg.date}</span>
                        </div>
                      </div>

                      <h4 className={`text-sm font-bold text-slate-900 line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors ${isSelected ? "text-blue-700" : ""}`}>
                        {msg.subject || "(No Subject)"}
                      </h4>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md font-medium truncate max-w-[120px]">
                          ID: #{String(msg.id).slice(0, 8)}
                        </span>
                        <div className="flex items-center space-x-1 text-xs text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Open Email</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Email Reader View */}
          {selectedMessage && (
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-5 md:p-6 space-y-5 animate-slideIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Message Content</h3>
                  <p className="text-xs text-slate-500 font-semibold">Received on {selectedMessage.date}</p>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Close message"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
                <div>
                  <span className="font-bold text-slate-400 mr-2 inline-block w-16">From:</span>
                  <span className="font-semibold text-slate-800">{selectedMessage.from}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 mr-2 inline-block w-16">To:</span>
                  <span className="font-mono text-slate-700">{email}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 mr-2 inline-block w-16">Subject:</span>
                  <span className="font-bold text-slate-900">{selectedMessage.subject || "(No Subject)"}</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center space-x-1 border-b border-slate-100">
                {selectedMessage.htmlBody && (
                  <button
                    onClick={() => setActiveTab("html")}
                    className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] ${
                      activeTab === "html"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Formatted View (HTML)
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("text")}
                  className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] ${
                    activeTab === "text"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Plain Text
                </button>
                <button
                  onClick={() => setActiveTab("raw")}
                  className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] ${
                    activeTab === "raw"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Raw Data
                </button>
              </div>

              {/* Message Body Container */}
              <div className="border border-slate-100 rounded-2xl p-4 min-h-[250px] max-h-[600px] overflow-auto bg-white">
                {isMessageLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    <p className="text-sm font-semibold text-slate-500">Loading message...</p>
                  </div>
                ) : activeTab === "html" && selectedMessage.htmlBody ? (
                  <iframe
                    title="Email Content"
                    srcDoc={`
                      <html>
                        <head>
                          <style>
                            body {
                              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                              color: #1e293b;
                              line-height: 1.6;
                              margin: 0;
                              padding: 10px;
                            }
                            a { color: #2563eb; text-decoration: underline; }
                            img { max-width: 100%; height: auto; }
                          </style>
                        </head>
                        <body>
                          ${selectedMessage.htmlBody}
                        </body>
                      </html>
                    `}
                    className="w-full min-h-[350px] border-0"
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                  />
                ) : activeTab === "text" ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed">
                    {selectedMessage.textBody || selectedMessage.body || "No textual content available."}
                  </pre>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
                    {JSON.stringify(selectedMessage, null, 2)}
                  </pre>
                )}
              </div>

              {/* Attachments */}
              {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Attachments ({selectedMessage.attachments.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedMessage.attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/70 hover:border-slate-300 transition-all"
                      >
                        <div className="overflow-hidden mr-2">
                          <p className="text-xs font-bold text-slate-800 truncate" title={file.filename}>
                            {file.filename}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {formatBytes(file.size)} &bull; {file.contentType}
                          </p>
                        </div>
                        {file.downloadUrl && (
                          <a
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 p-2 rounded-xl text-slate-700 transition-all shadow-sm"
                            title="Download attachment"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Feature Highlights Section */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-900 uppercase tracking-wider">
              Why TempEmailo is 100% Free &amp; Ad-Free
            </h3>
            <p className="text-xs md:text-sm text-slate-500 max-w-lg mx-auto">
              Engineered for ultra-fast performance, persistent mailbox sessions across reload, and zero ads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">100% No Any Ads</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Zero advertisements, zero pop-ups, and zero tracking cookies. Pure distraction-free temporary email experience.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Cloud MX Guaranteed Delivery</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                High-deliverability MX servers ensure instant OTP verification codes from Gmail, Google, Microsoft, and Discord.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Persistent &amp; Live Sync</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your email remains active even when you reload the page. Automatic background listener checks every 5 seconds.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="space-y-4">
          <div className="text-center space-y-1.5">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Frequently Asked Questions</h3>
            <p className="text-xs text-slate-500">Everything you need to know about TempEmailo</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 font-bold text-left text-sm text-slate-800 hover:bg-slate-50 transition-colors focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-500 leading-relaxed border-t border-slate-50 pt-3 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-5 text-center relative">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="pt-2 flex flex-col items-center">
              <BrandLogo size={42} className="mb-2" />
              <h3 className="font-extrabold text-lg text-slate-900">Scan QR Code</h3>
              <p className="text-xs text-slate-500 mt-0.5">Scan to access this temporary email on your mobile</p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl inline-block border border-slate-100">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(email)}`}
                alt="TempEmailo QR Code"
                className="w-44 h-44 mx-auto rounded-xl shadow-sm border border-white"
              />
            </div>

            <div className="space-y-2">
              <p className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-xl break-all">
                {email}
              </p>
              <button
                onClick={handleCopyEmail}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-blue-200"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Email Address</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Footer with Made By krishna, GitHub Link & Copyright */}
      <footer className="bg-white border-t border-slate-100 py-8 px-6 mt-12 text-center text-xs text-slate-500 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center space-x-1.5 font-bold text-slate-800 text-sm">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 inline" />
            <span>By krishna</span>
          </div>

          <span className="text-slate-300 hidden sm:inline">&bull;</span>

          <a
            href="https://github.com/Sk-Gaming-007/TempEmailo"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>Star on GitHub</span>
          </a>
        </div>

        <p className="text-slate-400 font-semibold">
          Copyright &copy; {new Date().getFullYear()} TempEmailo. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
