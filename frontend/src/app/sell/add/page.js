"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { PlusCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Page() {
  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="ADD SALE" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">
          <div className="flex items-center mb-8">
            <h2 className="text-xl font-rajdhani font-bold flex items-center gap-3 uppercase">
              <PlusCircle size={24} className="text-brand-neonblue" /> 
              ADD SALE
            </h2>
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-brand-surface border border-border rounded-2xl p-6 lg:p-10 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
            <PlusCircle size={48} className="text-muted mb-4 opacity-50" />
            <p className="text-muted font-bold text-sm text-center">Preview Mode: ADD SALE</p>
            <p className="text-muted/60 text-xs mt-2 uppercase tracking-widest text-center">Create a new sale record.</p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
