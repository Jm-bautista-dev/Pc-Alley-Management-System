"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  User, Lock, Eye, EyeOff, ShieldAlert, ShieldCheck,
  ArrowRight, Loader2, Sun, Moon, Clock, BarChart3, Package, PieChart,
} from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { apiUrl, getApiErrorMessage, resetSessionExpiryLock } from "@/lib/api";
import { LogoIcon } from "@/components/Logo";
import { useTheme } from "@/context/ThemeContext";

const GPUOutline = ({ className }) => (
  <svg viewBox="0 0 380 145" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="2" y="28" width="360" height="95" rx="6" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.35" />
    <rect x="2" y="2" width="58" height="30" rx="3" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.22" />
    <rect x="68" y="2" width="58" height="30" rx="3" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.22" />
    <circle cx="90" cy="76" r="27" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <circle cx="90" cy="76" r="16" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.18" />
    <circle cx="90" cy="76" r="5" fill="currentColor" fillOpacity="0.1" />
    <circle cx="185" cy="76" r="27" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <circle cx="185" cy="76" r="16" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.18" />
    <circle cx="185" cy="76" r="5" fill="currentColor" fillOpacity="0.1" />
    <rect x="15" y="118" width="230" height="16" rx="3" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.18" />
    <line x1="272" y1="28" x2="272" y2="123" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.14" />
    <rect x="282" y="38" width="58" height="8" rx="2" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.18" />
    <rect x="282" y="54" width="58" height="8" rx="2" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.18" />
    <rect x="282" y="70" width="38" height="8" rx="2" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.14" />
  </svg>
);

const ChipOutline = ({ className }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="25" y="25" width="70" height="70" rx="6" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.32" />
    <rect x="36" y="36" width="48" height="48" rx="3" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.18" />
    <line x1="40" y1="10" x2="40" y2="25" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="55" y1="10" x2="55" y2="25" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="70" y1="10" x2="70" y2="25" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="85" y1="10" x2="85" y2="25" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="40" y1="95" x2="40" y2="110" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="55" y1="95" x2="55" y2="110" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="70" y1="95" x2="70" y2="110" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="85" y1="95" x2="85" y2="110" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="10" y1="40" x2="25" y2="40" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="10" y1="55" x2="25" y2="55" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="10" y1="70" x2="25" y2="70" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="10" y1="85" x2="25" y2="85" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="95" y1="40" x2="110" y2="40" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="95" y1="55" x2="110" y2="55" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="95" y1="70" x2="110" y2="70" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="95" y1="85" x2="110" y2="85" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <line x1="40" y1="60" x2="80" y2="60" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.12" />
    <line x1="60" y1="40" x2="60" y2="80" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.12" />
    <circle cx="60" cy="60" r="8" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.15" />
  </svg>
);

