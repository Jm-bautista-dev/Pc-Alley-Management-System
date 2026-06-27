"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  FileEdit,
  Search,
  ShoppingCart,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  Play,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { useRouter } from "next/navigation";

export default function DraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Load drafts from the same storage the POS uses
    try {
      const posDrafts = JSON.parse(localStorage.getItem("pc_alley_pos_drafts") || "[]");
      // Also pull the current cart if it has items
      const cart = JSON.parse(localStorage.getItem("pc_alley_pos_cart") || "[]");
      setDrafts(posDrafts);
    } catch {
      setDrafts([]);
    }
  }, []);

  const saveDrafts = (updated) => {
    setDrafts(updated);
    localStorage.setItem("pc_alley_pos_drafts", JSON.stringify(updated));
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this saved draft?")) return;
    saveDrafts(drafts.filter(d => d.id !== id));
    showSuccess("Draft removed");
  };

  const handleResume = (draft) => {
    // Put the draft cart back into the POS cart
    localStorage.setItem("pc_alley_pos_cart", JSON.stringify(draft.items));
    localStorage.setItem("pc_alley_pos_customer", draft.customer_name || "");
    showSuccess("Draft loaded — redirecting to POS...");
    setTimeout(() => router.push("/sales"), 800);
  };

  const filtered = drafts.filter(d =>
    (d.customer_name || "Walk-in").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalDraftValue = drafts.reduce((sum, d) =>
    sum + (d.items || []).reduce((s, i) => s + (i.price * i.quantity), 0), 0);

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SAVED DRAFTS" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">

          {/* Header */}
          <div className="mb-6">
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
              POS Saved State
            </motion.h2>
            <h1 className="text-2xl font-rajdhani font-black uppercase">
              SAVED <span className="text-yellow-500">DRAFTS</span>
            </h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-brand-surface border border-border rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">Total Drafts</p>
              <p className="text-2xl font-rajdhani font-black text-main">{drafts.length}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-brand-surface border border-border rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">Draft Value</p>
              <p className="text-2xl font-rajdhani font-black text-yellow-500">₱{totalDraftValue.toLocaleString()}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-brand-surface border border-border rounded-2xl p-5 flex flex-col justify-between">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">Start New Sale</p>
              <button onClick={() => router.push("/sales")}
                className="mt-2 btn-premium flex items-center gap-2 text-xs px-4 py-2 rounded-full w-fit">
                <ShoppingCart size={14} /> Open POS
              </button>
            </motion.div>
          </div>

          {/* Info Banner */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <Clock size={16} className="text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-1">How Drafts Work</p>
              <p className="text-xs text-muted font-bold leading-relaxed">
                Drafts are automatically saved when you park a cart in the POS terminal. You can resume any draft to continue the checkout process. Drafts are stored locally on this device.
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search by customer name..."
                className="w-full bg-brand-surface border border-border text-main text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-brand-neonblue transition-colors" />
            </div>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-brand-bgbase/50 text-[10px] font-black uppercase tracking-widest text-muted border-b border-border">
                    <th className="py-4 px-6">Draft #</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Items</th>
                    <th className="py-4 px-6">Saved At</th>
                    <th className="py-4 px-6 text-right">Value</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan="6" className="py-20 text-center">
                      <FileEdit className="mx-auto text-main/10 mb-3" size={36} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                        {search ? "No matching drafts" : "No saved drafts — park a cart in the POS to save a draft"}
                      </p>
                      <button onClick={() => router.push("/sales")}
                        className="mt-4 px-6 py-2.5 bg-brand-surface border border-border rounded-full text-[10px] font-black uppercase tracking-widest text-muted hover:text-main hover:border-brand-neonblue/40 transition-all flex items-center gap-2 mx-auto">
                        <ShoppingCart size={12} /> Open POS Terminal
                      </button>
                    </td></tr>
                  ) : paginated.map((d, idx) => {
                    const value = (d.items || []).reduce((s, i) => s + (i.price * i.quantity), 0);
                    return (
                      <motion.tr key={d.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-border/30 hover:bg-brand-bgbase/30 transition-colors group">
                        <td className="py-4 px-6 font-mono text-[10px] text-muted">DRF-{String(d.id).slice(-5)}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-brand-bgbase border border-border flex items-center justify-center text-[10px] font-bold text-muted">
                              {(d.customer_name || "WI").substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-main">{d.customer_name || "Walk-in"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2 py-0.5 bg-brand-bgbase border border-border rounded text-[9px] font-black text-muted">
                            {(d.items || []).length} Products
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-muted font-bold">
                          {new Date(d.savedAt || d.id).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-4 px-6 text-right font-rajdhani font-black text-yellow-500 text-lg">
                          ₱{value.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => handleResume(d)}
                              className="px-3 py-1.5 rounded-lg bg-brand-neonblue/10 border border-brand-neonblue/30 text-brand-neonblue hover:bg-brand-neonblue hover:text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1">
                              <Play size={10} /> Resume
                            </button>
                            <button onClick={() => handleDelete(d.id)}
                              className="p-1.5 rounded-lg border border-border text-muted hover:text-brand-crimson hover:border-brand-crimson/30 transition-all">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="border-t border-border/50 p-4 flex items-center justify-between bg-brand-bgbase/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted">Page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-border text-muted hover:text-main disabled:opacity-40 disabled:cursor-not-allowed transition-all"><ChevronLeft size={14} /></button>
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-border text-muted hover:text-main disabled:opacity-40 disabled:cursor-not-allowed transition-all"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
