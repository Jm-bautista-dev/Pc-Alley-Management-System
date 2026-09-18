"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, Lock, Eye, EyeOff, ShieldAlert, ArrowRight, Loader2, Sun, Moon, AlertCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { apiUrl, getApiErrorMessage, resetSessionExpiryLock } from "@/lib/api";
import { LogoIcon } from "@/components/Logo";
import { useTheme } from "@/context/ThemeContext";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
        console.warn("[AUTH] Session verification offline/failed:", checkErr.message);
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-bgbase text-main overflow-hidden font-dmsans transition-colors duration-300">
      {/* LEFT SIDE: Branding Panel */}
      <div className="lg:w-1/2 w-full bg-gradient-to-br from-brand-navy to-brand-bgbase p-8 md:p-16 flex flex-col justify-between relative min-h-[450px] lg:min-h-screen transition-colors duration-300 border-r border-border">
        {/* Background Subtle Grid/Overlay */}
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />

        {/* Logo Top Left */}
        <div className="flex items-center gap-4 relative z-10">
          <LogoIcon className="w-10 h-10" />
          <div className="flex flex-col justify-center">
            <span className="text-2xl font-black tracking-tighter text-main font-rajdhani leading-[0.9]">
              PC ALLEY
            </span>
            <span className="text-[8px] tracking-[0.4em] text-brand-crimson font-bold uppercase leading-tight mt-1.5 opacity-90">
              INTEGRATED SYSTEMS
            </span>
          </div>
        </div>

        {/* Tech Core Giant Text */}
        <div className="space-y-1 my-auto py-12 lg:py-0 relative z-10">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase font-rajdhani tracking-tighter leading-none text-main">
            THE
          </h1>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase font-rajdhani tracking-tighter leading-none text-brand-crimson">
            TECH
          </h1>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase font-rajdhani tracking-tighter leading-none text-main">
            CORE.
          </h1>
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Form */}
      <div className="lg:w-1/2 w-full bg-brand-bgbase p-8 md:p-16 flex flex-col justify-center items-center relative min-h-[500px] lg:min-h-screen transition-colors duration-300">
        {/* Theme Toggle Top Right */}
        <div className="absolute top-8 right-8 z-20">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted hover:text-main hover:border-brand-neonblue transition-all bg-brand-surface/80 backdrop-blur-sm shadow-sm"
            type="button"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Login Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] glass-panel rounded-[32px] p-8 md:p-12 shadow-2xl flex flex-col relative z-10"
        >
          <p className="text-[10px] text-brand-crimson font-black uppercase tracking-[0.2em] mb-1">
            PERSONNEL CLEARANCE
          </p>
          <h2 className="text-xl md:text-2xl font-rajdhani font-black uppercase tracking-wider text-main mb-8">
            SYSTEM ACCESS
          </h2>

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

            {/* Inline Error Message Banner (No Popups) */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-brand-crimson/15 border border-brand-crimson/40 rounded-xl text-left flex items-start gap-3"
              >
                <AlertCircle size={16} className="text-brand-crimson shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-brand-crimson leading-snug">
                    {errorMessage}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Username/Email Input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <User size={18} />
              </div>
              <input
                type="text"
                id="username"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-brand-surface/40 border border-border rounded-xl py-3.5 pl-12 pr-4 text-sm text-main placeholder-muted focus:outline-none focus:border-brand-neonblue transition-all"
                placeholder="Enter Username"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-brand-surface/40 border border-border rounded-xl py-3.5 pl-12 pr-12 text-sm text-main placeholder-muted focus:outline-none focus:border-brand-neonblue transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Lockout Notification Banner */}
            {lockoutTimer > 0 && (
              <div className="p-3.5 bg-brand-crimson/15 border border-brand-crimson/40 rounded-xl text-left">
                <div className="flex items-center gap-2 text-brand-crimson font-bold text-xs">
                  <ShieldAlert size={16} />
                  <span>ACCOUNT LOCKED</span>
                </div>
                <p className="text-[11px] text-main mt-1 leading-snug">
                  {lockoutMessage || "Too many failed attempts."}
                </p>
                <p className="text-[10px] font-mono text-brand-crimson font-bold mt-1.5">
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

            {/* Checkbox and Forgot Password */}
            <div className="flex items-center justify-between text-[10px] md:text-xs font-bold uppercase tracking-wider pt-2 pb-2 text-muted">
              <label className="flex items-center gap-2 cursor-pointer select-none hover:text-main transition-colors">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  className="rounded bg-brand-surface/40 border-border text-brand-crimson focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                SHOW PASSWORD
              </label>
              <Link href="/forgot-password" className="text-brand-crimson hover:opacity-85 transition-colors">
                FORGOT PASSWORD?
              </Link>
            </div>

            {/* CAPTCHA Challenge (if repeated failures) */}
            {requiresCaptcha && (
              <div className="p-3 bg-brand-neonblue/10 border border-brand-neonblue/30 rounded-xl flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-main">
                  <input
                    type="checkbox"
                    checked={captchaVerified}
                    onChange={(e) => setCaptchaVerified(e.target.checked)}
                    className="w-4 h-4 rounded bg-brand-surface/40 border-border text-brand-neonblue focus:ring-0 cursor-pointer"
                  />
                  <span>I am not a robot (Security Verification)</span>
                </label>
                <div className="w-2 h-2 rounded-full bg-brand-neonblue animate-pulse" />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || lockoutTimer > 0}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
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


        </motion.div>
      </div>
    </div>
  );
}
