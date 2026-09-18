"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  ShieldCheck,
  ArrowRight, 
  Loader2, 
  Sun, 
  Moon, 
  Clock,
  BarChart3,
  Package,
  PieChart
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { apiUrl, getApiErrorMessage, resetSessionExpiryLock } from "@/lib/api";
import { LogoIcon } from "@/components/Logo";
import { useTheme } from "@/context/ThemeContext";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [lockoutMessage, setLockoutMessage] = useState("");
  const [attemptsWarning, setAttemptsWarning] = useState("");
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let interval = null;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setLockoutMessage("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockoutTimer]);

  useEffect(() => {
    // 1. Check if a session notification is queued from an expired session redirect
    try {
      const queuedNotice = sessionStorage.getItem("auth_notice");
      if (queuedNotice) {
        sessionStorage.removeItem("auth_notice");
        setAuthNotice(queuedNotice);
      }
    } catch (e) {}

    // 2. Server-side session validation to prevent reusing stale or revoked tokens on localhost
    const verifyExistingSession = async () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) return;

      try {
        const res = await fetch(apiUrl("/api/auth/session"), {
          method: "GET",
          credentials: "include",
          headers: {
            "Authorization": `Bearer ${storedToken}`
          }
        });

        if (res.ok) {
          const sessionData = await res.json();
          if (sessionData && sessionData.valid) {
            if (sessionData.user) {
              localStorage.setItem("user", JSON.stringify(sessionData.user));
            }

            // Check if user was redirected from a specific page
            const params = new URLSearchParams(window.location.search);
            const redirectParam = params.get("redirect");
            if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") && redirectParam !== "/") {
              router.replace(redirectParam);
              return;
            }

            const userRole = sessionData.user?.role;
            if (userRole === "employee" || userRole === "staff") {
              router.replace("/sales");
            } else {
              router.replace("/dashboard");
            }
            return;
          }
        }
      } catch (checkErr) {
        console.warn("[AUTH] Session verification offline/failed:", checkErr?.message);
      }

      // If token is invalid or server rejected session, purge stale data so user sees clean login
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch (e) {}
    };

    verifyExistingSession();
  }, [router]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setAttemptsWarning("");
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (lockoutTimer > 0) {
      setErrorMessage(`Account is locked. Please wait ${lockoutTimer} seconds.`);
      return;
    }
    if (requiresCaptcha && !captchaVerified) {
      setErrorMessage("Please complete the security challenge before logging in.");
      return;
    }

    setLoading(true);

    try {
      // Clear old authentication state before establishing new session
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username.trim().toLowerCase(),
          password: formData.password
        })
      });

      const responseText = await res.text();
      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("Non-JSON API response:", responseText);
        data = {
          message: res.ok
            ? "Server returned an invalid response."
            : `Server error (${res.status}). Check the backend terminal for details.`
        };
      }

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        resetSessionExpiryLock();
        
        // Direct seamless navigation to destination without disruptive modal popup
        const params = new URLSearchParams(window.location.search);
        const redirectParam = params.get("redirect");
        if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") && redirectParam !== "/") {
          router.push(redirectParam);
        } else if (data.user?.role === "employee" || data.user?.role === "staff") {
          router.push("/sales");
        } else {
          router.push("/dashboard");
        }
      } else if (res.status === 429) {
        const seconds = data.retryAfter || 900;
        setLockoutTimer(seconds);
        setLockoutMessage(data.message || "Account temporarily locked due to excessive failed attempts.");
        setErrorMessage(data.message || `Account locked. Retry in ${Math.ceil(seconds / 60)} minutes.`);
      } else {
        if (data.requireCaptcha) {
          setRequiresCaptcha(true);
        }
        if (data.attemptsRemaining !== undefined) {
          setAttemptsWarning(`Security Notice: ${data.attemptsRemaining} attempt(s) remaining before temporary lockout.`);
        }
        const friendlyMsg = getApiErrorMessage(data.message, "Invalid Security Credentials");
        setErrorMessage(friendlyMsg);
      }
    } catch (err) {
      console.error(err);
      const friendlyMsg = getApiErrorMessage(err, "Uplink failed. Network connection error.");
      setErrorMessage(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const isDark = mounted ? theme === "dark" : true;

  return (
    <div className="min-h-screen w-full relative flex flex-col lg:flex-row bg-[#F4F0FB] dark:bg-[#141221] text-main overflow-x-hidden font-dmsans transition-colors duration-300 select-none">
      
      {/* ── Dynamic High-Tech Showroom Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Dark Mode Background Art */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/login-bg-dark.png"
          alt="PC Alley Showroom Background"
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Light Mode Background Art */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/login-bg-light.png"
          alt="PC Alley Showroom Background Light"
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
            !isDark ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Soft Vignette / Gradient Overlays for High Legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F4F0FB]/90 via-[#F4F0FB]/40 to-[#F4F0FB]/80 dark:from-[#141221]/95 dark:via-[#141221]/40 dark:to-[#141221]/90 transition-colors duration-300" />
      </div>

      {/* ── Top-Right Theme Toggle ── */}
      <div className="absolute top-6 right-6 lg:top-8 lg:right-10 z-30">
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="w-10 h-10 rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-[#201D38]/70 backdrop-blur-md flex items-center justify-center text-muted hover:text-main hover:border-[#657BE6] dark:hover:border-[#9AAAF8] transition-all shadow-md active:scale-95"
          type="button"
        >
          {isDark ? <Moon size={17} className="text-[#A7B6FF]" /> : <Moon size={17} className="text-slate-700" />}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════
          LEFT SIDE: Branding, Hero Headline, Feature Badges & Slogan
         ════════════════════════════════════════════════════════ */}
      <div className="lg:w-[54%] w-full flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative z-10 min-h-[500px] lg:min-h-screen">
        
        {/* 1. Header Logo */}
        <div className="flex items-center gap-3.5">
          <LogoIcon className="w-11 h-11" />
          <div className="flex flex-col justify-center">
            <span className="text-2xl lg:text-[26px] font-black tracking-tight text-main font-rajdhani leading-[0.9]">
              PC ALLEY
            </span>
            <span className="text-[8px] lg:text-[9px] tracking-[0.3em] text-[#657BE6] dark:text-[#9AAAF8] font-bold uppercase leading-tight mt-1.5 opacity-90">
              INTEGRATED SYSTEMS
            </span>
          </div>
        </div>

        {/* 2. Hero Headline + Subtitle + Feature Badges */}
        <div className="my-auto py-10 lg:py-4 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-0.5"
          >
            <h1 className="text-6xl sm:text-7xl lg:text-[88px] font-black uppercase font-rajdhani tracking-tighter leading-[0.88] text-main">
              THE
            </h1>
            <h1 className="text-6xl sm:text-7xl lg:text-[88px] font-black uppercase font-rajdhani tracking-tighter leading-[0.88] text-[#657BE6] dark:text-[#8397F8]">
              TECH
            </h1>
            <h1 className="text-6xl sm:text-7xl lg:text-[88px] font-black uppercase font-rajdhani tracking-tighter leading-[0.88] text-main">
              CORE.
            </h1>
          </motion.div>

          <p className="text-sm sm:text-base text-muted font-medium mt-4 tracking-normal">
            Smarter Systems. Stronger Business.
          </p>

          {/* 3 Interactive Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
            {/* Feature 1: Sales Tracking */}
            <div className="bg-white/60 dark:bg-[#1E1A33]/60 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-sm hover:border-[#657BE6]/50 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-[#657BE6]/10 dark:bg-[#8397F8]/15 text-[#657BE6] dark:text-[#9AAAF8] flex items-center justify-center shrink-0">
                <BarChart3 size={16} />
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold text-main">Sales</p>
                <p className="text-[11px] text-muted">Tracking</p>
              </div>
            </div>

            {/* Feature 2: Inventory Management */}
            <div className="bg-white/60 dark:bg-[#1E1A33]/60 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-sm hover:border-[#657BE6]/50 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-[#657BE6]/10 dark:bg-[#8397F8]/15 text-[#657BE6] dark:text-[#9AAAF8] flex items-center justify-center shrink-0">
                <Package size={16} />
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold text-main">Inventory</p>
                <p className="text-[11px] text-muted">Management</p>
              </div>
            </div>

            {/* Feature 3: Business Analytics */}
            <div className="bg-white/60 dark:bg-[#1E1A33]/60 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-sm hover:border-[#657BE6]/50 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-[#657BE6]/10 dark:bg-[#8397F8]/15 text-[#657BE6] dark:text-[#9AAAF8] flex items-center justify-center shrink-0">
                <PieChart size={16} />
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold text-main">Business</p>
                <p className="text-[11px] text-muted">Analytics</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Cursive Slogan on Desk Foreground */}
        <div className="my-2 lg:my-0">
          <p className="font-caveat text-3xl sm:text-4xl text-[#657BE6] dark:text-[#9AAAF8] font-bold tracking-normal italic -rotate-6 transform origin-left select-none opacity-90 drop-shadow-sm">
            Built<br />
            <span className="ml-2">for a Smarter</span><br />
            <span className="ml-8">Tomorrow.</span>
          </p>
        </div>

        {/* 4. Left Bottom Footer */}
        <div className="pt-8 border-t border-black/5 dark:border-white/10 mt-6 text-[9px] sm:text-[10px] text-muted/70 uppercase tracking-[0.25em] font-semibold space-y-1">
          <p>PC ALLEY &nbsp;&nbsp;|&nbsp;&nbsp; INTEGRATED SYSTEMS</p>
          <p>PEOPLE &nbsp;•&nbsp; PRODUCTS &nbsp;•&nbsp; POSSIBILITIES</p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          RIGHT SIDE: Authentication Form & System Access Card
         ════════════════════════════════════════════════════════ */}
      <div className="lg:w-[46%] w-full flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 relative z-10 min-h-[500px] lg:min-h-screen">
        
        {/* Floating Glass Authentication Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[440px] bg-white/80 dark:bg-[#1E1A33]/85 backdrop-blur-2xl border border-white/60 dark:border-[#7A8CE8]/25 rounded-[32px] p-8 sm:p-10 shadow-2xl dark:shadow-[0_0_60px_rgba(100,120,240,0.18)] flex flex-col relative"
        >
          {/* Card Header */}
          <div className="mb-6">
            <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.22em] text-[#657BE6] dark:text-[#9AAAF8] uppercase mb-1">
              PERSONNEL CLEARANCE
            </p>
            <h2 className="text-2xl sm:text-3xl font-black font-rajdhani uppercase tracking-wide text-main">
              SYSTEM ACCESS
            </h2>
            <p className="text-xs sm:text-[13px] text-muted mt-1 font-normal">
              Sign in to continue to PC Alley Integrated Systems.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Session Expiration / Queued Auth Notice Banner */}
            {authNotice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left flex items-start gap-3"
              >
                <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-500 leading-snug">
                    {authNotice}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Inline Error Message Banner */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-left flex items-start gap-3"
              >
                <ShieldAlert size={16} className="text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-rose-500 leading-snug">
                    {errorMessage}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Lockout Notification Banner */}
            {lockoutTimer > 0 && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-left">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
                  <ShieldAlert size={16} />
                  <span>ACCOUNT LOCKED</span>
                </div>
                <p className="text-[11px] text-main mt-1 leading-snug">
                  {lockoutMessage || "Too many failed attempts."}
                </p>
                <p className="text-[10px] font-mono text-rose-500 font-bold mt-1.5">
                  Retry available in: {Math.floor(lockoutTimer / 60)}m {lockoutTimer % 60}s
                </p>
              </div>
            )}

            {/* Attempts Remaining Warning */}
            {attemptsWarning && lockoutTimer === 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left">
                <p className="text-[11px] text-amber-500 font-semibold leading-snug">
                  {attemptsWarning}
                </p>
              </div>
            )}

            {/* Username / Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted">
                <User size={16} />
              </div>
              <input
                id="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="admin@pcalley.com"
                className="w-full bg-[#EBF0F7] dark:bg-[#141224] text-main placeholder-muted/60 pl-11 pr-4 py-3.5 rounded-2xl border border-black/5 dark:border-white/10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#657BE6]/50 focus:border-[#657BE6] transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted">
                <Lock size={16} />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-[#EBF0F7] dark:bg-[#141224] text-main placeholder-muted/60 pl-11 pr-11 py-3.5 rounded-2xl border border-black/5 dark:border-white/10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#657BE6]/50 focus:border-[#657BE6] transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted hover:text-main transition-colors"
                aria-label="Toggle Password Visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Checkbox and Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-1 pb-1 text-muted">
              <label className="flex items-center gap-2 cursor-pointer select-none hover:text-main transition-colors">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  className="rounded bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 text-[#657BE6] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                />
                <span className="text-xs font-medium">Show Password</span>
              </label>
              <Link 
                href="/forgot-password" 
                className="text-xs font-semibold text-[#657BE6] dark:text-[#9AAAF8] hover:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* CAPTCHA Challenge (if repeated failures) */}
            {requiresCaptcha && (
              <div className="p-3 bg-[#657BE6]/10 border border-[#657BE6]/30 rounded-2xl flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-main">
                  <input
                    type="checkbox"
                    checked={captchaVerified}
                    onChange={(e) => setCaptchaVerified(e.target.checked)}
                    className="w-4 h-4 rounded bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 text-[#657BE6] focus:ring-0 cursor-pointer"
                  />
                  <span>I am not a robot (Security Verification)</span>
                </label>
                <div className="w-2 h-2 rounded-full bg-[#657BE6] animate-pulse" />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || lockoutTimer > 0}
              className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-[#657BE6] hover:bg-[#5269DA] text-white font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#657BE6]/30 hover:shadow-xl hover:shadow-[#657BE6]/40 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-wait mt-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : lockoutTimer > 0 ? (
                `LOCKED (${lockoutTimer}s)`
              ) : (
                <>LOGIN <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Subtle OR Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            <span className="text-[10px] font-bold text-muted/60 uppercase tracking-widest">OR</span>
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>

          {/* Authorized Personnel Only Badge */}
          <div className="w-full py-3 px-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-center gap-2 text-xs font-medium text-muted select-none">
            <ShieldCheck size={15} className="text-[#657BE6] dark:text-[#9AAAF8]" />
            <span>Authorized Personnel Only</span>
          </div>
        </motion.div>

        {/* Right Bottom Footer Tag */}
        <p className="mt-8 text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-muted/70 font-semibold text-center select-none">
          SECURE &nbsp;•&nbsp; RELIABLE &nbsp;•&nbsp; ALWAYS ON
        </p>
      </div>

    </div>
  );
}
