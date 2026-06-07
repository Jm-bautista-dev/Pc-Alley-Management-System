"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Settings, Bell, Shield, Palette, Layout, Save, Terminal, Database, Check } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Interface");
  const [glassmorphism, setGlassmorphism] = useState(true);

  const tabs = [
    { id: "Interface", icon: Palette },
    { id: "Security", icon: Shield },
    { id: "Notifications", icon: Bell },
    { id: "Core Sync", icon: Database },
  ];

  const handleDeploy = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Compiling Configuration Matrix...',
        success: 'Settings Deployed to Logical Core',
        error: 'Uplink synchronization failed',
      }
    );
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SYSTEM SETTINGS" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
            {/* Settings Navigation */}
            <div className="lg:w-64 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[2px] border transition-all ${
                    activeTab === tab.id
                      ? "bg-brand-neonblue/10 border-brand-neonblue/40 text-brand-neonblue shadow-sm"
                      : "bg-brand-surface border-border text-muted hover:text-main"
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.id}
                </button>
              ))}
            </div>

            {/* Settings Content Area */}
            <motion.div 
               key={activeTab}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex-1 bg-brand-surface border border-border rounded-[40px] p-8 md:p-12 shadow-sm min-h-[500px] flex flex-col"
            >
               <div className="flex justify-between items-center mb-12">
                 <div>
                   <h2 className="text-3xl font-rajdhani font-bold text-main tracking-tight mb-2">{activeTab.toUpperCase()} ENGINE</h2>
                   <p className="text-[10px] font-bold text-muted uppercase tracking-[4px]">Configuration Matrix v4.0.2</p>
                 </div>
                 <button onClick={handleDeploy} className="flex items-center gap-2 px-6 py-3 bg-brand-crimson hover:bg-red-700 rounded-xl text-[10px] font-black uppercase tracking-[2px] text-main transition-all shadow-lg shadow-brand-crimson/20">
                   <Save size={16} /> Deploy Config
                 </button>
               </div>

               <div className="space-y-12 flex-1">
                 {activeTab === "Interface" && (
                   <div className="space-y-8">
                     <div className="p-6 bg-brand-bgbase border border-border rounded-2xl">
                       <h4 className="text-[11px] font-black text-muted uppercase tracking-widest mb-6">Visual Core Theme</h4>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                         {["Matrix Dark", "Clinical Light", "High Contrast"].map((t, i) => (
                           <button 
                             onClick={() => toast.success(`${t} loaded successfully`)} 
                             key={i} 
                             className={`p-4 rounded-xl border border-border text-[10px] font-bold transition-all ${i === 0 ? "bg-brand-neonblue/5 border-brand-neonblue/30 text-brand-neonblue" : "hover:bg-brand-surface"}`}
                           >
                             {t}
                           </button>
                         ))}
                       </div>
                     </div>

                     <div className="flex items-center justify-between p-6 bg-brand-bgbase border border-border rounded-2xl">
                       <div>
                         <h4 className="text-[11px] font-black text-main uppercase tracking-widest mb-1">Glassmorphism Overlay</h4>
                         <p className="text-[10px] text-muted font-medium">Enable real-time backdrop blur on primary modules</p>
                       </div>
                       <div 
                         onClick={() => setGlassmorphism(!glassmorphism)}
                         className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${glassmorphism ? 'bg-brand-neonblue/20' : 'bg-main/10'}`}
                       >
                         <motion.div 
                           animate={{ x: glassmorphism ? 24 : 0 }}
                           className={`w-4 h-4 rounded-full ${glassmorphism ? 'bg-brand-neonblue' : 'bg-muted'}`} 
                         />
                       </div>
                     </div>
                   </div>
                 )}

                 {activeTab !== "Interface" && (
                   <div className="h-full flex flex-col items-center justify-center text-center py-20">
                     <Terminal size={64} className="mb-6 stroke-[1px] text-brand-neonpurple animate-pulse" />
                     <h4 className="text-[12px] font-black uppercase tracking-[4px]">Module Operational</h4>
                     <p className="text-[10px] mt-2 font-bold leading-tight max-w-xs text-muted">Advanced {activeTab} parameters are currently managed by automated logic flows.</p>
                     <button onClick={() => toast.error("Override Denied: Super Admin biometric required")} className="mt-8 px-6 py-2 border border-border rounded-full text-[9px] font-bold uppercase tracking-widest hover:border-brand-neonpurple transition-all">Manual Override</button>
                   </div>
                 )}
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
