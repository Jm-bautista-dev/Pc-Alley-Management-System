"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Scissors } from "lucide-react";
import { motion } from "framer-motion";

export default function VariationsPage() {
  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="VARIATIONS" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">
          <div className="flex items-center mb-8">
            <h2 className="text-xl font-rajdhani font-bold flex items-center gap-3 uppercase">
              <Scissors size={24} className="text-brand-neonblue" /> 
              PRODUCT VARIATIONS
            </h2>
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-brand-surface border border-border rounded-2xl p-6 lg:p-10 shadow-sm flex flex-col items-center justify-center min-h-[400px]"
          >
            <Scissors size={48} className="text-muted mb-4 opacity-50" />
            <p className="text-muted font-bold text-sm text-center uppercase tracking-[2px]">Preview Mode: Variation Matrix</p>
            <p className="text-muted/60 text-[10px] mt-4 uppercase tracking-[4px] text-center max-w-xs leading-relaxed">
              Define attribute variants for complex inventory items. Module synchronization pending authorization.
            </p>
            <div className="mt-10 flex gap-4">
              <button 
                onClick={() => alert("System Notice: Variation Core Not Enabled")} 
                className="btn-premium px-8"
              >
                Add Variation
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