const MonitorOutline = ({ className }) => (
  <svg viewBox="0 0 220 185" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="2" y="2" width="216" height="140" rx="8" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.28" />
    <rect x="12" y="12" width="196" height="120" rx="4" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.16" />
    <line x1="100" y1="142" x2="82" y2="176" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.22" />
    <line x1="120" y1="142" x2="138" y2="176" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.22" />
    <rect x="64" y="172" width="92" height="10" rx="3" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.22" />
    <circle cx="110" cy="148" r="3" fill="currentColor" fillOpacity="0.18" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [lockoutMessage, setLockoutMessage] = useState("");
  const [attemptsWarning, setAttemptsWarning] = useState("");
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canvasRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 38, damping: 22 });
  const smoothY = useSpring(mouseY, { stiffness: 38, damping: 22 });
  const gpuX = useTransform(smoothX, (v) => v);
  const gpuY = useTransform(smoothY, (v) => v);
  const chipX = useTransform(smoothX, (v) => v * -0.55);
  const chipY = useTransform(smoothY, (v) => v * -0.55);
  const monX = useTransform(smoothX, (v) => v * 0.35);
  const monY = useTransform(smoothY, (v) => v * 0.35);
  const orbX = useTransform(smoothX, (v) => v * 0.5);
  const orbY = useTransform(smoothY, (v) => v * 0.5);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let interval = null;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) { setLockoutMessage(""); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [lockoutTimer]);

  useEffect(() => {
    try {
      const queuedNotice = sessionStorage.getItem("auth_notice");
      if (queuedNotice) { sessionStorage.removeItem("auth_notice"); setAuthNotice(queuedNotice); }
    } catch (e) {}
    const verifyExistingSession = async () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) return;
      try {
        const res = await fetch(apiUrl("/api/auth/session"), {
          method: "GET", credentials: "include",
          headers: { "Authorization": `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const sessionData = await res.json();
          if (sessionData && sessionData.valid) {
            if (sessionData.user) localStorage.setItem("user", JSON.stringify(sessionData.user));
            const params = new URLSearchParams(window.location.search);
            const redirectParam = params.get("redirect");
            if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") && redirectParam !== "/") {
              router.replace(redirectParam); return;
            }
            const userRole = sessionData.user?.role;
            if (userRole === "employee" || userRole === "staff") { router.replace("/sales"); }
            else { router.replace("/dashboard"); }
            return;
          }
        }
      } catch (checkErr) { console.warn("[AUTH] Session verification offline/failed:", checkErr?.message); }
      try { localStorage.removeItem("token"); localStorage.removeItem("user"); } catch (e) {}
    };
    verifyExistingSession();
  }, [router]);

  useEffect(() => {
    if (!mounted) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const onMove = (e) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 28);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 20);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mounted, mouseX, mouseY]);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const isDarkMode = theme === "dark";
    const rgb = isDarkMode ? "255,255,255" : "91,115,232";
    const dots = Array.from({ length: 48 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.1 + 0.4, op: Math.random() * 0.3 + 0.08,
    }));
    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach((d) => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + rgb + "," + d.op + ")"; ctx.fill();
      });
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x; const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 105) {
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = "rgba(" + rgb + "," + (0.06 * (1 - dist / 105)) + ")";
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, [mounted, theme]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setAttemptsWarning(""); setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (lockoutTimer > 0) { setErrorMessage(`Account is locked. Please wait ${lockoutTimer} seconds.`); return; }
    if (requiresCaptcha && !captchaVerified) { setErrorMessage("Please complete the security challenge before logging in."); return; }
    setLoading(true);
    try {
      localStorage.removeItem("token"); localStorage.removeItem("user");
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formData.username.trim().toLowerCase(), password: formData.password }),
      });
      const responseText = await res.text();
      let data = {};
      try { data = responseText ? JSON.parse(responseText) : {}; }
      catch (parseError) {
        console.error("Non-JSON API response:", responseText);
        data = { message: res.ok ? "Server returned an invalid response." : `Server error (${res.status}). Check the backend terminal for details.` };
      }
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token); localStorage.setItem("user", JSON.stringify(data.user));
        resetSessionExpiryLock();
        const params = new URLSearchParams(window.location.search);
        const redirectParam = params.get("redirect");
        if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") && redirectParam !== "/") { router.push(redirectParam); }
        else if (data.user?.role === "employee" || data.user?.role === "staff") { router.push("/sales"); }
        else { router.push("/dashboard"); }
      } else if (res.status === 429) {
        const seconds = data.retryAfter || 900;
        setLockoutTimer(seconds); setLockoutMessage(data.message || "Account temporarily locked due to excessive failed attempts.");
        setErrorMessage(data.message || `Account locked. Retry in ${Math.ceil(seconds / 60)} minutes.`);
      } else {
        if (data.requireCaptcha) setRequiresCaptcha(true);
        if (data.attemptsRemaining !== undefined) setAttemptsWarning(`Security Notice: ${data.attemptsRemaining} attempt(s) remaining before temporary lockout.`);
        setErrorMessage(getApiErrorMessage(data.message, "Invalid Security Credentials"));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(getApiErrorMessage(err, "Uplink failed. Network connection error."));
    } finally { setLoading(false); }
  };

  const isDark = mounted ? theme === "dark" : true;
  const fg = isDark ? "text-white" : "text-[#0A0A12]";
  const fgMuted = isDark ? "text-white/40" : "text-black/38";
  const inputCls = isDark
    ? "bg-white/[0.06] border-white/[0.09] text-white placeholder-white/25 focus:border-[#5B73E8]/70 focus:bg-white/[0.09] focus:ring-2 focus:ring-[#5B73E8]/18"
    : "bg-black/[0.04] border-black/[0.09] text-[#0A0A12] placeholder-black/22 focus:border-[#5B73E8]/70 focus:bg-white focus:ring-2 focus:ring-[#5B73E8]/14";
  const iconCls = isDark
    ? "text-white/22 group-focus-within:text-[#8FA5FF]"
    : "text-black/22 group-focus-within:text-[#5B73E8]";
  return (
    <div className="min-h-screen w-full relative flex overflow-hidden font-dmsans select-none"
      style={{ background: isDark ? "#080B14" : "#F3F3F7" }}>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-[2] pointer-events-none" />

      <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
        <motion.div className="absolute rounded-full"
          style={{ width: 500, height: 500, top: "-15%", left: "8%", x: orbX, y: orbY,
            background: "radial-gradient(circle,rgba(91,115,232,0.13) 0%,transparent 68%)",
            filter: "blur(40px)" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />

        <motion.div className={"absolute " + (isDark ? "text-[#8FA5FF]/18" : "text-[#5B73E8]/13")}
          style={{ top: "6%", left: "3%", width: 340, x: gpuX, y: gpuY }}
          animate={{ y: [0, -14, 0], rotate: [-0.8, 0.8, -0.8] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}>
          <GPUOutline className="w-full" />
        </motion.div>

        <motion.div className={"absolute " + (isDark ? "text-[#8FA5FF]/13" : "text-[#5B73E8]/10")}
          style={{ bottom: "13%", left: "3%", width: 92, x: chipX, y: chipY }}
          animate={{ y: [0, 9, 0], rotate: [0, 3, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}>
          <ChipOutline className="w-full" />
        </motion.div>

        <motion.div className={"absolute hidden lg:block " + (isDark ? "text-[#8FA5FF]/09" : "text-[#5B73E8]/07")}
          style={{ top: "33%", left: "36%", width: 105, x: monX, y: monY }}
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}>
          <MonitorOutline className="w-full" />
        </motion.div>

        <motion.div className={"absolute hidden lg:block " + (isDark ? "text-[#8FA5FF]/09" : "text-[#5B73E8]/07")}
          style={{ top: "18%", left: "28%", width: 50, x: monX, y: monY }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}>
          <ChipOutline className="w-full" />
        </motion.div>
      </div>

      <div className="relative z-[10] w-full flex flex-col lg:flex-row min-h-screen">

        <div className="w-full lg:w-[57%] flex flex-col justify-between p-7 sm:p-10 lg:p-12 xl:p-16 min-h-[44vh] lg:min-h-screen">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex items-center gap-3">
            <LogoIcon className="w-10 h-10" />
            <div className="flex flex-col">
              <span className={"text-[19px] font-black tracking-tight font-rajdhani leading-none " + fg}>PC ALLEY</span>
              <span className="text-[7px] tracking-[0.32em] text-[#5B73E8] font-bold uppercase leading-tight mt-1.5 opacity-90">INTEGRATED SYSTEMS</span>
            </div>
          </motion.div>

          <div className="my-auto py-10 max-w-[430px]">
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="leading-[0.84]">
              <h1 className={"font-black uppercase font-rajdhani tracking-tighter " + fg} style={{ fontSize: "clamp(3.8rem,7.5vw,6.2rem)" }}>THE</h1>
              <h1 className="font-black uppercase font-rajdhani tracking-tighter text-[#5B73E8]" style={{ fontSize: "clamp(3.8rem,7.5vw,6.2rem)" }}>TECH</h1>
              <h1 className={"font-black uppercase font-rajdhani tracking-tighter " + fg} style={{ fontSize: "clamp(3.8rem,7.5vw,6.2rem)" }}>CORE.</h1>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.22 }}
              className={"text-[13px] font-medium mt-4 tracking-wide " + fgMuted}>Smarter Systems. Stronger Business.</motion.p>
            <motion.div initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.55, delay: 0.32 }}
              className="w-9 h-[2px] rounded-full mt-5 mb-6" style={{ background: "#5B73E8" }} />
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap gap-2">
              {[
                { Icon: BarChart3, label: "Sales", sub: "Tracking" },
                { Icon: Package, label: "Inventory", sub: "Management" },
                { Icon: PieChart, label: "Business", sub: "Analytics" },
              ].map(({ Icon, label, sub }) => (
                <div key={label} className={"flex items-center gap-2.5 px-3 py-2 rounded-xl border backdrop-blur-sm transition-all " +
                  (isDark ? "bg-white/[0.04] border-white/[0.08] hover:border-[#5B73E8]/35" : "bg-white/60 border-black/[0.07] hover:border-[#5B73E8]/35")}>
                  <div className="w-6 h-6 rounded-lg bg-[#5B73E8]/14 flex items-center justify-center shrink-0">
                    <Icon size={12} className="text-[#5B73E8]" />
                  </div>
                  <div className="leading-tight">
                    <p className={"text-[11px] font-bold " + fg}>{label}</p>
                    <p className={"text-[10px] " + fgMuted}>{sub}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="hidden lg:block absolute bottom-[88px] left-[37%] xl:left-[40%] pointer-events-none">
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 0.65, y: 0 }} transition={{ duration: 0.9, delay: 0.55 }}
              className="font-caveat font-bold italic leading-snug text-[#5B73E8] -rotate-6" style={{ fontSize: "clamp(1.45rem,2.2vw,2rem)" }}>
              Built<br /><span className="ml-3" style={{ fontSize: "88%" }}>for a Smarter</span><br /><span className="ml-6">Tomorrow.</span>
            </motion.p>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }}
            className={"pt-4 border-t text-[8px] uppercase tracking-[0.26em] font-semibold space-y-1 " +
              (isDark ? "border-white/[0.08] text-white/22" : "border-black/[0.07] text-black/25")}>
            <p>PC ALLEY &nbsp;&nbsp;|&nbsp;&nbsp; INTEGRATED SYSTEMS</p>
            <p>PEOPLE &nbsp;•&nbsp; PRODUCTS &nbsp;•&nbsp; POSSIBILITIES</p>
          </motion.div>
        </div>

        <div className="w-full lg:w-[43%] shrink-0 relative flex flex-col justify-center items-center px-8 sm:px-12 lg:px-10 xl:px-14 py-12 lg:py-0 min-h-[520px] lg:min-h-screen"
          style={{
            background: isDark ? "rgba(10,11,22,0.82)" : "rgba(255,255,255,0.78)",
            backdropFilter: "blur(20px) saturate(160%)",
            borderLeft: isDark ? "1px solid rgba(255,255,255,0.055)" : "1px solid rgba(0,0,0,0.055)",
          }}>

          <div className="absolute top-5 right-5 z-30">
            <button onClick={toggleTheme} aria-label="Toggle Theme" type="button"
              className={"w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 " +
                (isDark ? "bg-white/[0.07] border border-white/[0.1] hover:bg-white/[0.13] text-[#8FA5FF]"
                        : "bg-black/[0.05] border border-black/[0.09] hover:bg-black/[0.1] text-[#5B73E8]")}>
              {isDark ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, delay: 0.14 }}
            className="w-full max-w-[385px]">
            <div className="mb-7">
              <div className={"inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9.5px] font-semibold uppercase tracking-[0.18em] mb-5 border " +
                (isDark ? "text-[#8FA5FF] bg-[#5B73E8]/[0.12] border-[#5B73E8]/30"
                        : "text-[#5B73E8] bg-[#5B73E8]/[0.08] border-[#5B73E8]/25")}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B73E8] animate-pulse shrink-0" />
                PERSONNEL CLEARANCE
              </div>
              <h2 className={"font-black font-rajdhani uppercase tracking-wider leading-none mb-2 " + fg}
                style={{ fontSize: "clamp(1.9rem,3.5vw,2.25rem)" }}>SYSTEM ACCESS</h2>
              <p className={"text-[12.5px] leading-relaxed " + fgMuted}>Sign in to continue to PC Alley Integrated Systems.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {authNotice && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-amber-500/[0.1] border border-amber-500/25 rounded-xl flex items-start gap-2.5">
                  <Clock size={12} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11.5px] font-medium text-amber-400 leading-snug">{authNotice}</p>
                </motion.div>
              )}
              {errorMessage && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-rose-500/[0.1] border border-rose-500/25 rounded-xl flex items-start gap-2.5">
                  <ShieldAlert size={12} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11.5px] font-medium text-rose-400 leading-snug">{errorMessage}</p>
                </motion.div>
              )}
              {lockoutTimer > 0 && (
                <div className="p-3 bg-rose-500/[0.1] border border-rose-500/25 rounded-xl">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-[10.5px] mb-1">
                    <ShieldAlert size={11} /><span>ACCOUNT LOCKED</span>
                  </div>
                  <p className={"text-[11px] " + fgMuted}>{lockoutMessage || "Too many failed attempts."}</p>
                  <p className="text-[10px] font-mono text-rose-400 font-bold mt-1">
                    Retry in: {Math.floor(lockoutTimer / 60)}m {lockoutTimer % 60}s
                  </p>
                </div>
              )}
              {attemptsWarning && lockoutTimer === 0 && (
                <div className="p-2.5 bg-amber-500/[0.1] border border-amber-500/25 rounded-xl">
                  <p className="text-[11px] text-amber-400 font-medium leading-snug">{attemptsWarning}</p>
                </div>
              )}

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={13} className={"transition-colors duration-200 " + iconCls} />
                </div>
                <input id="username" type="text" required value={formData.username} onChange={handleChange}
                  placeholder="Username or email"
                  className={"w-full pl-[42px] pr-4 py-3.5 rounded-xl text-[13px] outline-none border transition-all duration-200 " + inputCls} />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={13} className={"transition-colors duration-200 " + iconCls} />
                </div>
                <input id="password" type={showPassword ? "text" : "password"} required value={formData.password} onChange={handleChange}
                  placeholder="Password"
                  className={"w-full pl-[42px] pr-12 py-3.5 rounded-xl text-[13px] outline-none border transition-all duration-200 font-mono " + inputCls} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle Password Visibility"
                  className={"absolute inset-y-0 right-0 pr-4 flex items-center transition-colors duration-200 " +
                    (isDark ? "text-white/22 hover:text-white/55" : "text-black/22 hover:text-black/55")}>
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>

              <div className="flex items-center justify-between px-0.5 pt-0.5">
                <label className={"flex items-center gap-2 cursor-pointer text-[11px] font-medium transition-colors " +
                  (isDark ? "text-white/28 hover:text-white/55" : "text-black/28 hover:text-black/55")}>
                  <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)}
                    className="w-3.5 h-3.5 rounded border text-[#5B73E8] focus:ring-0 cursor-pointer" />
                  Show Password
                </label>
                <Link href="/forgot-password" className="text-[11px] font-semibold text-[#5B73E8] hover:opacity-80 transition-opacity">
                  Forgot Password?
                </Link>
              </div>

              {requiresCaptcha && (
                <div className={"p-3 rounded-xl border flex items-center justify-between " +
                  (isDark ? "bg-[#5B73E8]/[0.08] border-[#5B73E8]/22" : "bg-[#5B73E8]/[0.06] border-[#5B73E8]/18")}>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={captchaVerified} onChange={(e) => setCaptchaVerified(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#5B73E8] focus:ring-0 cursor-pointer" />
                    <span className={"text-[11px] " + fgMuted}>Security Verification</span>
                  </label>
                  <div className="w-2 h-2 rounded-full bg-[#5B73E8] animate-pulse" />
                </div>
              )}

              <motion.button type="submit" disabled={loading || lockoutTimer > 0}
                whileHover={{ scale: 1.012 }} whileTap={{ scale: 0.988 }}
                className="w-full py-3.5 px-6 rounded-xl bg-[#5B73E8] hover:bg-[#4E66DA] text-white font-bold text-[11.5px] tracking-[0.14em] uppercase flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                style={{ boxShadow: "0 4px 20px rgba(91,115,232,0.28)" }}>
                {loading ? <Loader2 className="animate-spin" size={14} />
                  : lockoutTimer > 0 ? `LOCKED (${lockoutTimer}s)`
                  : <><span>Sign In</span><ArrowRight size={13} /></>}
              </motion.button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className={"h-px flex-1 " + (isDark ? "bg-white/[0.07]" : "bg-black/[0.07]")} />
              <span className={"text-[9px] font-bold uppercase tracking-widest " + fgMuted + " opacity-60"}>OR</span>
              <div className={"h-px flex-1 " + (isDark ? "bg-white/[0.07]" : "bg-black/[0.07]")} />
            </div>

            <div className={"w-full py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-[11px] font-medium " +
              (isDark ? "bg-white/[0.025] border-white/[0.07] text-white/28" : "bg-black/[0.025] border-black/[0.07] text-black/28")}>
              <ShieldCheck size={12} className="text-[#5B73E8]" />
              Authorized Personnel Only
            </div>
          </motion.div>

          <p className={"absolute bottom-5 text-[8px] uppercase tracking-[0.26em] font-semibold " + fgMuted + " opacity-60"}>
            SECURE &nbsp;•&nbsp; RELIABLE &nbsp;•&nbsp; ALWAYS ON
          </p>
        </div>
      </div>
    </div>
  );
}
