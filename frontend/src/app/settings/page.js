"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Shield, Database, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { showSuccess, showError } from "@/context/ModalContext";

export default function SettingsPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showError("All fields are required");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError("New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showError("New password must be at least 6 characters");
      return;
    }

    const token = localStorage.getItem("token");
    const { apiUrl } = require("@/lib/api");

    try {
      const res = await fetch(apiUrl("/api/auth/change-password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess("Password changed successfully");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } else {
        showError(data.message || "Failed to update password");
      }
    } catch (err) {
      showError("Network connection error");
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SYSTEM SETTINGS" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">
          <div className="max-w-3xl mx-auto">
            {/* Settings Content Area */}
            <motion.div 
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-brand-surface border border-border rounded-[40px] p-8 md:p-12 shadow-sm min-h-[500px] flex flex-col"
            >
                <div className="flex justify-between items-center mb-12">
                  <div>
                    <h2 className="text-3xl font-rajdhani font-bold text-main tracking-tight mb-2 flex items-center gap-3">
                      <Shield size={28} className="text-brand-neonblue" /> SECURITY ENGINE
                    </h2>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[4px]">Configuration Matrix v4.0.2</p>
                  </div>
                </div>

               <div className="space-y-12 flex-1">
                 <form onSubmit={handleSavePassword} className="space-y-6 max-w-md">
                   <div className="space-y-4">
                     <div className="group">
                       <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest block mb-2 px-1">Current Password</label>
                       <div className="relative">
                         <input 
                           type={showCurrentPassword ? "text" : "password"} 
                           value={passwordData.currentPassword} 
                           onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                           className="w-full bg-main/5 border border-border rounded-xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:border-brand-crimson/30 transition-all font-medium text-main" 
                           required
                         />
                         <button
                           type="button"
                           onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
                         >
                           {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                         </button>
                       </div>
                     </div>
                     <div className="group">
                       <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest block mb-2 px-1">New Password</label>
                       <div className="relative">
                         <input 
                           type={showNewPassword ? "text" : "password"} 
                           value={passwordData.newPassword} 
                           onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                           className="w-full bg-main/5 border border-border rounded-xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:border-brand-crimson/30 transition-all font-medium text-main" 
                           required
                         />
                         <button
                           type="button"
                           onClick={() => setShowNewPassword(!showNewPassword)}
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
                         >
                           {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                         </button>
                       </div>
                     </div>
                     <div className="group">
                       <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest block mb-2 px-1">Confirm New Password</label>
                       <div className="relative">
                         <input 
                           type={showConfirmPassword ? "text" : "password"} 
                           value={passwordData.confirmPassword} 
                           onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                           className="w-full bg-main/5 border border-border rounded-xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:border-brand-crimson/30 transition-all font-medium text-main" 
                           required
                         />
                         <button
                           type="button"
                           onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
                         >
                           {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                         </button>
                       </div>
                     </div>
                   </div>
                   <button type="submit" className="px-6 py-3 bg-brand-crimson hover:bg-red-700 rounded-xl text-[10px] font-black uppercase tracking-[2px] text-main transition-all shadow-lg shadow-brand-crimson/20">
                     Update Password
                   </button>
                 </form>
               </div>

               <div className="pt-8 border-t border-border flex justify-between items-center opacity-40">
                 <div className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-widest">
                   <Database size={14} /> Node Sync: Optimal
                 </div>
                 <span className="text-[10px] font-mono text-muted">SEC_CODE: RX-77</span>
               </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
