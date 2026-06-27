"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Users2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

export default function HrmPage() {
  const router = useRouter();
  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="HUMAN RESOURCES" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <Users2 className="text-brand-crimson" size={24} />
            <h1 className="text-xl font-rajdhani font-black text-main uppercase tracking-[4px]">Team Members</h1>
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="glass-card p-10 lg:p-20 flex flex-col items-center justify-center min-h-[500px]"
          >
            <Users2 size={48} className="text-main/10 mb-8" />
            <p className="text-main font-black text-sm text-center uppercase tracking-[2px]">HR Dashboard</p>
            <p className="text-main/30 text-[10px] mt-4 uppercase tracking-[4px] text-center max-w-xs leading-relaxed mb-10">Manage your staff, payroll, and team records from this central dashboard. All nodes operational.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button onClick={() => router.push("/staff")} className="btn-premium px-8">
                Add New Staff
              </button>
              <button onClick={() => showSuccess("Payroll Matrix Synchronized: Automated distribution queued")} className="btn-ghost px-8 border-border/10">
                Process Payroll
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}