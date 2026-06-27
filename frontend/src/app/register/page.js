"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Mail, Lock, Shield, ArrowRight, Github, Chrome, Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    first_name: "",
    last_name: "",
    username: "", 
    password: "", 
    confirmPassword: "",
    role: "employee", 
    branch_id: "" 
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return showError("Passwords do not match.");
    if (!formData.branch_id) return showError("Please select a logical sector (branch)");
    
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          username: formData.username.trim().toLowerCase(),
          branch_id: Number(formData.branch_id)
        })
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess("Account initialized. Access granted.");
        router.push("/");
      } else {
        showError(data.message || "Registration protocol failed");
      }
    } catch (err) {
      showError("Network link interrupted");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bgbase text-main flex items-center justify-center p-6 relative overflow-hidden font-dmsans transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-grid opacity-20 pointer-events-none" />
      <div className="absolute -top-[10%] -right-[10%] w-[500px] h-[500px] bg-brand-crimson/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute -bottom-[10%] -left-[10%] w-[500px] h-[500px] bg-[#BC13FE]/10 rounded-full blur-[120px] animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-panel p-10 rounded-[32px] border-border shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 shadow-xl shadow-white/5 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all">
                <div className="w-full h-full bg-brand-crimson rounded-md" />
              </div>
              <h1 className="font-rajdhani font-black text-3xl tracking-[2px] text-main">PC AL<span className="text-brand-crimson">LEY</span></h1>
            </Link>
            <h2 className="text-xl font-bold text-main mb-2">Initialize Account</h2>
            <p className="text-xs text-muted uppercase tracking-widest font-bold">Secure Personnel Registration</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <input
                  type="text"
                  id="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  className="peer w-full bg-transparent border-2 border-border rounded-xl py-4 pl-12 pr-4 text-sm text-main placeholder-transparent focus:outline-none focus:border-brand-neonblue focus:shadow-[0_0_15px_rgba(0,209,255,0.2)] transition-all flex backdrop-blur-md"
                  placeholder="First Name"
                />
                <label
                  htmlFor="first_name"
                  className="absolute left-12 -top-2.5 bg-brand-bgbase px-1 text-[10px] font-black uppercase tracking-widest text-brand-neonblue transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-[45%] peer-placeholder-shown:text-muted peer-placeholder-shown:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-brand-neonblue peer-focus:text-[10px] cursor-text"
                >
                  First Name
                </label>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-brand-neonblue transition-colors">
                  <User size={18} />
                </div>
              </div>

              <div className="relative group">
                <input
                  type="text"
                  id="last_name"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  className="peer w-full bg-transparent border-2 border-border rounded-xl py-4 pl-12 pr-4 text-sm text-main placeholder-transparent focus:outline-none focus:border-brand-neonblue focus:shadow-[0_0_15px_rgba(0,209,255,0.2)] transition-all flex backdrop-blur-md"
                  placeholder="Last Name"
                />
                <label
                  htmlFor="last_name"
                  className="absolute left-12 -top-2.5 bg-brand-bgbase px-1 text-[10px] font-black uppercase tracking-widest text-brand-neonblue transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-[45%] peer-placeholder-shown:text-muted peer-placeholder-shown:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-brand-neonblue peer-focus:text-[10px] cursor-text"
                >
                  Last Name
                </label>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-brand-neonblue transition-colors">
                  <User size={18} />
                </div>
              </div>
            </div>

            <div className="relative group">
              <input
                type="text"
                id="username"
                required
                value={formData.username}
                onChange={handleChange}
                className="peer w-full bg-transparent border-2 border-border rounded-xl py-4 pl-12 pr-4 text-sm text-main placeholder-transparent focus:outline-none focus:border-brand-neonpurple focus:shadow-[0_0_15px_rgba(188,19,254,0.2)] transition-all flex backdrop-blur-md"
                placeholder="Work Email or Username"
              />
              <label 
                htmlFor="username" 
                className="absolute left-12 -top-2.5 bg-brand-bgbase px-1 text-[10px] font-black uppercase tracking-widest text-brand-neonpurple transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-[45%] peer-placeholder-shown:text-muted peer-placeholder-shown:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-brand-neonpurple peer-focus:text-[10px] cursor-text"
              >
                Work Email or Username
              </label>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-brand-neonpurple transition-colors">
                <Mail size={18} />
              </div>
            </div>

            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="peer w-full bg-transparent border-2 border-border rounded-xl py-4 pl-12 pr-12 text-sm text-main placeholder-transparent focus:outline-none focus:border-brand-crimson focus:shadow-[0_0_15px_rgba(215,38,56,0.2)] transition-all flex backdrop-blur-md"
                placeholder="Access Password"
              />
              <label 
                htmlFor="password" 
                className="absolute left-12 -top-2.5 bg-brand-bgbase px-1 text-[10px] font-black uppercase tracking-widest text-brand-crimson transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-[45%] peer-placeholder-shown:text-muted peer-placeholder-shown:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-brand-crimson peer-focus:text-[10px] cursor-text"
              >
                Access Password
              </label>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-brand-crimson transition-colors">
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
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                required
                value={formData.confirmPassword || ""}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="peer w-full bg-transparent border-2 border-border rounded-xl py-4 pl-12 pr-12 text-sm text-main placeholder-transparent focus:outline-none focus:border-brand-crimson focus:shadow-[0_0_15px_rgba(215,38,56,0.2)] transition-all flex backdrop-blur-md"
                placeholder="Confirm Password"
              />
              <label 
                htmlFor="confirmPassword" 
                className="absolute left-12 -top-2.5 bg-brand-bgbase px-1 text-[10px] font-black uppercase tracking-widest text-brand-crimson transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-[45%] peer-placeholder-shown:text-muted peer-placeholder-shown:text-xs peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-brand-crimson peer-focus:text-[10px] cursor-text"
              >
                Confirm Password
              </label>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted peer-focus:text-brand-crimson transition-colors">
                <Lock size={18} />
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors z-10"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-3 pb-2 pt-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "employee" })}
                className={`py-3.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden relative ${
                  formData.role === "employee" ? "bg-[#FFD700]/10 border-[#FFD700] text-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.2)]" : "bg-transparent border-border text-muted hover:text-main hover:border-border"
                }`}
              >
                {formData.role === "employee" && (
                  <motion.div layoutId="role-bg" className="absolute inset-0 bg-[#FFD700]/10" />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <User size={14} /> Staff
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "branch_admin" })}
                className={`py-3.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden relative ${
                  formData.role === "branch_admin" ? "bg-brand-crimson/10 border-brand-crimson text-brand-crimson shadow-[0_0_20px_rgba(215,38,56,0.2)]" : "bg-transparent border-border text-muted hover:text-main hover:border-border"
                }`}
              >
                {formData.role === "branch_admin" && (
                  <motion.div layoutId="role-bg" className="absolute inset-0 bg-brand-crimson/10" />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Shield size={14} /> Manager
                </span>
              </button>
            </div>

            {/* Branch Selection (Conditional) */}
            <div className="relative group">
              <select
                id="branch_id"
                value={formData.branch_id || ""}
                onChange={handleChange}
                className="peer w-full bg-brand-bgbase border-2 border-border rounded-xl py-4 flex pl-5 pr-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all backdrop-blur-md appearance-none"
              >
                <option value="" disabled>Select Logical Sector (Branch) ...</option>
                <option value="1">Sector Alpha (Manila)</option>
                <option value="2">Sector Beta (Cebu)</option>
                <option value="3">Sector Zeta (Davao)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none group-focus-within:text-brand-neonblue transition-colors">
                 <Shield size={16} />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4.5 bg-brand-crimson hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-[4px] text-xs transition-all shadow-[0_0_20px_rgba(215,38,56,0.4)] active:scale-[0.98] flex items-center justify-center gap-3 group mt-4 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Register Account <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </form>

          {/* Social Links */}
          <div className="mt-8 pt-8 border-t border-border">
            <div className="flex justify-center gap-4">
              <button onClick={() => showError("OAuth Link Offline: Secure Direct Only")} className="p-3 bg-main/5 border border-border rounded-xl hover:bg-main/10 hover:border-border transition-all hover:-translate-y-1">
                <Github size={20} className="text-muted" />
              </button>
              <button onClick={() => showError("OAuth Link Offline: Secure Direct Only")} className="p-3 bg-main/5 border border-border rounded-xl hover:bg-main/10 hover:border-border transition-all hover:-translate-y-1">
                <Chrome size={20} className="text-muted" />
              </button>
            </div>
          </div>

          <p className="text-center mt-8 text-xs text-muted font-bold uppercase tracking-wider">
            Already Secured? <Link href="/" className="text-brand-crimson hover:text-[#FF3B4E] hover:drop-shadow-[0_0_5px_rgba(215,38,56,0.8)] transition-all ml-1">Sign In Here</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
