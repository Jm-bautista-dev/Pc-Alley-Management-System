"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClipboardList, 
  Search, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw,
  Trash2,
  Plus,
  Package,
  Layers,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  FileText,
  X
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [user, setUser] = useState(null);

  // New Request Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [quantityRequested, setQuantityRequested] = useState(1);
  const [priority, setPriority] = useState("normal");
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Details Drawer state
  const [activeRequest, setActiveRequest] = useState(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {}
    }
    fetchRequests();
    fetchProducts();
    fetchBranches();
  }, []);

  const fetchRequests = async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const res = await fetch(apiUrl("/api/product-requests"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(Array.isArray(data) ? data : []);
      } else {
        showError(data.message || "Failed to fetch stock requests.");
      }
    } catch (err) {
      console.error(err);
      showError("Connection failure: Could not retrieve your stock requests.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/products"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Products fetch error:", err);
    }
  };

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Branches fetch error:", err);
    }
  };

  // Submit New Stock Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!selectedProductId) {
      showError("Please select a product to request.");
      return;
    }
    if (!quantityRequested || quantityRequested < 1) {
      showError("Quantity must be at least 1 unit.");
      return;
    }

    const token = localStorage.getItem("token");
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/product-requests"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [{ product_id: parseInt(selectedProductId, 10), quantity_requested: parseInt(quantityRequested, 10) }],
          source_branch_id: sourceBranchId ? parseInt(sourceBranchId, 10) : null,
          priority,
          notes: notes.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Stock request ${data.request_number} submitted! Pending Super Admin review.`);
        setShowCreateModal(false);
        setSelectedProductId("");
        setProductSearch("");
        setQuantityRequested(1);
        setNotes("");
        fetchRequests();
      } else {
        showError(data.message || "Failed to submit stock request.");
      }
    } catch (err) {
      showError("Error submitting stock request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Pending Request
  const handleCancelRequest = async (id, requestNumber) => {
    const confirmed = await showConfirm(
      "Cancel Stock Request",
      `Are you sure you want to cancel request ${requestNumber}? This action cannot be undone.`,
      { danger: true, confirmLabel: "Cancel Request" }
    );
    if (!confirmed) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${id}/cancel`), {
        method: "PATCH",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Stock request ${requestNumber} cancelled.`);
        fetchRequests();
      } else {
        showError(data.message || "Failed to cancel request.");
      }
    } catch (err) {
      showError("Error cancelling request.");
    }
  };

  const tabs = ["All", "Pending", "Approved", "Processing", "Fulfilled", "Rejected", "Cancelled"];

  const filteredRequests = requests.filter(r => {
    const statusUpper = (r.status || "").toUpperCase();
    const reqNum = (r.request_number || "").toLowerCase();
    const prodName = (r.Product?.name || "").toLowerCase();
    const prodSku = (r.Product?.sku || "").toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = !q || reqNum.includes(q) || prodName.includes(q) || prodSku.includes(q);

    let matchesTab = true;
    if (activeTab === "Pending") matchesTab = statusUpper === "PENDING";
    else if (activeTab === "Approved") matchesTab = statusUpper === "APPROVED" || statusUpper === "PARTIALLY_APPROVED";
    else if (activeTab === "Processing") matchesTab = statusUpper === "PROCESSING" || statusUpper === "SCHEDULED";
    else if (activeTab === "Fulfilled") matchesTab = statusUpper === "FULFILLED" || statusUpper === "COMPLETED";
    else if (activeTab === "Rejected") matchesTab = statusUpper === "REJECTED";
    else if (activeTab === "Cancelled") matchesTab = statusUpper === "CANCELLED";

    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "PENDING":
        return { label: "Pending Review", cls: "text-amber-400 border-amber-400/20 bg-amber-400/10", dot: "bg-amber-400" };
      case "APPROVED":
        return { label: "Approved", cls: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10", dot: "bg-emerald-400" };
      case "PARTIALLY_APPROVED":
        return { label: "Partially Approved", cls: "text-lime-400 border-lime-400/20 bg-lime-400/10", dot: "bg-lime-400" };
      case "PROCESSING":
      case "SCHEDULED":
        return { label: "Processing / Transit", cls: "text-cyan-400 border-cyan-400/20 bg-cyan-400/10", dot: "bg-cyan-400" };
      case "FULFILLED":
      case "COMPLETED":
        return { label: "Fulfilled", cls: "text-teal-400 border-teal-400/20 bg-teal-400/10", dot: "bg-teal-400" };
      case "REJECTED":
        return { label: "Rejected", cls: "text-rose-400 border-rose-400/20 bg-rose-400/10", dot: "bg-rose-400" };
      case "CANCELLED":
        return { label: "Cancelled", cls: "text-muted border-border bg-brand-surface/30", dot: "bg-muted" };
      default:
        return { label: status, cls: "text-muted border-border bg-brand-surface", dot: "bg-muted" };
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "urgent":
        return "text-rose-400 border-rose-400/20 bg-rose-400/10";
      case "normal":
        return "text-cyan-400 border-cyan-400/20 bg-cyan-400/10";
      case "low":
        return "text-muted border-border bg-brand-surface/30";
      default:
        return "text-muted border-border bg-brand-surface";
    }
  };

  const filteredProducts = products.filter(p => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (p.name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
  });

  const selectedProduct = products.find(p => String(p.id) === String(selectedProductId));

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="STOCK REQUISITIONS" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container py-8">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black tracking-[3px] uppercase text-brand-neonblue bg-brand-neonblue/10 px-2.5 py-0.5 rounded">
                    Branch to Central Logistics
                  </span>
                  <span className="text-[10px] text-muted">Super Admin Review & Approval Required</span>
                </div>
                <h1 className="text-2xl font-rajdhani font-black uppercase tracking-wide">
                  STOCK <span className="text-brand-neonblue">REQUISITIONS</span>
                </h1>
                <p className="text-xs text-muted font-medium mt-1">
                  Request products from Central Warehouse. Only Super Admin can authorize and fulfill stock transfers.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowCreateModal(true)}
                  className="h-10 px-4 rounded-xl bg-brand-neonblue text-white dark:text-brand-navy font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={16} /> New Stock Request
                </motion.button>
                <button
                  onClick={fetchRequests}
                  className="btn-ghost h-10 px-3 text-xs uppercase tracking-wider flex items-center gap-1"
                >
                  <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Search + Tab filters */}
            <div className="bg-brand-surface border border-border rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
              <div className="relative group w-full md:w-80">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-main/30 group-focus-within:text-brand-neonblue transition-colors">
                  <Search size={15} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Request #, Product or SKU..."
                  className="w-full bg-brand-bgbase border border-border rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-main focus:outline-none focus:border-brand-neonblue/40 transition-all shadow-sm"
                />
              </div>

              {/* Tabs */}
              <div className="flex gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                      activeTab === tab 
                        ? "bg-brand-neonblue text-white dark:text-brand-navy shadow-sm" 
                        : "text-muted hover:text-main hover:bg-brand-bgbase"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Requests */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-2 border-border border-t-brand-neonblue rounded-full animate-spin mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-muted">Retrieving requisitions...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-brand-surface border border-dashed border-border rounded-2xl">
                <ClipboardList size={40} className="text-main/15 mb-3" />
                <h3 className="text-sm font-black uppercase tracking-wider text-main">No Stock Requests Found</h3>
                <p className="text-xs text-muted mt-1">Submit a new request to replenish branch inventory.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredRequests.map((req) => {
                  const statusInfo = getStatusBadge(req.status);
                  const isPending = (req.status || "").toUpperCase() === "PENDING";
                  const isRejected = (req.status || "").toUpperCase() === "REJECTED";

                  return (
                    <motion.div
                      key={req.id}
                      layoutId={`req-card-${req.id}`}
                      className="bg-brand-surface border border-border rounded-2xl p-5 shadow-sm hover:border-brand-neonblue/20 transition-all flex flex-col md:grid md:grid-cols-[1.4fr,1fr,1.4fr,1.2fr] gap-4 items-center"
                    >
                      {/* ID & Product */}
                      <div className="w-full flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-brand-neonblue bg-brand-neonblue/10 px-2 py-0.5 rounded">
                            {req.request_number}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getPriorityBadge(req.priority)}`}>
                            {req.priority}
                          </span>
                        </div>
                        <h4 className="text-sm font-rajdhani font-black text-main truncate leading-snug mt-1">
                          {req.Product?.name || "Product"}
                        </h4>
                        <p className="text-[11px] text-muted font-mono">
                          SKU: {req.Product?.sku || "N/A"}
                        </p>
                      </div>

                      {/* Quantities */}
                      <div className="w-full text-left md:text-center">
                        <p className="text-[10px] text-muted font-black uppercase tracking-wider mb-0.5">
                          Quantities
                        </p>
                        <p className="text-base font-rajdhani font-black text-main">
                          Req: {req.quantity_requested}
                        </p>
                        {req.quantity_approved !== null && (
                          <p className="text-xs font-bold text-brand-neonblue">
                            Approved: {req.quantity_approved}
                          </p>
                        )}
                        {req.quantity_fulfilled !== null && (
                          <p className="text-xs font-bold text-teal-400">
                            Fulfilled: {req.quantity_fulfilled}
                          </p>
                        )}
                      </div>

                      {/* Status Details / Rejection Reason */}
                      <div className="w-full flex flex-col gap-1 text-xs">
                        {isRejected ? (
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            <span className="text-[9px] uppercase font-black tracking-wider flex items-center gap-1">
                              <AlertCircle size={11} /> Rejection Reason
                            </span>
                            <p className="mt-0.5 text-xs font-medium leading-tight">
                              {req.rejection_reason || "No explanation provided."}
                            </p>
                          </div>
                        ) : req.approval_notes ? (
                          <div className="p-2.5 rounded-xl bg-brand-bgbase border border-border text-muted">
                            <span className="text-[9px] uppercase font-black tracking-wider block text-brand-neonblue">
                              Approval Note
                            </span>
                            <p className="mt-0.5 text-xs text-main">{req.approval_notes}</p>
                          </div>
                        ) : (
                          <div className="text-muted text-[11px] space-y-0.5">
                            <p>Requested: {new Date(req.createdAt).toLocaleDateString()}</p>
                            {req.processed_at && (
                              <p>Updated: {new Date(req.processed_at).toLocaleDateString()}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status Badge & Actions */}
                      <div className="w-full flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                        <div className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5 ${statusInfo.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => {
                              setActiveRequest(req);
                              setShowDetailsDrawer(true);
                            }}
                            className="text-[10px] font-bold text-muted hover:text-main px-2 py-1 rounded border border-border"
                          >
                            Details
                          </button>

                          {isPending && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCancelRequest(req.id, req.request_number)}
                              className="text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 flex items-center gap-1"
                            >
                              <Trash2 size={11} /> Cancel
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── CREATE STOCK REQUEST MODAL ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-brand-surface border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-main"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-neonblue bg-brand-neonblue/10 px-2.5 py-0.5 rounded">
                    Branch Requisition
                  </span>
                  <h3 className="text-lg font-rajdhani font-black text-main mt-1">
                    NEW STOCK REQUISITION
                  </h3>
                  <p className="text-xs text-muted">Submitted for Super Admin review and authorization.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-main"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
                {/* Product Search & Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Select Product *
                  </label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product name or SKU..."
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-2 px-3 text-xs text-main mb-2 focus:outline-none focus:border-brand-neonblue"
                  />
                  <select
                    required
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-2.5 px-3 text-xs font-medium text-main focus:outline-none focus:border-brand-neonblue"
                  >
                    <option value="">-- Select from {filteredProducts.length} product(s) --</option>
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (SKU: {p.sku}) — Available: {p.available_quantity ?? 0}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Product Stock Card */}
                {selectedProduct && (
                  <div className="bg-brand-bgbase border border-border p-3 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-main">{selectedProduct.name}</p>
                      <p className="text-muted font-mono text-[10px]">SKU: {selectedProduct.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-muted">Central Warehouse Stock</p>
                      <p className={`font-black font-rajdhani text-sm ${(selectedProduct.available_quantity || 0) < 1 ? "text-rose-400" : "text-emerald-400"}`}>
                        {selectedProduct.available_quantity ?? 0} units
                      </p>
                    </div>
                  </div>
                )}

                {/* Quantity and Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      Quantity Requested *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantityRequested}
                      onChange={(e) => setQuantityRequested(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-brand-bgbase border border-border rounded-xl py-2.5 px-3 text-sm font-rajdhani font-black text-main focus:outline-none focus:border-brand-neonblue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-brand-bgbase border border-border rounded-xl py-2.5 px-3 text-xs font-medium text-main focus:outline-none focus:border-brand-neonblue"
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                {/* Source Branch (Optional, defaults to HQ Warehouse) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Source Location (Optional)
                  </label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-2.5 px-3 text-xs font-medium text-main focus:outline-none focus:border-brand-neonblue"
                  >
                    <option value="">Central Warehouse / Main HQ (Default)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        Branch: {b.name} ({b.location})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes / Business Justification */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Reason / Business Justification
                  </label>
                  <textarea
                    rows="2"
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g. Rapid depletion due to high weekend foot traffic; reserved build orders..."
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-2.5 px-3 text-xs text-main focus:outline-none focus:border-brand-neonblue"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 rounded-xl border border-border text-xs font-black uppercase tracking-wider text-main hover:bg-brand-bgbase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedProductId}
                    className="flex-1 py-3 rounded-xl bg-brand-neonblue text-white dark:text-brand-navy text-xs font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 shadow-sm"
                  >
                    {submitting ? "Submitting..." : "Submit Requisition"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DETAILS DRAWER ── */}
      <AnimatePresence>
        {showDetailsDrawer && activeRequest && (
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-md bg-brand-surface border-l border-border h-full flex flex-col shadow-2xl overflow-hidden text-main"
            >
              <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <span className="font-mono text-xs font-black text-brand-neonblue bg-brand-neonblue/10 px-2 py-0.5 rounded">
                    {activeRequest.request_number}
                  </span>
                  <h3 className="text-lg font-rajdhani font-black text-main mt-1 uppercase">
                    Requisition Details
                  </h3>
                </div>
                <button
                  onClick={() => setShowDetailsDrawer(false)}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-main"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 text-xs">
                <div className="bg-brand-bgbase p-4 rounded-2xl space-y-2 border border-border">
                  <div className="flex justify-between">
                    <span className="text-muted">Status:</span>
                    <span className="font-bold uppercase text-main">{activeRequest.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Product:</span>
                    <span className="font-bold text-main">{activeRequest.Product?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">SKU:</span>
                    <span className="font-mono text-main">{activeRequest.Product?.sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Requested Quantity:</span>
                    <span className="font-bold text-main">{activeRequest.quantity_requested}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Approved Quantity:</span>
                    <span className="font-bold text-brand-neonblue">{activeRequest.quantity_approved ?? "Pending"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Fulfilled Quantity:</span>
                    <span className="font-bold text-teal-400">{activeRequest.quantity_fulfilled ?? "Not yet fulfilled"}</span>
                  </div>
                </div>

                {activeRequest.rejection_reason && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-wider flex items-center gap-1">
                      <AlertCircle size={12} /> Super Admin Rejection Reason
                    </span>
                    <p className="font-medium text-xs leading-relaxed">{activeRequest.rejection_reason}</p>
                  </div>
                )}

                {activeRequest.approval_notes && (
                  <div className="p-3.5 bg-brand-bgbase border border-border rounded-2xl text-muted space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-wider block text-brand-neonblue">
                      Approval Instructions / Notes
                    </span>
                    <p className="text-main font-medium">{activeRequest.approval_notes}</p>
                  </div>
                )}

                <div className="text-muted text-[11px] space-y-1 pt-2">
                  <p>Submitted: {new Date(activeRequest.createdAt).toLocaleString()}</p>
                  {activeRequest.approved_at && (
                    <p>Approved: {new Date(activeRequest.approved_at).toLocaleString()}</p>
                  )}
                  {activeRequest.fulfilled_at && (
                    <p>Fulfilled: {new Date(activeRequest.fulfilled_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
