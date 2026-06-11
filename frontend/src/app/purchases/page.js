"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  Download,
  Search,
  ShoppingCart,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileDown,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { useTheme } from "@/context/ThemeContext";

const STATUS_CONFIG = {
  Pending:  { color: "text-yellow-500",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  icon: Clock },
  Approved: { color: "text-green-500",   bg: "bg-green-500/10",   border: "border-green-500/20",   icon: CheckCircle2 },
  Rejected: { color: "text-brand-crimson", bg: "bg-brand-crimson/10", border: "border-brand-crimson/20", icon: XCircle },
};

export default function ListPurchasesPage() {
  const { theme } = useTheme();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setCurrentUser(JSON.parse(userData));
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/restock-requests"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPurchases(await res.json());
      } else {
        showError("Failed to load procurement records");
      }
    } catch {
      showError("Network connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/restock-requests/${id}/approve`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showSuccess("Restock approved & inventory updated");
        fetchPurchases();
        setSelected(null);
      } else {
        const data = await res.json();
        showError(data.message || "Approval failed");
      }
    } catch {
      showError("Network error");
    }
  };

  const handleReject = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/restock-requests/${id}/reject`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showSuccess("Restock request rejected");
        fetchPurchases();
        setSelected(null);
      } else {
        showError("Rejection failed");
      }
    } catch {
      showError("Network error");
    }
  };

  const filtered = purchases.filter(p => {
    const matchesSearch =
      (p.Product?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.Branch?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalCost = purchases
    .filter(p => p.status === "Approved")
    .reduce((sum, p) => sum + Number(p.cost_price || 0) * p.quantity, 0);

  const stats = {
    total: purchases.length,
    pending: purchases.filter(p => p.status === "Pending").length,
    approved: purchases.filter(p => p.status === "Approved").length,
    rejected: purchases.filter(p => p.status === "Rejected").length,
  };

  return (
    <div className={`flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="STOCK PURCHASES" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">

          {/* Header */}
          <div className="mb-6">
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
              Procurement Ledger
            </motion.h2>
            <h1 className="text-2xl font-rajdhani font-black uppercase">
              STOCK <span className="text-brand-crimson">PURCHASES</span>
            </h1>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Requests", value: stats.total, color: "text-main" },
              { label: "Pending", value: stats.pending, color: "text-yellow-500" },
              { label: "Approved", value: stats.approved, color: "text-green-500" },
              { label: "Rejected", value: stats.rejected, color: "text-brand-crimson" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-brand-surface border border-border rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">{s.label}</p>
                <p className={`text-2xl font-rajdhani font-black ${s.color}`}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search product or branch..."
                className="w-full bg-brand-surface border border-border text-main text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-brand-neonblue transition-colors"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["All", "Pending", "Approved", "Rejected"].map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    statusFilter === s
                      ? "bg-brand-neonblue/20 text-brand-neonblue border-brand-neonblue/40"
                      : "bg-brand-surface border-border text-muted hover:text-main"
                  }`}
                >{s}</button>
              ))}
            </div>
            <button
              onClick={fetchPurchases}
              className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-brand-surface border border-border rounded-xl text-xs font-black uppercase tracking-widest text-muted hover:text-main hover:border-brand-neonblue/40 transition-all"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-brand-bgbase/50 text-[10px] font-black uppercase tracking-widest text-muted border-b border-border">
                    <th className="py-4 px-6">Request #</th>
                    <th className="py-4 px-6">Product</th>
                    <th className="py-4 px-6">Branch</th>
                    <th className="py-4 px-6">Qty</th>
                    <th className="py-4 px-6">Cost/Unit</th>
                    <th className="py-4 px-6">Total Cost</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="py-20 text-center text-[10px] font-black uppercase tracking-[4px] text-main/20 animate-pulse">Loading Procurement Records...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan="8" className="py-20 text-center">
                      <Package className="mx-auto text-main/10 mb-3" size={36} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">No procurement records found</p>
                    </td></tr>
                  ) : paginated.map((p, idx) => {
                    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.Pending;
                    const StatusIcon = cfg.icon;
                    const totalCostRow = Number(p.cost_price || 0) * p.quantity;
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                        className="border-b border-border/30 hover:bg-brand-bgbase/30 transition-colors group"
                      >
                        <td className="py-4 px-6 font-mono text-[10px] text-muted">REQ-{String(p.id).padStart(5, "0")}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-bgbase border border-border flex items-center justify-center">
                              <Package size={14} className="text-muted" />
                            </div>
                            <span className="text-sm font-bold text-main truncate max-w-[180px]">{p.Product?.name || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-xs font-bold text-main">
                            <Building2 size={12} className="text-muted shrink-0" />
                            {p.Branch?.name || "—"}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-black text-main">{p.quantity}</td>
                        <td className="py-4 px-6 text-sm font-bold text-muted">
                          {p.cost_price ? `₱${Number(p.cost_price).toLocaleString()}` : "—"}
                        </td>
                        <td className="py-4 px-6 text-sm font-rajdhani font-black text-brand-crimson">
                          {p.cost_price ? `₱${totalCostRow.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            <StatusIcon size={10} />
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {p.status === "Pending" && currentUser?.role === "super_admin" ? (
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => handleApprove(p.id)} className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all">Approve</button>
                              <button onClick={() => handleReject(p.id)} className="px-3 py-1.5 rounded-lg bg-brand-crimson/10 border border-brand-crimson/20 text-brand-crimson hover:bg-brand-crimson hover:text-white text-[9px] font-black uppercase tracking-widest transition-all">Reject</button>
                            </div>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted/40">
                              {p.status === "Pending" ? "Awaiting Admin" : "Processed"}
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-border/50 p-4 flex items-center justify-between bg-brand-bgbase/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                  {filtered.length} records • Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-border text-muted hover:text-main hover:border-brand-neonblue/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-border text-muted hover:text-main hover:border-brand-neonblue/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Approved Cost Summary */}
          {stats.approved > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="mt-6 p-5 bg-brand-surface border border-border rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[3px] text-muted mb-1">Total Approved Procurement Cost</p>
                <p className="text-2xl font-rajdhani font-black text-brand-crimson">₱{totalCost.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-muted mb-1">{stats.approved} Approved Restocks</p>
                <p className="text-xs text-green-500 font-bold">Inventory Updated</p>
              </div>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
