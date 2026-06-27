"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Shield, KeyRound, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPassword, setShowPassword] = useState(false);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus logic would go here
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setStep(step + 1);
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
        <div className="glass-panel p-10 rounded-[40px] border-border shadow-2xl text-center relative overflow-hidden">
          
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
                <div className="w-20 h-20 bg-main/5 border border-border rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-xl relative group">
                  <Shield size={32} className="text-brand-crimson group-hover:drop-shadow-[0_0_10px_rgba(215,38,56,0.8)] transition-all" />
                </div>
                <h1 className="text-2xl font-bold text-main mb-3 tracking-tight">Access Recovery</h1>
                <p className="text-sm text-muted mb-10 leading-relaxed">
                  Enter your workstation email address and we'll transmit a secure reset vector.
                </p>

                <form onSubmit={handleNextStep} className="space-y-6">
                  <div className="relative group">
                    <input
                      type="email"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="peer w-full bg-transparent border-2 border-border rounded-xl py-4.5 pl-12 pr-4 text-sm text-main placeholder-transparent focus:outline-none focus:border-brand-neonblue focus:shadow-[0_0_15px_rgba(0,242,255,0.2)] transition-all backdrop-blur-md"
                      placeholder="Work Email"
                    />
                    <label 
                      htmlFor="email" 
                      className="absolute left-12 -top-2.5 bg-brand-bgbase px-1 text-[10px] font-black uppercase tracking-widest text-brand-neonblue transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-muted peer-placeholder-shown:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-brand-neonblue peer-focus:text-[10px]"
                    >
                      Work Email
                    </label>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-brand-neonblue transition-colors">
                      <Mail size={18} />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-4 bg-brand-crimson hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-[4px] text-xs transition-all shadow-[0_0_15px_rgba(215,38,56,0.4)] active:scale-[0.98]">
                    Transmit Reset Vector
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
                <div className="w-20 h-20 bg-main/5 border border-border rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-xl relative group">
                  <KeyRound size={32} className="text-brand-neonblue group-hover:drop-shadow-[0_0_10px_rgba(0,242,255,0.8)] transition-all" />
                </div>
                <h1 className="text-2xl font-bold text-main mb-3 tracking-tight">Identity Verification</h1>
                <p className="text-sm text-muted mb-10 leading-relaxed">
                  Enter the 6-digit cryptographic token sent to <span className="text-brand-neonblue">{email}</span>.
                </p>

                <form onSubmit={handleNextStep} className="space-y-8">
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        className="w-10 h-14 sm:w-12 sm:h-16 bg-main/5 border border-border rounded-xl text-center text-xl text-main font-rajdhani font-black focus:outline-none focus:border-brand-neonblue focus:shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-all"
                      />
                    ))}
                  </div>

                  <button type="submit" className="w-full py-4 bg-brand-neonblue/20 border border-brand-neonblue text-brand-neonblue hover:bg-brand-neonblue hover:text-white dark:hover:text-brand-navy hover:shadow-[0_0_20px_rgba(0,242,255,0.5)] rounded-xl font-black uppercase tracking-[4px] text-xs transition-all active:scale-[0.98]">
                    Verify Token
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
                <div className="w-20 h-20 bg-main/5 border border-border rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-xl relative group">
                  <Lock size={32} className="text-brand-neonpurple group-hover:drop-shadow-[0_0_10px_rgba(188,19,254,0.8)] transition-all" />
                </div>
                <h1 className="text-2xl font-bold text-main mb-3 tracking-tight">Generate New Key</h1>
                <p className="text-sm text-muted mb-10 leading-relaxed">
                  Authentication successful. Please input your new master access password.
                </p>

                <form onSubmit={handleNextStep} className="space-y-6">
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="newPass"
                      required
                      className="peer w-full bg-transparent border-2 border-border rounded-xl py-4.5 pl-12 pr-12 text-sm text-main placeholder-transparent focus:outline-none focus:border-brand-neonpurple focus:shadow-[0_0_15px_rgba(188,19,254,0.2)] transition-all backdrop-blur-md"
                      placeholder="New Password"
                    />
                    <label 
                      htmlFor="newPass" 
                      className="absolute left-12 -top-2.5 bg-brand-bgbase px-1 text-[10px] font-black uppercase tracking-widest text-brand-neonpurple transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-muted peer-placeholder-shown:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-brand-neonpurple peer-focus:text-[10px]"
                    >
                      New Password
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

                  <button type="submit" className="w-full py-4 bg-brand-neonpurple/20 border border-brand-neonpurple text-brand-neonpurple hover:bg-brand-neonpurple hover:text-white dark:hover:text-brand-navy hover:shadow-[0_0_20px_rgba(188,19,254,0.5)] rounded-xl font-black uppercase tracking-[4px] text-xs transition-all active:scale-[0.98]">
                    Update Credential
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
                <div className="w-24 h-24 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <CheckCircle2 size={48} className="text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                  </motion.div>
                </div>
                <h1 className="text-3xl font-rajdhani font-black text-main mb-4 tracking-wide">ACCESS RESTORED</h1>
                <p className="text-sm text-muted mb-10 leading-relaxed px-4">
                  Your cryptographic keys have been updated successfully. You may now return to the entry portal.
                </p>

                <Link href="/" className="inline-block w-full py-4 bg-main/5 border border-border hover:bg-main/10 text-main rounded-xl font-black uppercase tracking-[4px] text-xs transition-all active:scale-[0.98]">
                  Return to Portal
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {step < 4 && (
            <div className="mt-10 pt-8 border-t border-border">
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
