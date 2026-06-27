"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { DownloadCloud, Info } from "lucide-react";
import { motion } from "framer-motion";

export default function ImportContactsPage() {
  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="IMPORT CONTACTS" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-xl font-rajdhani font-bold flex items-center gap-3 text-main">
              <DownloadCloud size={24} className="text-brand-neonblue" /> 
              Batch Import Contacts
            </h2>
            <p className="text-xs text-muted mt-2">Upload a CSV file to bulk add customers or suppliers into the system.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="lg:col-span-2 bg-brand-surface border border-border rounded-2xl p-6 lg:p-10 shadow-sm"
            >
              <div className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-brand-muted/5 transition-colors cursor-pointer group">
                <div className="w-16 h-16 rounded-full bg-brand-bgbase flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <DownloadCloud size={24} className="text-brand-neonblue" />
                </div>
                <h4 className="font-bold text-sm text-main mb-2">Drag and drop your file here</h4>
                <p className="text-xs text-muted mb-6">or</p>
                <button className="px-6 py-2 bg-brand-bgbase border border-border text-main rounded-lg font-bold text-xs hover:bg-brand-neonblue/10 hover:border-brand-neonblue/50 transition">
                  Browse Files
                </button>
              </div>
              <div className="mt-4 flex justify-between items-center text-xs text-muted">
                <span>Supported format: .csv</span>
                <span className="text-brand-crimson cursor-pointer hover:underline">Download Template File</span>
              </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="bg-brand-surface border border-border rounded-2xl p-6 shadow-sm"
            >
              <h3 className="text-sm font-rajdhani font-bold uppercase text-main tracking-[2px] flex items-center gap-2 mb-6">
                <Info size={16} className="text-brand-neonpurple" /> Import Instructions
              </h3>
              
              <ul className="text-xs text-muted space-y-4">
                <li className="flex gap-2">
                  <span className="font-bold text-main">1.</span>
                  Your CSV data should be in the format provided in the template.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-main">2.</span>
                  The first line of your CSV file should be the column headers as in the template.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-main">3.</span>
                  Required fields MUST be filled: <span className="text-brand-crimson">Contact Type, Name, Mobile</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-main">4.</span>
                  If no group is provided, they will be assigned directly to Regular defaults.
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
