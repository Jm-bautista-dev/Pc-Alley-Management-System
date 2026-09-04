"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Shield, KeyRound, Lock, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showWarning } from "@/context/ModalContext";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState("");

  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/[^0-9]/g, "");
    if (cleanVal.length > 1) {
      // Handle paste
      const digits = cleanVal.slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(digits.length, 5);
      const nextInput = document.getElementById(`otp-${nextIdx}`);
      if (nextInput) nextInput.focus();
      return;
    }
    
    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);
    
    if (cleanVal && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showWarning("Please enter your registered email or username.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();

      if (res.ok) {
        showSuccess(data.message || "Reset token generated successfully.");
        if (data.debugToken) {
          setDevToken(data.debugToken);
        }
        setStep(2);
      } else {
        showError(data.message || "Failed to initiate recovery request.");
      }
    } catch (err) {
      console.error(err);
      showError("Connection error while contacting recovery server.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    const token = otp.join("").trim();
    if (token.length !== 6) {
      showWarning("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/verify-reset-token"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          token
        })
      });
      const data = await res.json();

      if (res.ok) {
        showSuccess(data.message || "Identity confirmed. Please choose a new password.");
        setStep(3);
      } else {
        showError(data.message || "Invalid or expired verification code.");
      }
    } catch (err) {
      console.error(err);
      showError("Verification service connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showWarning("Password must be at least 6 characters in length.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);
    try {
      const token = otp.join("").trim();
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          token,
          newPassword
        })
      });
      const data = await res.json();

      if (res.ok) {
        showSuccess(data.message || "Password updated successfully!");
        setStep(4);
      } else {
        showError(data.message || "Failed to update master password.");
      }
    } catch (err) {
      console.error(err);
      showError("Failed to communicate with key server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bgbase text-main flex items-center justify-center p-6 relative overflow-hidden font-dmsans transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-grid opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-crimson/5 rounded-full blur-[150px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-panel p-8 md:p-10 rounded-[32px] border border-border shadow-2xl text-center relative overflow-hidden">
          
          {/* Step Progress Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-main/5">
            <motion.div 
              className="h-full bg-gradient-to-r from-brand-neonblue to-brand-neonpurple"
              initial={{ width: "25%" }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="w-16 h-16 bg-main/5 border border-border rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl relative group">
                  <Shield size={28} className="text-brand-crimson group-hover:drop-shadow-[0_0_10px_rgba(215,38,56,0.8)] transition-all" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-main mb-2 tracking-tight">Access Recovery</h1>
                <p className="text-xs text-muted mb-8 leading-relaxed">
                  Enter your registered username or email address to generate an authorized cryptographic reset token.
                </p>

                <form onSubmit={handleStep1Submit} className="space-y-5">
                  <div className="relative group">
                    <input
                      type="text"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="peer w-full bg-transparent border-2 border-border rounded-xl py-3.5 pl-12 pr-4 text-sm text-main placeholder-transparent focus:outline-none focus:border-brand-neonblue focus:shadow-[0_0_15px_rgba(0,242,255,0.2)] transition-all backdrop-blur-md"
                      placeholder="Username or Work Email"
                    />
                    <label 
                      htmlFor="email" 
                      className="absolute left-12 -top-2.5 bg-brand-bgbase px-1 text-[10px] font-black uppercase tracking-widest text-brand-neonblue transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-muted peer-placeholder-shown:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-brand-neonblue peer-focus:text-[10px]"
                    >
                      Username or Email
                    </label>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-brand-neonblue transition-colors">
                      <Mail size={18} />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 bg-brand-crimson hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-[4px] text-xs transition-all shadow-[0_0_15px_rgba(215,38,56,0.4)] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : "Transmit Reset Vector"}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="w-16 h-16 bg-main/5 border border-border rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl relative group">
                  <KeyRound size={28} className="text-brand-neonblue group-hover:drop-shadow-[0_0_10px_rgba(0,242,255,0.8)] transition-all" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-main mb-2 tracking-tight">Identity Verification</h1>
                <p className="text-xs text-muted mb-4 leading-relaxed">
                  Enter the 6-digit verification token generated for <span className="text-brand-neonblue font-semibold">{email}</span>.
                </p>

                {devToken && (
                  <div className="mb-6 p-3 bg-brand-neonblue/10 border border-brand-neonblue/30 rounded-xl text-left">
                    <p className="text-[10px] text-brand-neonblue font-mono font-bold uppercase tracking-wider mb-1">
                      Dev/Test Token:
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm tracking-widest text-main font-bold">{devToken}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const digits = devToken.split("");
                          setOtp(digits);
                        }}
                        className="text-[10px] text-brand-neonblue hover:underline font-bold"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleStep2Submit} className="space-y-6">
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-10 h-14 sm:w-12 sm:h-16 bg-main/5 border border-border rounded-xl text-center text-xl text-main font-rajdhani font-black focus:outline-none focus:border-brand-neonblue focus:shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-all"
                      />
                    ))}
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 bg-brand-neonblue/20 border border-brand-neonblue text-brand-neonblue hover:bg-brand-neonblue hover:text-white dark:hover:text-brand-navy hover:shadow-[0_0_20px_rgba(0,242,255,0.5)] rounded-xl font-black uppercase tracking-[4px] text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : "Verify Token"}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="w-16 h-16 bg-main/5 border border-border rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl relative group">
                  <Lock size={28} className="text-brand-neonpurple group-hover:drop-shadow-[0_0_10px_rgba(188,19,254,0.8)] transition-all" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-main mb-2 tracking-tight">Generate New Key</h1>
                <p className="text-xs text-muted mb-6 leading-relaxed">
                  Authentication token confirmed. Create a secure master access password.
                </p>

                <form onSubmit={handleStep3Submit} className="space-y-4 text-left">
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="newPass"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="peer w-full bg-transparent border-2 border-border rounded-xl py-3.5 pl-12 pr-12 text-sm text-main placeholder-transparent focus:outline-none focus:border-brand-neonpurple focus:shadow-[0_0_15px_rgba(188,19,254,0.2)] transition-all backdrop-blur-md"
                      placeholder="New Password"
                    />
                    <label 
                      htmlFor="newPass" 
                      className="absolute left-12 -top-2.5 bg-brand-bgbase px-1 text-[10px] font-black uppercase tracking-widest text-brand-neonpurple transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-muted peer-placeholder-shown:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-brand-neonpurple peer-focus:text-[10px]"
                    >
                      New Password (min 6 chars)
                    </label>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-brand-neonpurple transition-colors">
                      <Lock size={18} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors z-10"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="confirmPass"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="peer w-full bg-transparent border-2 border-border rounded-xl py-3.5 pl-12 pr-12 text-sm text-main placeholder-transparent focus:outline-none focus:border-brand-neonpurple focus:shadow-[0_0_15px_rgba(188,19,254,0.2)] transition-all backdrop-blur-md"
                      placeholder="Confirm Password"
                    />
                    <label 
                      htmlFor="confirmPass" 
                      className="absolute left-12 -top-2.5 bg-brand-bgbase px-1 text-[10px] font-black uppercase tracking-widest text-brand-neonpurple transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-muted peer-placeholder-shown:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-brand-neonpurple peer-focus:text-[10px]"
                    >
                      Confirm Password
                    </label>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-brand-neonpurple transition-colors">
                      <Lock size={18} />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 bg-brand-neonpurple/20 border border-brand-neonpurple text-brand-neonpurple hover:bg-brand-neonpurple hover:text-white dark:hover:text-brand-navy hover:shadow-[0_0_20px_rgba(188,19,254,0.5)] rounded-xl font-black uppercase tracking-[4px] text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : "Update Credential"}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <CheckCircle2 size={40} className="text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                  </motion.div>
                </div>
                <h1 className="text-2xl font-rajdhani font-black text-main mb-3 tracking-wide">ACCESS RESTORED</h1>
                <p className="text-xs text-muted mb-8 leading-relaxed px-2">
                  Your cryptographic keys have been updated and verified successfully. You may now authenticate at the entry portal.
                </p>

                <Link href="/" className="inline-block w-full py-4 bg-main/5 border border-border hover:bg-main/10 text-main rounded-xl font-black uppercase tracking-[4px] text-xs transition-all active:scale-[0.98]">
                  Return to Portal
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {step < 4 && (
            <div className="mt-8 pt-6 border-t border-border">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-xs font-black text-muted hover:text-main transition-all uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Back to Entry Portal
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
