"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { PlusCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function AddPurchasePage() {
  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="ADD PURCHASE" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">
          <div className="flex items-center mb-8">
            <h2 className="text-xl font-rajdhani font-bold flex items-center gap-3">
              <PlusCircle size={24} className="text-green-500" /> 
              Add New Purchase Record
            </h2>
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-10 lg:p-12 shadow-sm max-w-4xl">
            <p className="text-main font-black text-[10px] uppercase tracking-[3px] mb-8 border-b border-border/10 pb-6 opacity-40">Entry Parameters: Purchase Matrix</p>
            <div className="space-y-6 text-xs text-main">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-bgbase p-4 rounded-xl border border-border">Supplier Info Field</div>
                  <div className="bg-brand-bgbase p-4 rounded-xl border border-border">Purchase Date Field</div>
                  <div className="bg-brand-bgbase p-4 rounded-xl border border-border">Reference No Field</div>
                  <div className="bg-brand-bgbase p-4 rounded-xl border border-border">Purchase Status Field</div>
               </div>
               <div className="bg-brand-bgbase h-32 rounded-xl flex items-center justify-center font-bold uppercase tracking-widest border border-dashed border-border mt-6">
                 [Item Selection Matrix]
               </div>
            </div>
            <div className="mt-8 flex justify-end">
               <button className="px-6 py-2 bg-brand-crimson text-white rounded-lg font-bold text-xs hover:bg-opacity-80 transition">
                 Save Purchase
               </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
