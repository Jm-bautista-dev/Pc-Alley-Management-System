"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  CornerDownLeft,
  Search,
  Plus,
  Package,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Undo2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

const RETURN_REASONS = [
  "Defective / Damaged on Arrival",
  "Wrong Item Delivered",
  "Customer Changed Mind",
  "Not As Described",
  "Duplicate Order",
  "Compatibility Issue",
  "Other"
];

const STATUS_CONFIG = {
  Pending:   { color: "text-yellow-500",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  icon: Clock },
  Approved:  { color: "text-green-500",   bg: "bg-green-500/10",   border: "border-green-500/20",   icon: CheckCircle2 },
  Rejected:  { color: "text-brand-crimson", bg: "bg-brand-crimson/10", border: "border-brand-crimson/20", icon: AlertTriangle },
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("pc_alley_returns") || "[]"); } catch { return []; }
    }
    return [];
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewReturn, setViewReturn] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    order_id: "",
    customer_name: "",
    product_name: "",
    quantity: 1,
    reason: RETURN_REASONS[0],
    note: ""
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setCurrentUser(JSON.parse(userData));
  }, []);

  const saveReturns = (updated) => {
    setReturns(updated);
    localStorage.setItem("pc_alley_returns", JSON.stringify(updated));
  };

  const handleSubmitReturn = (e) => {
    e.preventDefault();
    if (!form.order_id || !form.product_name || !form.customer_name) {
      return showError("Please fill in all required fields");
    }
    const newReturn = {
      id: Date.now(),
      ...form,
      status: "Pending",
      createdAt: new Date().toISOString(),
      submittedBy: currentUser?.username || "Unknown"
    };
    saveReturns([newReturn, ...returns]);
    showSuccess("Return request submitted");
    setIsModalOpen(false);
    setForm({ order_id: "", customer_name: "", product_name: "", quantity: 1, reason: RETURN_REASONS[0], note: "" });
  };

  const handleApprove = (id) => {
    saveReturns(returns.map(r => r.id === id ? { ...r, status: "Approved", processedAt: new Date().toISOString() } : r));
    showSuccess("Return approved — inventory will be adjusted");
    setViewReturn(null);
  };

  const handleReject = (id) => {
    saveReturns(returns.map(r => r.id === id ? { ...r, status: "Rejected", processedAt: new Date().toISOString() } : r));
    showSuccess("Return rejected");
    setViewReturn(null);
  };

  const filtered = returns.filter(r => {
    const matchSearch = (r.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.product_name || "").toLowerCase().includes(search.toLowerCase()) ||
      String(r.order_id).includes(search);
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const isSuperAdmin = currentUser?.role === "super_admin";

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="RETURNS" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">

          {/* Header */}
          <div className="mb-6">
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
              Refunds & Returns
            </motion.h2>
            <h1 className="text-2xl font-rajdhani font-black uppercase">
              SELL <span className="text-brand-crimson">RETURNS</span>
            </h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Returns", value: returns.length, color: "text-main" },
              { label: "Pending", value: returns.filter(r => r.status === "Pending").length, color: "text-yellow-500" },
              { label: "Approved", value: returns.filter(r => r.status === "Approved").length, color: "text-green-500" },
              { label: "Rejected", value: returns.filter(r => r.status === "Rejected").length, color: "text-brand-crimson" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-brand-surface border border-border rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">{s.label}</p>
                <p className={`text-2xl font-rajdhani font-black ${s.color}`}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search by customer, product, or order ID..."
                className="w-full bg-brand-surface border border-border text-main text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-brand-neonblue transition-colors" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["All", "Pending", "Approved", "Rejected"].map(s => (
                <button key={s} onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    statusFilter === s ? "bg-brand-neonblue/20 text-brand-neonblue border-brand-neonblue/40" : "bg-brand-surface border-border text-muted hover:text-main"
                  }`}>{s}</button>
              ))}
            </div>
            <button onClick={() => setIsModalOpen(true)}
              className="btn-premium flex items-center gap-2 px-6 py-2.5 rounded-full text-xs ml-auto">
              <Plus size={16} /> New Return
            </button>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-brand-bgbase/50 text-[10px] font-black uppercase tracking-widest text-muted border-b border-border">
                    <th className="py-4 px-6">Return #</th>
                    <th className="py-4 px-6">Order #</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Product</th>
                    <th className="py-4 px-6">Qty</th>
                    <th className="py-4 px-6">Reason</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan="8" className="py-20 text-center">
                      <CornerDownLeft className="mx-auto text-main/10 mb-3" size={36} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                        {search || statusFilter !== "All" ? "No matching returns" : "No return requests yet"}
                      </p>
                    </td></tr>
                  ) : paginated.map((r, idx) => {
                    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.Pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-border/30 hover:bg-brand-bgbase/30 transition-colors group">
                        <td className="py-4 px-6 font-mono text-[10px] text-muted">RET-{String(r.id).slice(-5)}</td>
                        <td className="py-4 px-6 font-mono text-[10px] text-brand-neonblue">#{r.order_id}</td>
                        <td className="py-4 px-6 text-sm font-bold text-main">{r.customer_name}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Package size={12} className="text-muted shrink-0" />
                            <span className="text-sm font-bold text-main truncate max-w-[140px]">{r.product_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-black text-main">{r.quantity}</td>
                        <td className="py-4 px-6">
                          <span className="text-[10px] text-muted font-bold truncate max-w-[120px] block">{r.reason}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            <StatusIcon size={10} />{r.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => setViewReturn(r)}
                              className="p-1.5 rounded-lg border border-border text-muted hover:text-main hover:border-brand-neonblue/40 transition-all">
                              <Eye size={12} />
                            </button>
                            {r.status === "Pending" && isSuperAdmin && (
                              <>
                                <button onClick={() => handleApprove(r.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all">
                                  Approve
                                </button>
                                <button onClick={() => handleReject(r.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-brand-crimson/10 border border-brand-crimson/20 text-brand-crimson hover:bg-brand-crimson hover:text-white text-[9px] font-black uppercase tracking-widest transition-all">
                                  Reject
                                </button>
                              </>
                            )}
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

      {/* Create Return Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-brand-surface border border-border rounded-[32px] p-8 relative z-10 shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-crimson/10 blur-[80px] pointer-events-none" />
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-crimson mb-1">New Request</p>
                <h3 className="text-xl font-rajdhani font-black uppercase tracking-widest">Log Return</h3>
              </div>
              <form onSubmit={handleSubmitReturn} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Order ID *</label>
                    <input type="text" required value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })}
                      placeholder="e.g. 000042"
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Quantity *</label>
                    <input type="number" required min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) })}
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Customer Name *</label>
                  <input type="text" required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="Customer full name"
                    className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Product Name *</label>
                  <input type="text" required value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })}
                    placeholder="Product being returned"
                    className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Return Reason *</label>
                  <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                    className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all appearance-none">
                    {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Additional Notes</label>
                  <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                    rows={2} placeholder="Describe the issue in detail..."
                    className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 rounded-full border border-border text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-[2] py-3.5 bg-brand-crimson hover:bg-red-700 rounded-full text-[10px] font-black uppercase tracking-[3px] text-white shadow-lg shadow-brand-crimson/20 transition-all active:scale-[0.98]">
                    Submit Return
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {viewReturn && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewReturn(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-brand-surface border border-border rounded-[32px] p-8 relative z-10 shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-crimson mb-1">Return Details</p>
                  <h3 className="text-xl font-rajdhani font-black uppercase">RET-{String(viewReturn.id).slice(-5)}</h3>
                </div>
                <button onClick={() => setViewReturn(null)} className="p-2 text-muted hover:text-main"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Customer", value: viewReturn.customer_name },
                  { label: "Order #", value: `#${viewReturn.order_id}` },
                  { label: "Product", value: viewReturn.product_name },
                  { label: "Qty", value: `${viewReturn.quantity} unit(s)` },
                  { label: "Reason", value: viewReturn.reason },
                  { label: "Submitted", value: new Date(viewReturn.createdAt).toLocaleString() },
                ].map(f => (
                  <div key={f.label} className="flex justify-between items-start p-3 rounded-xl bg-brand-bgbase/50 border border-border/30">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">{f.label}</span>
                    <span className="text-sm font-bold text-main text-right max-w-[200px]">{f.value}</span>
                  </div>
                ))}
                {viewReturn.note && (
                  <div className="p-3 rounded-xl bg-brand-bgbase/50 border border-border/30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Notes</p>
                    <p className="text-sm text-main">{viewReturn.note}</p>
                  </div>
                )}
              </div>
              {viewReturn.status === "Pending" && isSuperAdmin && (
                <div className="flex gap-3 mt-6">
                  <button onClick={() => handleReject(viewReturn.id)}
                    className="flex-1 py-3 border border-brand-crimson/30 text-brand-crimson hover:bg-brand-crimson hover:text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all">
                    Reject
                  </button>
                  <button onClick={() => handleApprove(viewReturn.id)}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all">
                    Approve
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
