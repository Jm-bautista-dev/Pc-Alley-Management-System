"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  Percent,
  Search,
  Plus,
  Tag,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

const DISCOUNT_TYPES = ["Percentage (%)", "Fixed Amount (₱)"];

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("pc_alley_discounts") || "[]"); } catch { return []; }
    }
    return [];
  });
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    name: "",
    code: "",
    type: DISCOUNT_TYPES[0],
    value: "",
    min_purchase: "",
    expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    max_uses: "",
    note: ""
  });

  const saveDiscounts = (updated) => {
    setDiscounts(updated);
    localStorage.setItem("pc_alley_discounts", JSON.stringify(updated));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.value) return showError("Fill in all required fields");
    // Check for duplicate codes
    if (discounts.some(d => d.code.toUpperCase() === form.code.toUpperCase())) {
      return showError("Coupon code already exists");
    }
    const newDiscount = {
      id: Date.now(),
      ...form,
      code: form.code.toUpperCase(),
      value: parseFloat(form.value),
      min_purchase: parseFloat(form.min_purchase) || 0,
      max_uses: parseInt(form.max_uses) || null,
      uses: 0,
      active: true,
      createdAt: new Date().toISOString()
    };
    saveDiscounts([newDiscount, ...discounts]);
    showSuccess("Discount created");
    setIsModalOpen(false);
    setForm({ name: "", code: "", type: DISCOUNT_TYPES[0], value: "", min_purchase: "", expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0], max_uses: "", note: "" });
  };

  const handleToggle = (id) => {
    saveDiscounts(discounts.map(d => d.id === id ? { ...d, active: !d.active } : d));
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this discount?")) return;
    saveDiscounts(discounts.filter(d => d.id !== id));
    showSuccess("Discount removed");
  };

  const isExpired = (date) => new Date(date) < new Date();

  const filtered = discounts.filter(d =>
    (d.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.code || "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeCount = discounts.filter(d => d.active && !isExpired(d.expiry_date)).length;
  const totalSaved = discounts.reduce((sum, d) => sum + (d.type === DISCOUNT_TYPES[0] ? 0 : d.value * d.uses), 0);

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="DISCOUNTS" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">

          <div className="mb-6">
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
              Promotions & Coupons
            </motion.h2>
            <h1 className="text-2xl font-rajdhani font-black uppercase">
              DIS<span className="text-yellow-500">COUNTS</span>
            </h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-brand-surface border border-border rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">Total Discounts</p>
              <p className="text-2xl font-rajdhani font-black text-main">{discounts.length}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-brand-surface border border-border rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">Active Codes</p>
              <p className="text-2xl font-rajdhani font-black text-green-500">{activeCount}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-brand-surface border border-border rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">Total Uses</p>
              <p className="text-2xl font-rajdhani font-black text-yellow-500">{discounts.reduce((s, d) => s + (d.uses || 0), 0)}</p>
            </motion.div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search name or code..."
                className="w-full bg-brand-surface border border-border text-main text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-brand-neonblue transition-colors" />
            </div>
            <button onClick={() => setIsModalOpen(true)} className="btn-premium flex items-center gap-2 px-6 py-2.5 rounded-full text-xs ml-auto">
              <Plus size={16} /> New Discount
            </button>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[750px]">
                <thead>
                  <tr className="bg-brand-bgbase/50 text-[10px] font-black uppercase tracking-widest text-muted border-b border-border">
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Code</th>
                    <th className="py-4 px-6">Discount</th>
                    <th className="py-4 px-6">Min Purchase</th>
                    <th className="py-4 px-6">Expiry</th>
                    <th className="py-4 px-6">Uses</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan="8" className="py-20 text-center">
                      <Percent className="mx-auto text-main/10 mb-3" size={36} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                        {search ? "No matching discounts" : 'No discounts yet — click "New Discount" to create one'}
                      </p>
                    </td></tr>
                  ) : paginated.map((d, idx) => {
                    const expired = isExpired(d.expiry_date);
                    const effectivelyActive = d.active && !expired;
                    return (
                      <motion.tr key={d.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-border/30 hover:bg-brand-bgbase/30 transition-colors group">
                        <td className="py-4 px-6 text-sm font-bold text-main">{d.name}</td>
                        <td className="py-4 px-6">
                          <code className="px-2.5 py-1 bg-brand-bgbase border border-border rounded-lg text-[11px] font-mono font-black text-yellow-500">
                            {d.code}
                          </code>
                        </td>
                        <td className="py-4 px-6 font-rajdhani font-black text-main">
                          {d.type === DISCOUNT_TYPES[0] ? `${d.value}%` : `₱${d.value.toLocaleString()}`}
                        </td>
                        <td className="py-4 px-6 text-xs text-muted font-bold">
                          {d.min_purchase > 0 ? `₱${d.min_purchase.toLocaleString()}` : "None"}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5">
                            {expired ? <XCircle size={12} className="text-brand-crimson" /> : <Calendar size={12} className="text-muted" />}
                            <span className={`text-xs font-bold ${expired ? "text-brand-crimson" : "text-muted"}`}>
                              {new Date(d.expiry_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-rajdhani font-black text-main">{d.uses || 0}</span>
                          {d.max_uses && <span className="text-[10px] text-muted font-bold"> / {d.max_uses}</span>}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                            expired ? "text-brand-crimson bg-brand-crimson/10 border-brand-crimson/20"
                              : effectivelyActive ? "text-green-500 bg-green-500/10 border-green-500/20"
                              : "text-muted bg-border/30 border-border"
                          }`}>
                            {expired ? <><XCircle size={10} />Expired</> : effectivelyActive ? <><CheckCircle2 size={10} />Active</> : <><Clock size={10} />Disabled</>}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex gap-2 justify-center">
                            {!expired && (
                              <button onClick={() => handleToggle(d.id)}
                                className={`p-1.5 rounded-lg border transition-all ${d.active ? "border-green-500/30 text-green-500 hover:bg-green-500/10" : "border-border text-muted hover:text-main"}`}>
                                {d.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                              </button>
                            )}
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

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-brand-surface border border-border rounded-[32px] p-8 relative z-10 shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[80px] pointer-events-none" />
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-yellow-500 mb-1">Promotion</p>
                <h3 className="text-xl font-rajdhani font-black uppercase tracking-widest">New Discount</h3>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Name *</label>
                    <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Summer Sale"
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Coupon Code *</label>
                    <input type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. SAVE20"
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main font-mono focus:outline-none focus:border-yellow-500 transition-all uppercase" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all appearance-none">
                      {DISCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Value *</label>
                    <input type="number" required min="0" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                      placeholder={form.type === DISCOUNT_TYPES[0] ? "20" : "100"}
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-yellow-500 transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Min Purchase (₱)</label>
                    <input type="number" min="0" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })}
                      placeholder="0 = no minimum"
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Max Uses</label>
                    <input type="number" min="1" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })}
                      placeholder="Unlimited"
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 rounded-full border border-border text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-[2] py-3.5 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-500 hover:text-black border border-yellow-500/40 rounded-full text-[10px] font-black uppercase tracking-[3px] transition-all active:scale-[0.98]">
                    Create Discount
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
