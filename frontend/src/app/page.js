"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, Lock, Eye, EyeOff, ShieldAlert, ArrowRight, Loader2, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { LogoIcon } from "@/components/Logo";
import { useTheme } from "@/context/ThemeContext";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { usePreventBack } from "@/lib/usePreventBack";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  // Prevent authenticated users from pressing Back to reach this page
  usePreventBack(false);

  useEffect(() => {
    // If user is already logged in, redirect them away from the login page
    const storedToken = localStorage.getItem("token");
    const storedUser  = localStorage.getItem("user");
    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role === "employee" || parsed.role === "staff") {
          router.replace("/sell/all");
        } else {
          router.replace("/dashboard");
        }
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
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

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        showSuccess("Security Clearance Verified.");
        
        if (data.user.role === "employee" || data.user.role === "staff") {
          router.push("/sales");
        } else {
          router.push("/dashboard");
        }
      } else {
        showError(data.message || "Invalid Security Credentials");
      }
    } catch (err) {
      console.error(err);
      showError("Uplink failed. Network connection error.");
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
          <p className="text-[10px] md:text-[11px] text-muted uppercase tracking-[0.25em] font-semibold max-w-sm mt-6 leading-relaxed">
            PROPELLING HARDWARE INVENTORY MANAGEMENT INTO THE NEXT GENERATION.
          </p>
        </div>

        {/* Footer Stats/Metrics */}
        <div className="flex items-center justify-between lg:justify-start lg:gap-16 pt-8 border-t border-border mt-auto relative z-10">
          <div>
            <p className="text-2xl md:text-3xl font-rajdhani font-black text-main">3.2k</p>
            <p className="text-[9px] text-muted uppercase tracking-[0.15em] font-bold mt-1">AUTHORIZED HUBS</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-rajdhani font-black text-main">1.5M</p>
            <p className="text-[9px] text-muted uppercase tracking-[0.15em] font-bold mt-1">MATRIX ASSETS</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-muted">
              <ShieldAlert size={12} />
            </div>
            <p className="text-[9px] text-muted uppercase tracking-[0.15em] font-bold">SECURE LINK</p>
          </div>
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

            {/* Checkbox and Forgot Password */}
            <div className="flex items-center justify-between text-[10px] md:text-xs font-bold uppercase tracking-wider pt-2 pb-4 text-muted">
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <>LOGIN <ArrowRight size={16} /></>}
            </button>
          </form>

          {/* Divider */}
          <div className="w-full h-px bg-border my-8" />

          {/* Legal Protocol */}
          <div className="text-center">
            <p className="text-[8px] text-muted/60 font-black uppercase tracking-[0.2em] mb-1">
              LEGAL PROTOCOL
            </p>
            <p className="text-[9px] text-muted/40 font-black uppercase tracking-[0.25em]">
              © 2024 PC ALLEY • LOGIC CORE V4.2
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
