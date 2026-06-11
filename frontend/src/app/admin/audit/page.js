"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { ClipboardList, Clock, User, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { apiUrl } from "@/lib/api";

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/audit"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SYSTEM AUDIT LOGS" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <ShieldAlert className="text-brand-crimson" size={24} />
            <h1 className="text-xl font-rajdhani font-black text-main uppercase tracking-[4px]">Audit Trail</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-surface border border-border rounded-2xl p-6 lg:p-8 shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-main/40 border-b border-border">
                    <th className="pb-4 pr-4">Timestamp</th>
                    <th className="pb-4 px-4">Operator</th>
                    <th className="pb-4 px-4">Action Designation</th>
                    <th className="pb-4 px-4">Detailed Metrics</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="py-20 text-center text-muted uppercase tracking-[4px] text-[10px]">Synchronizing Audit Trail...</td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-20 text-center text-muted uppercase tracking-[4px] text-[10px]">No Security Logs Recorded</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b border-border hover:bg-brand-muted/5 transition-colors">
                        <td className="py-4 pr-4 font-mono text-[10px] text-muted tracking-tight">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 font-bold text-brand-neonblue">
                          {log.User?.username || "SYSTEM"}
                        </td>
                        <td className="py-4 px-4 font-black uppercase tracking-wider text-[11px]">
                          {log.action}
                        </td>
                        <td className="py-4 px-4 text-muted text-[11px] font-medium italic">
                          {log.details || "No additional parameters recorded"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
