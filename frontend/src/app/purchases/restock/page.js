"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  Search, 
  AlertTriangle,
  ArrowRight,
  Download,
  Building,
  CheckCircle2,
  X,
  CheckSquare,
  Square,
  CheckCheck,
  RotateCcw,
  Clock,
  Send,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  FileText,
  User,
  ShieldCheck,
  History,
  Layers,
  Sparkles,
  Inbox,
  Filter,
  ArrowUpRight,
  MapPin
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import RestockRequestModal from "@/components/restock/RestockRequestModal";
import { showSuccess, showError, showInfo, showWarning, showConfirm } from "@/context/ModalContext";
import Pagination from "@/components/Pagination";

export default function ProcurementPage() {
  const [inventory, setInventory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [limit, setLimit] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [restockItem, setRestockItem] = useState(null);

  // Super Admin Requests State
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Super Admin: Selected Branch for Modal
  const [activeBranchModal, setActiveBranchModal] = useState(null);
  const [branchModalTab, setBranchModalTab] = useState("requests"); // "requests" | "inventory"
  const [branchModalSearch, setBranchModalSearch] = useState("");
  const [branchModalReqStatus, setBranchModalReqStatus] = useState("Pending"); // Pending | Approved | Fulfilled | Rejected | All
  const [branchModalPriority, setBranchModalPriority] = useState("");

  // Checkbox Selection State for Branch Modal
  const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Modals & Action States
  const [activeReq, setActiveReq] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBatchRejectModal, setShowBatchRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvedQty, setApprovedQty] = useState(1);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionCustom, setRejectionCustom] = useState("");
  const [batchRejectReason, setBatchRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const REJECTION_PRESETS = [
    "Insufficient warehouse inventory at source",
    "Request quantity exceeds branch quota",
    "Duplicate request submitted",
    "Product unavailable or discontinued",
    "Please resubmit with revised quantity requirement",
    "Other reason"
  ];

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'employee' || user.role === 'staff') {
        window.location.href = "/products";
        return;
      }
      setCurrentUser(user);
    }
    fetchData();
    fetchRequests();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const [invRes, branchRes] = await Promise.all([
        fetch(apiUrl("/api/inventory?limit=10000"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/branches"), { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (invRes.ok) {
        const raw = await invRes.json();
        setInventory(raw.data ?? []);
      }
      if (branchRes.ok) {
        const bData = await branchRes.json();
        setBranches(Array.isArray(bData) ? bData : []);
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    const token = localStorage.getItem("token");
    try {
      setRequestsLoading(true);
      const res = await fetch(apiUrl("/api/product-requests"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setRequestsLoading(false);
    }
  };

  // Reset modal state when active branch changes
  useEffect(() => {
    setSelectedRequestIds(new Set());
    setBranchModalSearch("");
    setBranchModalReqStatus("Pending");
    setBranchModalPriority("");
  }, [activeBranchModal, branchModalTab]);

  const isSuperAdmin = currentUser?.role === "super_admin";

  // ── Super Admin: Branch Analytics Aggregation ──
  const branchPillData = useMemo(() => {
    return branches.map(branch => {
      const bInv = inventory.filter(i => i.branch_id === branch.id && i.Product && !i.Product.is_bundle);
      const criticalCount = bInv.filter(i => i.quantity <= i.low_stock_threshold).length;
      const bReqs = requests.filter(r => r.branch_id === branch.id);
      const pendingRequestsCount = bReqs.filter(r => ["PENDING_SUPERADMIN", "PENDING", "PENDING_ADMIN"].includes((r.status || "").toUpperCase())).length;

      return {
        ...branch,
        totalItems: bInv.length,
        criticalCount,
        pendingRequestsCount,
        requests: bReqs,
        inventory: bInv
      };
    });
  }, [branches, inventory, requests]);

  // Overall Totals
  const totalCriticalStock = inventory.filter(i => i.Product && !i.Product.is_bundle && i.quantity <= i.low_stock_threshold).length;
  const totalPendingRequests = requests.filter(r => ["PENDING_SUPERADMIN", "PENDING", "PENDING_ADMIN"].includes((r.status || "").toUpperCase())).length;

  // ── Branch Admin: Flat Inventory Filter ──
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (!item.Product) return false;
      if (item.Product.is_bundle) return false;
      const matchesSearch = item.Product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.Product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [inventory, searchQuery]);

  const lowStockItems = filteredInventory.filter(item => item.quantity <= item.low_stock_threshold);
  const normalStockItems = filteredInventory.filter(item => item.quantity > item.low_stock_threshold);
  const sortedInventory = [...lowStockItems, ...normalStockItems];
  const totalPages = Math.ceil(sortedInventory.length / limit);
  const paginatedInventory = sortedInventory.slice((currentPage - 1) * limit, currentPage * limit);

  // ── Super Admin: Filtered Requests Inside Active Branch Modal ──
  const activeBranchRequests = useMemo(() => {
    if (!activeBranchModal) return [];
    const bReqs = requests.filter(r => r.branch_id === activeBranchModal.id);

    return bReqs.filter(r => {
      const q = branchModalSearch.trim().toLowerCase();
      const reqNum = (r.request_number || "").toLowerCase();
      const prodName = (r.Product?.name || "").toLowerCase();
      const prodSku = (r.Product?.sku || "").toLowerCase();
      const requester = (r.User?.first_name ? `${r.User.first_name} ${r.User.last_name || ''}` : (r.User?.username || "")).toLowerCase();

      const matchesSearch = !q || reqNum.includes(q) || prodName.includes(q) || prodSku.includes(q) || requester.includes(q);
      const matchesPriority = !branchModalPriority || r.priority === branchModalPriority;

      const st = (r.status || "").toUpperCase();
      let matchesTab = true;
      if (branchModalReqStatus === "Pending") {
        matchesTab = st === "PENDING_SUPERADMIN" || st === "PENDING" || st === "PENDING_ADMIN";
      } else if (branchModalReqStatus === "Approved") {
        matchesTab = st === "APPROVED" || st === "PARTIALLY_APPROVED";
      } else if (branchModalReqStatus === "Fulfilled") {
        matchesTab = st === "FULFILLED" || st === "COMPLETED";
      } else if (branchModalReqStatus === "Rejected") {
        matchesTab = st === "REJECTED";
      }

      return matchesSearch && matchesPriority && matchesTab;
    });
  }, [activeBranchModal, requests, branchModalSearch, branchModalReqStatus, branchModalPriority]);

  // ── Super Admin: Filtered Inventory Inside Active Branch Modal ──
  const activeBranchInventory = useMemo(() => {
    if (!activeBranchModal) return [];
    const bInv = inventory.filter(i => i.branch_id === activeBranchModal.id && i.Product && !i.Product.is_bundle);

    return bInv.filter(i => {
      const q = branchModalSearch.trim().toLowerCase();
      const prodName = (i.Product?.name || "").toLowerCase();
      const prodSku = (i.Product?.sku || "").toLowerCase();
      return !q || prodName.includes(q) || prodSku.includes(q);
    });
  }, [activeBranchModal, inventory, branchModalSearch]);

  // ── Checkbox Selection Handlers in Modal ──
  const isPendingStatus = (st) => ["PENDING_SUPERADMIN", "PENDING", "PENDING_ADMIN"].includes((st || "").toUpperCase());
  const selectableRequests = activeBranchRequests.filter(r => isPendingStatus(r.status));
  const isAllSelectableChecked = selectableRequests.length > 0 && selectableRequests.every(r => selectedRequestIds.has(r.id));
  const isSomeChecked = selectedRequestIds.size > 0;

  const handleToggleSelectAll = () => {
    if (isAllSelectableChecked) {
      setSelectedRequestIds(new Set());
    } else {
      const next = new Set(selectedRequestIds);
      selectableRequests.forEach(r => next.add(r.id));
      setSelectedRequestIds(next);
    }
  };

  const handleToggleRow = (id) => {
    const next = new Set(selectedRequestIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRequestIds(next);
  };

  // ── Actions: Single Approve ──
  const handleOpenApproveModal = (req) => {
    setActiveReq(req);
    setApprovedQty(req.quantity_requested);
    setApprovalNotes("");
    setShowApproveModal(true);
  };

  const handleConfirmApprove = async () => {
    if (!activeReq) return;
    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${activeReq.id}/approve`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          quantity_approved: approvedQty,
          approval_notes: approvalNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Stock Request ${activeReq.request_number} approved!`);
        setShowApproveModal(false);
        fetchRequests();
      } else {
        showError(data.message || "Approval failed.");
      }
    } catch (err) {
      showError("Network error during approval.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Actions: Single Reject ──
  const handleOpenRejectModal = (req) => {
    setActiveReq(req);
    setRejectionReason(REJECTION_PRESETS[0]);
    setRejectionCustom("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!activeReq) return;
    let finalReason = rejectionReason;
    if (rejectionCustom.trim()) {
      finalReason = rejectionReason === "Other reason"
        ? rejectionCustom.trim()
        : `${rejectionReason}: ${rejectionCustom.trim()}`;
    }

    if (!finalReason || finalReason.trim() === "") {
      showError("Rejection reason is required.");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${activeReq.id}/reject`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: finalReason })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Stock Request ${activeReq.request_number} rejected.`);
        setShowRejectModal(false);
        fetchRequests();
      } else {
        showError(data.message || "Rejection failed.");
      }
    } catch (err) {
      showError("Network error during rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Actions: Batch Approve ──
  const handleBatchApprove = async () => {
    if (selectedRequestIds.size === 0) return;
    const count = selectedRequestIds.size;
    const confirmed = await showConfirm(
      "Batch Approve Stock Requests",
      `Are you sure you want to approve ${count} stock request(s)? Warehouse inventory will be allocated.`,
      { confirmLabel: `Approve ${count} Requests` }
    );
    if (!confirmed) return;

    setBatchActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/product-requests/batch-approve"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids: Array.from(selectedRequestIds),
          approval_notes: "Authorized via Super Admin Batch Approval"
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || "Batch approval successful!");
        setSelectedRequestIds(new Set());
        fetchRequests();
      } else {
        showError(data.message || "Batch approval encountered errors.");
      }
    } catch (err) {
      showError("Network error during batch approval.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  // ── Actions: Batch Reject ──
  const handleBatchRejectSubmit = async (e) => {
    e.preventDefault();
    if (selectedRequestIds.size === 0) return;
    if (!batchRejectReason || !batchRejectReason.trim()) {
      showError("Rejection reason is required.");
      return;
    }

    setBatchActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/product-requests/batch-reject"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids: Array.from(selectedRequestIds),
          reason: batchRejectReason.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || "Batch rejection completed.");
        setShowBatchRejectModal(false);
        setBatchRejectReason("");
        setSelectedRequestIds(new Set());
        fetchRequests();
      } else {
        showError(data.message || "Batch rejection failed.");
      }
    } catch (err) {
      showError("Network error during batch rejection.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "PENDING_ADMIN":
        return { label: "Pending Branch Admin", cls: "text-amber-400 border-amber-400/20 bg-amber-400/10", dot: "bg-amber-400" };
      case "PENDING_SUPERADMIN":
      case "PENDING":
        return { label: "Pending HQ Review", cls: "text-cyan-400 border-cyan-400/20 bg-cyan-400/10", dot: "bg-cyan-400" };
      case "APPROVED":
        return { label: "Approved / Reserved", cls: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10", dot: "bg-emerald-400" };
      case "PARTIALLY_APPROVED":
        return { label: "Partially Approved", cls: "text-lime-400 border-lime-400/20 bg-lime-400/10", dot: "bg-lime-400" };
      case "PROCESSING":
      case "SCHEDULED":
        return { label: "In Transit", cls: "text-blue-400 border-blue-400/20 bg-blue-400/10", dot: "bg-blue-400" };
      case "FULFILLED":
      case "COMPLETED":
        return { label: "Fulfilled", cls: "text-teal-400 border-teal-400/20 bg-teal-400/10", dot: "bg-teal-400" };
      case "REJECTED":
        return { label: "Rejected", cls: "text-rose-400 border-rose-400/20 bg-rose-400/10", dot: "bg-rose-400" };
      default:
        return { label: status, cls: "text-muted border-border bg-brand-surface", dot: "bg-muted" };
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title={isSuperAdmin ? "SUPERADMIN RESTOCK DESK" : "PROCUREMENT DESK"} />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          
          {/* ========================================================================= */}
          {/* SUPER ADMIN VIEW: BRANCH PILLS GRID -> CLICK OPENS REQUEST LIST MODAL */}
          {/* ========================================================================= */}
          {isSuperAdmin ? (
            <div>
              {/* Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-border pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-black tracking-[3px] uppercase text-brand-neonblue bg-brand-neonblue/10 px-2.5 py-0.5 rounded border border-brand-neonblue/20">
                      Central Authority • Super Admin
                    </span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-rajdhani font-black uppercase tracking-wide flex items-center gap-2 text-main">
                    <span>BRANCH RESTOCK</span>
                    <span className="text-brand-neonblue">HUBS</span>
                  </h1>
                </div>

                {/* Quick Metrics */}
                <div className="flex items-center gap-3">
                  <div className="bg-brand-surface border border-border px-5 py-2.5 rounded-xl text-center shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted block">Request Restock</span>
                    <span className="text-lg font-rajdhani font-black text-brand-neonblue font-mono">{totalPendingRequests} Products</span>
                  </div>
                  <button
                    onClick={() => { fetchData(); fetchRequests(); }}
                    title="Refresh Hub"
                    className="p-3 bg-brand-surface border border-border rounded-xl text-muted hover:text-brand-neonblue transition-colors shrink-0 shadow-sm"
                  >
                    <RotateCcw size={16} className={loading || requestsLoading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* Branch Pills Grid */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1.5 h-4 bg-brand-neonblue rounded-full" />
                  <h3 className="text-xs font-rajdhani font-black uppercase text-main tracking-widest">
                    BRANCHES
                  </h3>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-10 h-10 border-2 border-border border-t-brand-neonblue rounded-full animate-spin mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-muted">Loading Branch Hubs...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {branchPillData.map((branch) => {
                      return (
                        <motion.button
                          key={branch.id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setActiveBranchModal(branch);
                            setBranchModalTab("requests");
                          }}
                          className="w-full text-left bg-brand-surface border border-border hover:border-brand-neonblue/40 rounded-2xl p-5 shadow-sm transition-all group relative overflow-hidden flex flex-col justify-between"
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-neonblue/0 group-hover:via-brand-neonblue/80 to-transparent transition-all duration-300" />

                          <div>
                            {/* Branch Title & Icon */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-brand-neonblue/10 border border-brand-neonblue/20 text-brand-neonblue flex items-center justify-center shrink-0 group-hover:bg-brand-neonblue group-hover:text-slate-950 transition-colors">
                                  <Building size={16} />
                                </div>
                                <div>
                                  <h4 className="text-base font-rajdhani font-black uppercase text-main tracking-wide group-hover:text-brand-neonblue transition-colors">
                                    {branch.name}
                                  </h4>
                                  <span className="text-[10px] text-muted flex items-center gap-1">
                                    <MapPin size={10} />
                                    {branch.location || 'Branch Sector'}
                                  </span>
                                </div>
                              </div>

                              <div className="w-7 h-7 rounded-lg bg-brand-muted/10 flex items-center justify-center text-muted group-hover:text-brand-neonblue transition-colors shrink-0">
                                <ArrowUpRight size={14} />
                              </div>
                            </div>

                            {/* Status Badge: Request Restock {number of products} */}
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                              <span className="text-[11px] font-black uppercase px-3 py-1.5 rounded-full bg-brand-neonblue/15 text-brand-neonblue border border-brand-neonblue/30 flex items-center gap-1.5 font-mono">
                                <Inbox size={13} />
                                Request Restock: {branch.pendingRequestsCount} {branch.pendingRequestsCount === 1 ? 'Product' : 'Products'}
                              </span>
                            </div>
                          </div>

                          {/* Footer Info */}
                          <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                            <span className="text-muted text-[10px] uppercase font-bold tracking-wider">Active Inventory</span>
                            <span className="font-rajdhani font-black text-main">{branch.totalItems} Items</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* BRANCH ADMIN / STAFF VIEW: SINGLE BRANCH INVENTORY PROCUREMENT DESK */
            /* ========================================================================= */
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-orange-400 rounded-full" />
                  <h3 className="text-sm font-rajdhani font-bold uppercase text-main tracking-wider">Inventory Restock</h3>
                </div>
                
                <div className="relative group w-full md:w-96">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-main/30 group-focus-within:text-orange-400 transition-colors">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search inventory by component or SKU..."
                    className="w-full bg-brand-surface border border-border rounded-xl py-4 pl-12 pr-4 text-xs text-main focus:outline-none focus:border-orange-400/20 transition-all font-bold tracking-tight shadow-sm"
                  />
                </div>
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-2 border-border border-t-orange-400 rounded-full animate-spin mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[4px] text-muted">Syncing Inventory Matrix...</p>
                </div>
              )}

              {/* Empty */}
              {!loading && paginatedInventory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 glass-card border-dashed">
                  <Package size={48} className="text-main/10 mb-6" />
                  <h3 className="text-sm font-black uppercase tracking-[4px] text-main">No Inventory Records Found</h3>
                </div>
              )}

              {/* Categorized List */}
              {!loading && paginatedInventory.length > 0 && (
                <div className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  {paginatedInventory.map((item, idx) => {
                    const isLowStock = item.quantity <= item.low_stock_threshold;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`flex flex-col md:flex-row md:items-center gap-4 px-6 py-4 transition-colors group ${
                          idx !== paginatedInventory.length - 1 ? 'border-b border-border' : ''
                        } hover:bg-brand-muted/5`}
                      >
                        {/* Status Indicator */}
                        <div className="flex items-center gap-4 md:w-48 shrink-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                            isLowStock 
                              ? 'bg-brand-crimson/10 border-brand-crimson/20 text-brand-crimson' 
                              : 'bg-green-400/10 border-green-400/20 text-green-400'
                          }`}>
                            {isLowStock ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isLowStock ? 'text-brand-crimson' : 'text-green-400'}`}>
                              {isLowStock ? 'CRITICAL STOCK' : 'OPTIMAL'}
                            </p>
                            <p className="text-[9px] text-muted font-mono uppercase mt-0.5">Threshold: {item.low_stock_threshold}</p>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-rajdhani font-bold text-main truncate capitalize">
                            {item.Product?.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-muted/40 uppercase tracking-widest font-mono">{item.Product?.sku}</span>
                            <div className="w-1 h-1 rounded-full bg-border" />
                            <span className="text-[10px] text-orange-400/80 uppercase tracking-widest font-bold flex items-center gap-1">
                              <Building size={10} />
                              {item.Branch?.name || 'Sta Rosa'}
                            </span>
                          </div>
                        </div>

                        {/* Current Stock */}
                        <div className="md:text-right shrink-0">
                          <p className="text-[9px] text-main/30 font-black uppercase tracking-[2px] mb-0.5">Active Stock</p>
                          <p className={`text-xl font-rajdhani font-black ${isLowStock ? 'text-brand-crimson' : 'text-main'}`}>
                            {item.quantity} <span className="text-[10px] text-muted/50 tracking-widest">UNITS</span>
                          </p>
                        </div>

                        {/* Action */}
                        <div className="shrink-0 mt-4 md:mt-0 flex justify-end">
                          <button 
                            onClick={() => setRestockItem(item)}
                            className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                              isLowStock 
                                ? 'bg-brand-crimson/10 text-brand-crimson hover:bg-brand-crimson hover:text-white border border-brand-crimson/20 shadow-[0_0_15px_rgba(215,38,56,0.15)]'
                                : 'bg-brand-surface border border-border text-main hover:text-orange-400 hover:border-orange-400/30'
                            }`}
                          >
                            <Download size={14} />
                            Restock
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Footer */}
              {sortedInventory.length > limit && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-muted">
                    Showing {((currentPage - 1) * limit) + 1}–{Math.min(currentPage * limit, sortedInventory.length)} of {sortedInventory.length} items
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    limit={limit}
                    onLimitChange={setLimit}
                    limits={[10,25,50,100]}
                  />
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* SUPER ADMIN: BRANCH REQUEST LIST MODAL WITH CHECKBOXES */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeBranchModal && isSuperAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-border bg-brand-bgbase flex justify-between items-center gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-neonblue/15 border border-brand-neonblue/30 text-brand-neonblue flex items-center justify-center shrink-0">
                    <Building size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-rajdhani font-black uppercase tracking-wider text-main">
                        {activeBranchModal.name}
                      </h2>
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-neonblue bg-brand-neonblue/10 px-2 py-0.5 rounded border border-brand-neonblue/20">
                        {activeBranchModal.location || 'Branch Sector'}
                      </span>
                    </div>
                    <p className="text-xs text-muted font-medium mt-0.5">
                      Review stock requests and approve with checkboxes for batch approval.
                    </p>
                  </div>
                </div>

                {/* Modal Close Button */}
                <button
                  onClick={() => setActiveBranchModal(null)}
                  className="p-2 rounded-xl bg-brand-surface border border-border text-muted hover:text-main hover:border-brand-neonblue/30 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-brand-surface">
                
                {/* ── SEARCH & FILTER CONTROLS ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  
                  {/* Status subtabs for requests */}
                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar w-full md:w-auto pb-2 md:pb-0">
                    {[
                      { id: "Pending", label: "Pending Review" },
                      { id: "Approved", label: "Approved" },
                      { id: "Fulfilled", label: "Fulfilled" },
                      { id: "Rejected", label: "Rejected" },
                      { id: "All", label: "All Records" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setBranchModalReqStatus(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold font-rajdhani uppercase tracking-wider transition-all whitespace-nowrap ${
                          branchModalReqStatus === tab.id
                            ? "bg-brand-neonblue/20 text-brand-neonblue border border-brand-neonblue/40"
                            : "text-muted hover:text-main bg-brand-bgbase border border-border"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full md:w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={branchModalSearch}
                      onChange={(e) => setBranchModalSearch(e.target.value)}
                      placeholder="Search request #, product, staff..."
                      className="w-full bg-brand-bgbase border border-border rounded-xl py-2 pl-9 pr-3 text-xs text-main focus:outline-none focus:border-brand-neonblue/30 transition-all font-bold"
                    />
                  </div>
                </div>

                {/* ── BRANCH REQUESTS LIST WITH CHECKBOXES ── */}
                <div>
                  {/* Batch Selection Bar */}
                  {selectableRequests.length > 0 && (
                    <div className="flex items-center justify-between bg-brand-bgbase border border-border rounded-xl px-4 py-2.5 mb-4">
                      <button
                        onClick={handleToggleSelectAll}
                        className="flex items-center gap-2 text-xs font-rajdhani font-bold uppercase tracking-wider text-main hover:text-brand-neonblue transition-colors"
                      >
                        {isAllSelectableChecked ? (
                          <CheckSquare size={17} className="text-brand-neonblue" />
                        ) : (
                          <Square size={17} className="text-muted" />
                        )}
                        <span>
                          {isAllSelectableChecked ? "Deselect All" : "Select All Pending"} ({selectableRequests.length})
                        </span>
                      </button>

                      {isSomeChecked && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-400 font-bold font-mono">
                            {selectedRequestIds.size} Selected
                          </span>
                          <button
                            onClick={handleBatchApprove}
                            disabled={batchActionLoading}
                            className="bg-emerald-500/15 hover:bg-emerald-500 hover:text-white text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-rajdhani font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <ThumbsUp size={12} />
                            Approve Selected ({selectedRequestIds.size})
                          </button>
                          <button
                            onClick={() => {
                              setBatchRejectReason("");
                              setShowBatchRejectModal(true);
                            }}
                            disabled={batchActionLoading}
                            className="bg-rose-500/15 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-rajdhani font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <ThumbsDown size={12} />
                            Reject Selected ({selectedRequestIds.size})
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty State */}
                  {activeBranchRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-brand-bgbase border border-border rounded-2xl border-dashed">
                      <Inbox size={40} className="text-main/20 mb-3" />
                      <h4 className="text-xs font-black uppercase tracking-[2px] text-main">No Stock Requisitions Found</h4>
                      <p className="text-[11px] text-muted mt-1">There are no stock requisitions under this filter for this branch.</p>
                    </div>
                  ) : (
                    <div className="bg-brand-bgbase border border-border rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-brand-surface text-[10px] font-black uppercase tracking-[2px] text-muted">
                              <th className="py-3.5 px-4 w-12 text-center">
                                <button
                                  onClick={handleToggleSelectAll}
                                  title="Select / Deselect all"
                                  className="text-muted hover:text-brand-neonblue transition-colors"
                                >
                                  {isAllSelectableChecked ? (
                                    <CheckSquare size={16} className="text-brand-neonblue" />
                                  ) : (
                                    <Square size={16} />
                                  )}
                                </button>
                              </th>
                              <th className="py-3.5 px-4">Request # / Date</th>
                              <th className="py-3.5 px-4">Requester (Staff)</th>
                              <th className="py-3.5 px-4">Product Details</th>
                              <th className="py-3.5 px-4 text-center">Requested Qty</th>
                              <th className="py-3.5 px-4">Status</th>
                              <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-xs">
                            {activeBranchRequests.map((req) => {
                              const isPending = isPendingStatus(req.status);
                              const isChecked = selectedRequestIds.has(req.id);
                              const statusBadge = getStatusBadge(req.status);
                              const requesterName = req.User?.first_name 
                                ? `${req.User.first_name} ${req.User.last_name || ''}` 
                                : (req.User?.username || "Staff Associate");

                              return (
                                <tr
                                  key={req.id}
                                  className={`transition-colors group ${
                                    isChecked ? "bg-brand-neonblue/10" : "hover:bg-brand-surface/60"
                                  }`}
                                >
                                  {/* Checkbox Column */}
                                  <td className="py-3.5 px-4 text-center">
                                    {isPending ? (
                                      <button
                                        onClick={() => handleToggleRow(req.id)}
                                        className="text-muted hover:text-brand-neonblue transition-colors"
                                      >
                                        {isChecked ? (
                                          <CheckSquare size={16} className="text-brand-neonblue" />
                                        ) : (
                                          <Square size={16} />
                                        )}
                                      </button>
                                    ) : (
                                      <div className="w-4 h-4 mx-auto rounded border border-border/30 opacity-20 cursor-not-allowed" />
                                    )}
                                  </td>

                                  {/* Request # */}
                                  <td className="py-3.5 px-4">
                                    <span className="font-mono font-bold text-main">{req.request_number}</span>
                                    <p className="text-[10px] text-muted mt-0.5">
                                      {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                                    </p>
                                  </td>

                                  {/* Requester */}
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-lg bg-brand-neonblue/10 border border-brand-neonblue/20 text-brand-neonblue flex items-center justify-center text-xs font-bold shrink-0">
                                        <User size={12} />
                                      </div>
                                      <span className="font-bold text-main">{requesterName}</span>
                                    </div>
                                  </td>

                                  {/* Product */}
                                  <td className="py-3.5 px-4">
                                    <p className="font-rajdhani font-bold text-xs text-main capitalize truncate max-w-xs">
                                      {req.Product?.name || `Product #${req.product_id}`}
                                    </p>
                                    <span className="text-[10px] font-mono text-muted uppercase">{req.Product?.sku || 'SKU-UNKNOWN'}</span>
                                  </td>

                                  {/* Quantity */}
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="text-sm font-rajdhani font-black text-main">
                                      {req.quantity_requested}
                                    </span>
                                    <span className="text-[9px] text-muted ml-1 uppercase">units</span>
                                  </td>

                                  {/* Status Badge */}
                                  <td className="py-3.5 px-4">
                                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${statusBadge.cls}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                                      {statusBadge.label}
                                    </span>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {isPending ? (
                                        <>
                                          <button
                                            onClick={() => handleOpenApproveModal(req)}
                                            className="h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 transition-all flex items-center gap-1"
                                          >
                                            <ThumbsUp size={11} />
                                            Approve
                                          </button>
                                          <button
                                            onClick={() => handleOpenRejectModal(req)}
                                            className="h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 transition-all flex items-center gap-1"
                                          >
                                            <ThumbsDown size={11} />
                                            Reject
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setActiveReq(req);
                                            setShowDetailsModal(true);
                                          }}
                                          className="h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-brand-surface border border-border text-muted hover:text-main transition-colors flex items-center gap-1"
                                        >
                                          <FileText size={11} />
                                          Details
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* RESTOCK ORDER MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {restockItem && (
          <RestockRequestModal 
            inventoryItem={restockItem} 
            onClose={() => setRestockItem(null)} 
            onSuccess={() => {
              setRestockItem(null);
              fetchData();
              fetchRequests();
            }} 
          />
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SINGLE APPROVE MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showApproveModal && activeReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowApproveModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-main"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <ThumbsUp size={20} />
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-black uppercase text-main">
                    Authorize Stock Approval
                  </h3>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    {activeReq.request_number}
                  </p>
                </div>
              </div>

              <div className="bg-brand-bgbase border border-border rounded-xl p-4 mb-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Product:</span>
                  <span className="font-bold text-main">{activeReq.Product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Requested Quantity:</span>
                  <span className="font-mono font-bold text-emerald-400">{activeReq.quantity_requested} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Staff Requester:</span>
                  <span className="text-main font-bold">
                    {activeReq.User?.first_name ? `${activeReq.User.first_name} ${activeReq.User.last_name || ''}` : activeReq.User?.username}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                  Approved Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={activeReq.quantity_requested}
                  value={approvedQty}
                  onChange={(e) => setApprovedQty(Number(e.target.value))}
                  className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-xs text-main font-mono font-bold focus:outline-none focus:border-brand-neonblue/30"
                />
              </div>

              <div className="mb-6">
                <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Notes for fulfillment or audit trail..."
                  rows={3}
                  className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-xs text-main focus:outline-none focus:border-brand-neonblue/30 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted hover:text-main"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-rajdhani font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all flex items-center gap-2"
                >
                  {actionLoading ? "Processing..." : "Confirm Approval"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SINGLE REJECT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showRejectModal && activeReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowRejectModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-main"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <ThumbsDown size={20} />
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-black uppercase text-main">
                    Reject Stock Requisition
                  </h3>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    {activeReq.request_number}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Select Rejection Preset
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-xs text-main focus:outline-none focus:border-rose-400/30 font-medium"
                  >
                    {REJECTION_PRESETS.map((preset, idx) => (
                      <option key={idx} value={preset}>{preset}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Additional Explanation
                  </label>
                  <textarea
                    value={rejectionCustom}
                    onChange={(e) => setRejectionCustom(e.target.value)}
                    placeholder="Specific explanation..."
                    rows={3}
                    className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-xs text-main focus:outline-none focus:border-rose-400/30 resize-none font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted hover:text-main"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-rajdhani font-black uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-all flex items-center gap-2"
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* BATCH REJECT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBatchRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowBatchRejectModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-main"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <ThumbsDown size={20} />
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-black uppercase text-main">
                    Batch Reject {selectedRequestIds.size} Requests
                  </h3>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    All selected requisitions will be declined
                  </p>
                </div>
              </div>

              <form onSubmit={handleBatchRejectSubmit}>
                <div className="mb-6">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Reason for Batch Rejection
                  </label>
                  <textarea
                    value={batchRejectReason}
                    onChange={(e) => setBatchRejectReason(e.target.value)}
                    placeholder="Provide reason for declining all selected requisitions..."
                    rows={3}
                    required
                    className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-xs text-main focus:outline-none focus:border-rose-400/30 resize-none font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBatchRejectModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted hover:text-main"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={batchActionLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-rajdhani font-black uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-all flex items-center gap-2"
                  >
                    {batchActionLoading ? "Rejecting..." : `Reject ${selectedRequestIds.size} Requests`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DETAILS MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showDetailsModal && activeReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-main"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-neonblue/15 border border-brand-neonblue/30 text-brand-neonblue flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-black uppercase text-main">
                    Requisition Details
                  </h3>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    {activeReq.request_number}
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-brand-bgbase border border-border rounded-xl p-4 text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-muted">Product:</span>
                  <span className="font-bold text-main">{activeReq.Product?.name} ({activeReq.Product?.sku})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Quantity Requested:</span>
                  <span className="font-mono font-bold text-orange-400">{activeReq.quantity_requested} units</span>
                </div>
                {activeReq.quantity_approved && (
                  <div className="flex justify-between">
                    <span className="text-muted">Quantity Approved:</span>
                    <span className="font-mono font-bold text-emerald-400">{activeReq.quantity_approved} units</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">Requester:</span>
                  <span className="font-bold text-main">
                    {activeReq.User?.first_name ? `${activeReq.User.first_name} ${activeReq.User.last_name || ''}` : activeReq.User?.username}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Current Status:</span>
                  <span className="font-bold uppercase text-brand-neonblue">{activeReq.status}</span>
                </div>
                {activeReq.branch_approval_notes && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted block text-[10px] uppercase font-bold mb-0.5">Branch Endorsement Notes:</span>
                    <p className="text-main italic">{activeReq.branch_approval_notes}</p>
                  </div>
                )}
                {activeReq.approval_notes && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted block text-[10px] uppercase font-bold mb-0.5">HQ Approval Notes:</span>
                    <p className="text-main italic">{activeReq.approval_notes}</p>
                  </div>
                )}
                {activeReq.rejection_reason && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-rose-400 block text-[10px] uppercase font-bold mb-0.5">Rejection Reason:</span>
                    <p className="text-rose-400 italic">{activeReq.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-brand-surface border border-border text-main hover:bg-brand-muted/10"
                >
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
