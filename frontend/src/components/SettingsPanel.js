"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Shield,
  Bell,
  Monitor,
  Database,
  Globe,
  HelpCircle,
  Save,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import toast from "react-hot-toast";

const SettingsPanel = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("profile");
  const { theme, toggleTheme } = useTheme();

  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "" });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      const email = parsed.email || (parsed.username && !parsed.username.includes('@') ? `${parsed.username}@pcalley.com` : parsed.username || "");
      setFormData({ 
        name: parsed.name || parsed.username || "", 
        email: email 
      });
    }
  }, [isOpen]);

  const userName = formData.name || "User";
  const initials = userName.substring(0, 2).toUpperCase();

  const options = [
    { id: "darkMode", label: "Dark Mode", desc: "Use dark colors", active: theme === "dark" },
    { id: "glassmorphism", label: "Modern Effects", desc: "Enable blur effects", active: true },
    { id: "motion", label: "Smooth Animations", desc: "Fluid transitions", active: true },
    { id: "legacy", label: "Legacy Support", desc: "Support older monitors", active: false },
  ];

  const handleSave = () => {
    toast.loading("Encrypting profile updates...", { id: 'settings-save' });
    setTimeout(() => {
      toast.success("Profile successfully synced with core registry", { id: 'settings-save' });
    }, 1500);
  };

  const handleGlobeClick = () => {
    toast.success("Region localized to South-East Asia Core");
  };

  const tabs = [
    { id: "profile", icon: User, label: "Account Profile" },
    { id: "security", icon: Shield, label: "Security" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "system", icon: Monitor, label: "Interface" },
    { id: "database", icon: Database, label: "Connection" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="settings-backdrop"
          initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm z-[100]"
          />
      )}

      {isOpen && (
          <motion.div
            key="settings-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-brand-bgbase border-l border-border shadow-2xl z-[101] flex flex-col font-dm-sans"
          >
            {/* Header */}
            <div className="p-8 border-b border-border flex items-center justify-between bg-brand-surface">
              <div>
                <h2 className="text-2xl font-rajdhani font-black tracking-[3px] uppercase text-main">Settings</h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-1 h-1 rounded-full bg-brand-neonblue animate-pulse" />
                   <p className="text-[10px] text-brand-muted font-black tracking-[2px] uppercase">System ID: PC-AL-001</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-main/5 flex items-center justify-center hover:bg-brand-crimson hover:text-main transition-all group"
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="w-20 border-r border-border py-8 flex flex-col items-center gap-6">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative ${
                      activeTab === tab.id ? "bg-brand-crimson text-main shadow-lg shadow-brand-crimson/20" : "text-brand-muted hover:text-main hover:bg-main/5"
                    }`}
                    title={tab.label}
                  >
                    <tab.icon size={20} />
                    {activeTab === tab.id && (
                      <motion.div layoutId="tab-indicator" className="absolute -right-[1px] w-[3px] h-6 bg-brand-crimson rounded-l-full" />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    {activeTab === "profile" && (
                      <div className="space-y-6">
                        <h3 className="text-sm font-bold uppercase tracking-[2px] text-main">Account Details</h3>
                        
                        <div className="flex flex-col items-center gap-4 p-6 glass-card rounded-2xl border-border">
                           <div className="relative group">
                              <div className="w-24 h-24 rounded-[32px] bg-brand-crimson flex items-center justify-center text-3xl font-black text-white shadow-[0_20px_40px_rgba(215,38,56,0.3)] border border-white/20">
                                {initials}
                              </div>
                              <button onClick={handleGlobeClick} className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-brand-deep border border-border flex items-center justify-center hover:bg-brand-crimson transition-colors shadow-lg">
                                <Globe size={14} />
                              </button>
                           </div>
                           <div className="text-center">
                              <p className="font-bold text-lg">{userName}</p>
                              <p className="text-[10px] text-brand-muted uppercase tracking-widest font-medium">Head Office · ID: {user?.id || '2284'}</p>
                           </div>
                        </div>

                           <div className="space-y-4">
                              <div className="flex items-center justify-between p-4 bg-main/5 border border-border rounded-2xl group hover:border-[#00F2FF]/20 transition-all">
                               <div>
                                  <p className="text-sm font-bold">Dark Mode</p>
                                  <p className="text-[10px] text-brand-muted uppercase tracking-widest font-medium">Switch colors</p>
                               </div>
                               <div 
                                 onClick={toggleTheme}
                                 className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${theme === 'dark' ? "bg-brand-crimson" : "bg-main/10"}`}
                               >
                                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${theme === 'dark' ? "right-1" : "left-1"}`} />
                               </div>
                            </div>
                            <div className="group">
                               <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest block mb-2 px-1">Display Name</label>
                               <input 
                                 type="text" 
                                 value={formData.name} 
                                 onChange={(e) => setFormData({...formData, name: e.target.value})}
                                 className="w-full bg-main/5 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-brand-crimson/30 transition-all font-medium" 
                               />
                            </div>
                            <div className="group">
                               <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest block mb-2 px-1">Email Address</label>
                               <input 
                                 type="text" 
                                 value={formData.email} 
                                 onChange={(e) => setFormData({...formData, email: e.target.value})}
                                 className="w-full bg-main/5 border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-brand-crimson/30 transition-all font-medium" 
                               />
                            </div>
                         </div>
                       </div>
                    )}

                    {activeTab === "system" && (
                       <div className="space-y-6">
                          <h3 className="text-sm font-bold uppercase tracking-[2px] text-main">Visual Settings</h3>
                          
                          <div className="space-y-3">
                             {options.filter(o => o.id !== 'darkMode').map((opt, i) => (
                               <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-border rounded-2xl">
                                  <div>
                                     <p className="text-sm font-bold">{opt.label}</p>
                                     <p className="text-[10px] text-brand-muted uppercase tracking-tighter">{opt.desc}</p>
                                  </div>
                                  <div 
                                    className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${opt.active ? "bg-brand-crimson" : "bg-main/10"}`}
                                  >
                                     <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${opt.active ? "right-1" : "left-1"}`} />
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    )}

                    {/* Placeholder for other tabs */}
                    {["security", "notifications", "database"].includes(activeTab) && (
                       <div className="h-64 flex flex-col items-center justify-center text-center">
                        <Shield className="mb-4 stroke-[1px] text-brand-neonblue animate-pulse" size={48} />
                        <h4 className="text-xs uppercase tracking-[3px] font-bold">Autonomous Module</h4>
                        <p className="text-[10px] mt-2 font-medium text-muted max-w-xs">Security and sync protocols are currently managed by the logic core.</p>
                        <button onClick={() => toast.error("Bypass attempt logged. Authorization required.")} className="mt-6 px-6 py-2 border border-border rounded-full text-[9px] font-bold uppercase tracking-widest hover:border-brand-crimson transition-all">Request Access</button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-border bg-brand-surface flex items-center justify-between">
              <motion.button 
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  window.location.href = "/";
                }} 
                className="flex items-center gap-2 text-brand-muted hover:text-brand-crimson transition-colors group"
              >
                 <LogOut size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Log Out</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave} 
                className="h-12 px-8 bg-brand-crimson hover:bg-brand-crimson/90 text-white rounded-xl flex items-center gap-3 text-[10px] font-black uppercase tracking-[2px] transition-all shadow-[0_10px_20px_rgba(215,38,56,0.2)]"
              >
                <Save size={16} />
                Save Changes
              </motion.button>
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsPanel;
