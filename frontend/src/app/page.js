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
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center bg-[#F5F2FC] dark:bg-[#0D0F18] text-main overflow-x-hidden font-dmsans transition-colors duration-300 select-none p-4 sm:p-6">
      
      {/* ── Background Showroom Artwork Layer ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {/* Dark Mode Background Art */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/login-bg-dark.png"
          alt="PC Alley Showroom Background"
          className={`absolute h-full w-full object-cover object-center transition-opacity duration-700 ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Light Mode Background Art */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/login-bg-light.png"
          alt="PC Alley Showroom Background Light"
          className={`absolute h-full w-full object-cover object-center transition-opacity duration-700 ${
            !isDark ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Ambient Dark/Light Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F2FC]/80 via-transparent to-[#F5F2FC]/70 dark:from-[#0D0F18]/90 dark:via-[#0D0F18]/40 dark:to-[#0D0F18]/80 z-[1] transition-colors duration-300" />
      </div>

      {/* ── Top-Left Logo & Branding ── */}
      <div className="absolute top-6 left-6 lg:top-8 lg:left-10 z-30 flex items-center gap-3">
        <LogoIcon className="w-10 h-10" />
        <div className="flex flex-col justify-center">
          <span className="text-xl font-black tracking-tight text-main font-rajdhani leading-[0.9]">
            PC ALLEY
          </span>
          <span className="text-[8px] tracking-[0.28em] text-[#5B73E8] dark:text-[#8FA5FF] font-bold uppercase leading-tight mt-1 opacity-90">
            INTEGRATED SYSTEMS
          </span>
        </div>
      </div>

      {/* ── Top-Right Theme Toggle Button ── */}
      <div className="absolute top-6 right-6 lg:top-8 lg:right-10 z-30">
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="w-10 h-10 rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-[#1E2235]/70 backdrop-blur-md flex items-center justify-center text-muted hover:text-main hover:border-[#5B73E8] dark:hover:border-[#8FA5FF] transition-all shadow-md active:scale-95"
          type="button"
        >
          {isDark ? <Moon size={16} className="text-[#8FA5FF]" /> : <Sun size={16} className="text-amber-500" />}
        </button>
      </div>

      {/* ── CENTER: Floating Glass Authentication Card ── */}
      <div className="w-full max-w-[420px] z-20 my-auto py-12 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full bg-white/85 dark:bg-[#131627]/85 backdrop-blur-2xl border border-white/80 dark:border-[#3B487A]/60 rounded-[28px] p-7 sm:p-9 shadow-2xl dark:shadow-[0_0_60px_rgba(40,60,140,0.3)] flex flex-col relative"
        >
          {/* Card Header */}
          <div className="mb-5 text-center">
            <p className="text-[9.5px] font-black tracking-[0.2em] text-[#5B73E8] dark:text-[#8FA5FF] uppercase mb-1">
              PERSONNEL CLEARANCE
            </p>
            <h2 className="text-2xl sm:text-3xl font-black font-rajdhani uppercase tracking-wider text-main leading-none">
              SYSTEM ACCESS
            </h2>
            <p className="text-xs text-muted mt-1.5 font-normal">
              Sign in to continue to PC Alley Integrated Systems.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Session Expiration / Queued Auth Notice Banner */}
            {authNotice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left flex items-start gap-2.5"
              >
                <Clock size={15} className="text-amber-500 shrink-0 mt-0.5" />
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
                className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-left flex items-start gap-2.5"
              >
                <ShieldAlert size={15} className="text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-rose-500 leading-snug">
                    {errorMessage}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Lockout Notification Banner */}
            {lockoutTimer > 0 && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-left">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
                  <ShieldAlert size={15} />
                  <span>ACCOUNT LOCKED</span>
                </div>
                <p className="text-[11px] text-main mt-1 leading-snug">
                  {lockoutMessage || "Too many failed attempts."}
                </p>
                <p className="text-[10px] font-mono text-rose-500 font-bold mt-1">
                  Retry available in: {Math.floor(lockoutTimer / 60)}m {lockoutTimer % 60}s
                </p>
              </div>
            )}

            {/* Attempts Remaining Warning */}
            {attemptsWarning && lockoutTimer === 0 && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left">
                <p className="text-[11px] text-amber-500 font-semibold leading-snug">
                  {attemptsWarning}
                </p>
              </div>
            )}

            {/* Username / Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <User size={15} />
              </div>
              <input
                id="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="Username or email"
                className="w-full bg-[#E8EEF8]/80 dark:bg-[#1A1E31]/80 text-main placeholder-muted/60 pl-10 pr-3.5 py-3 rounded-xl border border-black/5 dark:border-white/10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#5B73E8]/50 focus:border-[#5B73E8] transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <Lock size={15} />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full bg-[#E8EEF8]/80 dark:bg-[#1A1E31]/80 text-main placeholder-muted/60 pl-10 pr-10 py-3 rounded-xl border border-black/5 dark:border-white/10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#5B73E8]/50 focus:border-[#5B73E8] transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-main transition-colors"
                aria-label="Toggle Password Visibility"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Checkbox and Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-0.5 pb-0.5 text-muted">
              <label className="flex items-center gap-2 cursor-pointer select-none hover:text-main transition-colors">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  className="rounded bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 text-[#5B73E8] focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                />
                <span className="text-[11px] font-medium">Show Password</span>
              </label>
              <Link 
                href="/forgot-password" 
                className="text-[11px] font-semibold text-[#5B73E8] dark:text-[#8FA5FF] hover:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* CAPTCHA Challenge (if repeated failures) */}
            {requiresCaptcha && (
              <div className="p-2.5 bg-[#5B73E8]/10 border border-[#5B73E8]/30 rounded-xl flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-main">
                  <input
                    type="checkbox"
                    checked={captchaVerified}
                    onChange={(e) => setCaptchaVerified(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 text-[#5B73E8] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[11px]">Security Verification</span>
                </label>
                <div className="w-2 h-2 rounded-full bg-[#5B73E8] animate-pulse" />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || lockoutTimer > 0}
              className="w-full py-3.5 px-6 rounded-xl bg-[#5B73E8] hover:bg-[#4E66DA] text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#5B73E8]/25 hover:shadow-xl hover:shadow-[#5B73E8]/35 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-wait mt-1"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={15} />
              ) : lockoutTimer > 0 ? (
                `LOCKED (${lockoutTimer}s)`
              ) : (
                <>LOGIN <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          {/* Subtle OR Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            <span className="text-[9px] font-bold text-muted/60 uppercase tracking-widest">OR</span>
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>

          {/* Authorized Personnel Only Badge */}
          <div className="w-full py-2.5 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-center gap-2 text-[11px] font-medium text-muted select-none">
            <ShieldCheck size={14} className="text-[#5B73E8] dark:text-[#8FA5FF]" />
            <span>Authorized Personnel Only</span>
          </div>
        </motion.div>

        {/* Bottom Footer Tag */}
        <div className="mt-6 text-center text-[9px] uppercase tracking-[0.22em] text-muted/70 font-semibold space-y-1 select-none">
          <p>SECURE &nbsp;•&nbsp; RELIABLE &nbsp;•&nbsp; ALWAYS ON</p>
          <p className="opacity-75">PC ALLEY &nbsp;|&nbsp; INTEGRATED SYSTEMS</p>
        </div>
      </div>

    </div>
  );
}
