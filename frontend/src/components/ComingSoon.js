"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function ComingSoon({ title = "Module Under Construction", description = "This feature is currently being designed and implemented by our engineering team. Central Core connection will be initialized soon.", Icon = ShieldAlert }) {
  const router = useRouter();

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title={title.toUpperCase()} />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          
          <div className="flex items-center mb-8">
            <h2 className="text-xl font-rajdhani font-bold flex items-center gap-3 uppercase">
              <Icon size={24} className="text-brand-crimson" /> 
              {title}
            </h2>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-brand-surface border border-border rounded-[24px] p-8 lg:p-16 shadow-[0_0_50px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden"
          >
            {/* Glowing Accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-crimson/5 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-neonblue/5 blur-[80px] pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-brand-crimson/10 border border-brand-crimson/20 flex items-center justify-center mb-6">
              <Icon size={32} className="text-brand-crimson animate-pulse" />
            </div>

            <h3 className="text-lg md:text-xl font-rajdhani font-black uppercase tracking-[3px] text-main text-center mb-3">
              Module Restructuring
            </h3>
            
            <p className="text-xs text-brand-neonblue/80 font-black uppercase tracking-[4px] text-center mb-4">
              Uplink offline
            </p>

            <p className="text-muted/80 text-xs md:text-sm font-semibold text-center max-w-md leading-relaxed mb-8">
              {description}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/dashboard")} 
                className="btn-premium px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2"
              >
                <ArrowLeft size={14} /> Return to Core
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()} 
                className="btn-ghost px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest border-border/10 text-muted hover:text-main"
              >
                Previous Grid
              </motion.button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
