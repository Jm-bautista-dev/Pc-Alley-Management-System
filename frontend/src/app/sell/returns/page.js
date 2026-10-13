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
  RotateCcw,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl, apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";

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
  const [returns, setReturns] = useState([]);
  const [completedSales, setCompletedSales] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewReturn, setViewReturn] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Review Form
  const [reviewDisposition, setReviewDisposition] = useState("refund");
  const [restockResellable, setRestockResellable] = useState(true);

  // Add Return Form
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [itemCondition, setItemCondition] = useState("Unopened / Resellable");
  const [requestedDisposition, setRequestedDisposition] = useState("refund");
  const [returnNotes, setReturnNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) setCurrentUser(JSON.parse(userData));
    } catch (e) {
      console.error("Error reading user session:", e);
    }
    fetchReturns();
    fetchSales();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/sales/returns");
      if (res.ok) {
        const data = await res.json();
        setReturns(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load returns from server:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await apiFetch("/api/sales/history");
      if (res.ok) {
        const data = await res.json();
        setCompletedSales(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load completed sales:", err);
    }
  };

  const selectedSale = completedSales.find(s => String(s.id) === String(selectedSaleId));

  const handleSelectSale = (saleId) => {
    setSelectedSaleId(saleId);
    const sale = completedSales.find(s => String(s.id) === String(saleId));
    if (sale?.OrderItems?.length > 0) {
      setSelectedProduct(sale.OrderItems[0]);
      setReturnQty(1);
    } else {
      setSelectedProduct(null);
    }
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!selectedSale) {
      return toast.error("Please select a valid completed sale");
    }
    if (!selectedProduct) {
      return toast.error("Please select an item from the sale to return");
    }
    const maxQty = selectedProduct.quantity || 1;
    if (returnQty < 1 || returnQty > maxQty) {
      return toast.error(`Quantity must be between 1 and ${maxQty}`);
    }

    setSubmitting(true);
    try {
      const payload = {
        sale_id: selectedSale.id,
        items: [{
          product_id: selectedProduct.product_id,
          quantity: returnQty,
          return_reason: returnReason,
          condition: itemCondition,
          requested_disposition: requestedDisposition
        }],
        notes: returnNotes
      };

      const res = await apiFetch("/api/sales/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Return request ${data.return_number} logged successfully`);
        setIsModalOpen(false);
        resetForm();
        fetchReturns();
      } else {
        toast.error(data.message || "Failed to submit return request");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error submitting return request");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedSaleId("");
    setSelectedProduct(null);
    setReturnQty(1);
    setReturnReason(RETURN_REASONS[0]);
    setItemCondition("Unopened / Resellable");
    setRequestedDisposition("refund");
    setReturnNotes("");
  };

  const handleReviewReturn = async (returnId, status) => {
    try {
      const payload = {
        status,
        disposition: reviewDisposition,
        restock_resellable: status === "Approved" ? restockResellable : false
      };

      const res = await apiFetch(`/api/sales/returns/${returnId}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Return ${status.toLowerCase()} successfully`);
        setReviewModal(null);
        setViewReturn(null);
        fetchReturns();
      } else {
        toast.error(data.message || `Failed to ${status.toLowerCase()} return`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error during review");
    }
  };

  const filtered = returns.filter(r => {
    const custName = r.Customer?.name || "";
    const retNum = r.return_number || `RET-${r.id}`;
    const saleId = String(r.sale_id || "");
    const matchSearch = custName.toLowerCase().includes(search.toLowerCase()) ||
      retNum.toLowerCase().includes(search.toLowerCase()) ||
      saleId.includes(search);
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const canReview = currentUser?.role === "super_admin" || currentUser?.role === "branch_admin";

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="RETURNS" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          {/* Header */}
          <div className="mb-6">
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
              Controlled Return Flow
            </motion.h2>
            <h1 className="text-2xl font-rajdhani font-black uppercase">
              SALE <span className="text-brand-crimson">RETURNS & RESTOCKS</span>
            </h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Returns", value: returns.length, color: "text-main" },
              { label: "Pending Review", value: returns.filter(r => r.status === "Pending").length, color: "text-yellow-500" },
              { label: "Approved / Restocked", value: returns.filter(r => r.status === "Approved").length, color: "text-green-500" },
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
                placeholder="Search return #, customer, sale #..."
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
              <Plus size={16} /> Add Return
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
                    <th className="py-4 px-6">Sale Ref</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Items Count</th>
                    <th className="py-4 px-6">Refund Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="py-16 text-center text-xs font-bold text-muted animate-pulse uppercase tracking-widest">Loading Returns Registry...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan="7" className="py-20 text-center">
                      <CornerDownLeft className="mx-auto text-main/10 mb-3" size={36} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                        {search || statusFilter !== "All" ? "No matching return records" : "No return requests recorded yet"}
                      </p>
                    </td></tr>
                  ) : paginated.map((r, idx) => {
                    const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.Pending;
                    const StatusIcon = cfg.icon;
                    const itemCount = Array.isArray(r.items) ? r.items.reduce((s, it) => s + (it.quantity || 1), 0) : 1;
                    return (
                      <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-border/30 hover:bg-brand-bgbase/30 transition-colors group">
                        <td className="py-4 px-6 font-mono text-xs font-bold text-main">{r.return_number || `RET-${r.id}`}</td>
                        <td className="py-4 px-6 font-mono text-xs text-brand-neonblue">Sale #{r.sale_id}</td>
                        <td className="py-4 px-6 text-sm font-bold text-main">{r.Customer?.name || "Walk-in Customer"}</td>
                        <td className="py-4 px-6 font-black text-main">{itemCount} item(s)</td>
                        <td className="py-4 px-6 font-mono text-sm font-bold text-brand-crimson">
                          ₱{Number(r.refund_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            <StatusIcon size={10} />{r.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => setViewReturn(r)}
                              className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-muted hover:text-main hover:border-brand-neonblue/40 transition-all flex items-center gap-1">
                              <Eye size={12} /> View
                            </button>
                            {r.status === "Pending" && canReview && (
                              <button onClick={() => { setReviewModal(r); setReviewDisposition(r.disposition || "refund"); }}
                                className="px-3 py-1.5 rounded-lg bg-brand-neonblue/10 border border-brand-neonblue/30 text-brand-neonblue hover:bg-brand-neonblue hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                                Review
                              </button>
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
        <Toaster position="bottom-right" />
      </main>

      {/* Add Return Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-brand-surface border border-border rounded-[28px] p-6 lg:p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-crimson mb-1">Controlled Return</p>
                  <h3 className="text-xl font-rajdhani font-black uppercase tracking-wide">Initiate Customer Return</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-muted hover:text-main font-bold">✕</button>
              </div>

              <form onSubmit={handleSubmitReturn} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[2px] text-muted ml-1">Select Completed Sale *</label>
                  <select
                    value={selectedSaleId}
                    onChange={(e) => handleSelectSale(e.target.value)}
                    required
                    className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all"
                  >
                    <option value="">-- Select Completed Sale --</option>
                    {completedSales.map(s => (
                      <option key={s.id} value={s.id}>
                        Sale #{s.id} — {s.Customer?.name || "Walk-in"} (₱{Number(s.total_amount).toLocaleString()}) - {new Date(s.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSale && (
                  <>
                    <div className="p-3 rounded-xl bg-brand-bgbase/60 border border-border text-xs">
                      <p className="font-bold text-main">Customer: {selectedSale.Customer?.name || "Walk-in Customer"}</p>
                      <p className="text-[10px] text-muted">Items purchased in this transaction: {selectedSale.OrderItems?.length || 0}</p>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[2px] text-muted ml-1">Item to Return *</label>
                      <select
                        value={selectedProduct ? selectedProduct.product_id : ""}
                        onChange={(e) => {
                          const item = selectedSale.OrderItems?.find(it => String(it.product_id) === String(e.target.value));
                          setSelectedProduct(item);
                          setReturnQty(1);
                        }}
                        required
                        className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all"
                      >
                        {selectedSale.OrderItems?.map(it => (
                          <option key={it.id || it.product_id} value={it.product_id}>
                            {it.Product?.name || `Product #${it.product_id}`} (Qty Sold: {it.quantity}, Price: ₱{Number(it.unit_price).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[2px] text-muted ml-1">
                          Return Quantity (Max: {selectedProduct?.quantity || 1}) *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max={selectedProduct?.quantity || 1}
                          value={returnQty}
                          onChange={e => setReturnQty(parseInt(e.target.value) || 1)}
                          className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[2px] text-muted ml-1">Item Condition *</label>
                        <select
                          value={itemCondition}
                          onChange={e => setItemCondition(e.target.value)}
                          className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all"
                        >
                          <option value="Unopened / Resellable">Unopened / Resellable</option>
                          <option value="Opened / Good Condition">Opened / Good Condition</option>
                          <option value="Defective / Damaged">Defective / Damaged</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[2px] text-muted ml-1">Reason *</label>
                        <select
                          value={returnReason}
                          onChange={e => setReturnReason(e.target.value)}
                          className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all"
                        >
                          {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[2px] text-muted ml-1">Requested Outcome *</label>
                        <select
                          value={requestedDisposition}
                          onChange={e => setRequestedDisposition(e.target.value)}
                          className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all"
                        >
                          <option value="refund">Refund Payment</option>
                          <option value="exchange">Exchange Item</option>
                          <option value="restock">Inspection & Restock</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[2px] text-muted ml-1">Notes & Defect Description</label>
                      <textarea
                        value={returnNotes}
                        onChange={e => setReturnNotes(e.target.value)}
                        rows={2}
                        placeholder="Detailed inspection notes..."
                        className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-xl py-2.5 px-4 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all resize-none"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4 border-t border-border">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-border text-[10px] font-black uppercase tracking-[2px] text-muted hover:text-main transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting || !selectedSale}
                    className="flex-[2] py-3 bg-brand-crimson hover:bg-red-700 disabled:opacity-50 rounded-xl text-[10px] font-black uppercase tracking-[2px] text-white transition-all shadow-md">
                    {submitting ? "Logging Return..." : "Submit Return Request"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setReviewModal(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-brand-surface border border-border rounded-[28px] p-6 lg:p-8 relative z-10 shadow-2xl">
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-border">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue mb-1">Supervisor Review</p>
                  <h3 className="text-xl font-rajdhani font-black uppercase">{reviewModal.return_number || `RET-${reviewModal.id}`}</h3>
                </div>
                <button onClick={() => setReviewModal(null)} className="p-2 text-muted hover:text-main font-bold">✕</button>
              </div>

              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-brand-bgbase/60 border border-border text-xs space-y-1">
                  <p><span className="text-muted">Sale Ref:</span> Sale #{reviewModal.sale_id}</p>
                  <p><span className="text-muted">Customer:</span> {reviewModal.Customer?.name || "Walk-in"}</p>
                  <p><span className="text-muted">Refund Total:</span> ₱{Number(reviewModal.refund_amount || 0).toLocaleString()}</p>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-[2px] text-muted ml-1">Authorized Disposition</label>
                  <select
                    value={reviewDisposition}
                    onChange={(e) => setReviewDisposition(e.target.value)}
                    className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-xl py-2.5 px-3.5 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all"
                  >
                    <option value="refund">Approve Refund</option>
                    <option value="exchange">Approve Exchange</option>
                    <option value="restock">Restock to Inventory</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-brand-bgbase/40 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="restockCheck"
                    checked={restockResellable}
                    onChange={(e) => setRestockResellable(e.target.checked)}
                    className="mt-1 accent-brand-neonblue cursor-pointer"
                  />
                  <label htmlFor="restockCheck" className="text-xs text-main cursor-pointer">
                    <span className="font-bold block">Restock Item into Branch Inventory</span>
                    <span className="text-[10px] text-muted block mt-0.5">
                      Only check this if the item was inspected and verified resellable.
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <button onClick={() => handleReviewReturn(reviewModal.id, "Rejected")}
                    className="flex-1 py-3 border border-brand-crimson/40 text-brand-crimson hover:bg-brand-crimson hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    Reject Return
                  </button>
                  <button onClick={() => handleReviewReturn(reviewModal.id, "Approved")}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md">
                    Approve Return
                  </button>
                </div>
              </div>
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
              className="w-full max-w-md bg-brand-surface border border-border rounded-[28px] p-6 lg:p-8 relative z-10 shadow-2xl">
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-border">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-crimson mb-1">Return Summary</p>
                  <h3 className="text-xl font-rajdhani font-black uppercase">{viewReturn.return_number || `RET-${viewReturn.id}`}</h3>
                </div>
                <button onClick={() => setViewReturn(null)} className="p-2 text-muted hover:text-main font-bold">✕</button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between p-3 rounded-xl bg-brand-bgbase/50 border border-border/30">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">Customer</span>
                  <span className="text-xs font-bold text-main">{viewReturn.Customer?.name || "Walk-in Customer"}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-brand-bgbase/50 border border-border/30">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">Sale Reference</span>
                  <span className="text-xs font-bold text-brand-neonblue">Sale #{viewReturn.sale_id}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-brand-bgbase/50 border border-border/30">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">Status</span>
                  <span className="text-xs font-bold uppercase">{viewReturn.status}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-brand-bgbase/50 border border-border/30">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">Refund Amount</span>
                  <span className="text-xs font-bold text-brand-crimson">₱{Number(viewReturn.refund_amount || 0).toLocaleString()}</span>
                </div>
                {viewReturn.notes && (
                  <div className="p-3 rounded-xl bg-brand-bgbase/50 border border-border/30">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Notes</p>
                    <p className="text-xs text-main">{viewReturn.notes}</p>
                  </div>
                )}
              </div>
              <div className="pt-6 mt-4 border-t border-border flex justify-end">
                <button onClick={() => setViewReturn(null)} className="px-6 py-2.5 rounded-xl bg-brand-bgbase border border-border text-xs font-bold text-main hover:bg-brand-surface uppercase tracking-wider">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
