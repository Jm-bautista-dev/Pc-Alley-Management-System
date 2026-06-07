"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion } from "framer-motion";

export default function SellingPriceGroupPage() {
  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SELLING PRICE GROUPS" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">
          <div className="flex items-center mb-8">
            <h2 className="text-xl font-rajdhani font-bold flex items-center gap-3 uppercase">
              <span className="text-brand-neonblue font-bold">₱</span> 
              PRICE GROUP MATRIX
            </h2>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-brand-surface border border-border rounded-2xl p-6 lg:p-10 shadow-sm flex flex-col items-center justify-center min-h-[400px]"
          >
            <span className="text-muted mb-4 opacity-50 font-bold text-5xl">₱</span>
            <p className="text-muted font-bold text-sm text-center uppercase tracking-[2px]">Preview Mode: Selling Price Groups</p>
            <p className="text-muted/60 text-[10px] mt-4 uppercase tracking-[4px] text-center max-w-xs leading-relaxed">
              Configure multi-tier pricing strategies and customer-specific value clusters.
            </p>
            <div className="mt-10 flex gap-4">
              <button 
                onClick={() => alert("System Notice: Price Group Core Not Enabled")} 
                className="btn-premium px-8"
              >
                Add Price Group
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
