"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Search,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Truck,
  Box,
  MapPin,
  Tag,
  User,
  Package,
  Layers,
  FileText,
  History,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  ExternalLink
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError } from "@/context/ModalContext";

export default function AdminProductRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Pending");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("");

  // Modals & Drawer States
  const [activeRequest, setActiveRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [requestAuditTrail, setRequestAuditTrail] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Input fields for modals
  const [approvedQty, setApprovedQty] = useState(1);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionPreset, setRejectionPreset] = useState("");
  const [rejectionCustomText, setRejectionCustomText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const REJECTION_PRESETS = [
    "Insufficient stock at source branch / warehouse",
    "Request quantity exceeds branch limit",
    "Duplicate request submitted",
    "Product unavailable or discontinued",
    "Request requires inventory correction / resubmission",
    "Other reason"
  ];

  useEffect(() => {
    fetchRequests();
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
      showError("Connection failure: Could not retrieve stock requests.");
    } finally {
      setLoading(false);
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
      console.error("Branch fetch error:", err);
    }
  };

  const fetchAuditTrail = async (requestId) => {
    const token = localStorage.getItem("token");
    try {
      setAuditLoading(true);
      const res = await fetch(apiUrl(`/api/product-requests/${requestId}/audit`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRequestAuditTrail(Array.isArray(data) ? data : []);
      } else {
        setRequestAuditTrail([]);
      }
    } catch (err) {
      console.error(err);
      setRequestAuditTrail([]);
    } finally {
      setAuditLoading(false);
    }
  };

  // Open Details Drawer
  const handleOpenDetails = (req) => {
    setActiveRequest(req);
    setShowDetailsDrawer(true);
    fetchAuditTrail(req.id);
  };

  // ── Approval Handler ──
  const handleOpenApprove = (req) => {
    setActiveRequest(req);
    setApprovedQty(req.quantity_requested);
    setApprovalNotes("");
    setShowApproveModal(true);
  };

  const handleApprove = async () => {
    if (!approvedQty || approvedQty < 1 || approvedQty > activeRequest.quantity_requested) {
      showError(`Approved quantity must be between 1 and ${activeRequest.quantity_requested}.`);
      return;
    }

    const available = activeRequest.source_branch_id
      ? 999 // checked server-side for source branch
      : (activeRequest.Product?.available_quantity ?? 0);

    if (!activeRequest.source_branch_id && available < approvedQty) {
      showError(`Insufficient warehouse stock. Only ${available} available.`);
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${activeRequest.id}/approve`), {
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
        showSuccess(`Stock Request ${activeRequest.request_number} approved successfully!`);
        setShowApproveModal(false);
        fetchRequests();
      } else {
        showError(data.message || "Approval failed.");
      }
    } catch (err) {
      showError("An error occurred during approval.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Rejection Handler ──
  const handleOpenReject = (req) => {
    setActiveRequest(req);
    setRejectionPreset(REJECTION_PRESETS[0]);
    setRejectionCustomText("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    let finalReason = rejectionPreset;
    if (rejectionCustomText.trim()) {
      finalReason = rejectionPreset === "Other reason"
        ? rejectionCustomText.trim()
        : `${rejectionPreset}: ${rejectionCustomText.trim()}`;
    }

    if (!finalReason || finalReason.trim() === "") {
      showError("Rejection reason is strictly required.");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${activeRequest.id}/reject`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: finalReason })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Stock Request ${activeRequest.request_number} rejected.`);
        setShowRejectModal(false);
        fetchRequests();
      } else {
        showError(data.message || "Rejection failed.");
      }
    } catch (err) {
      showError("An error occurred during rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Transition to Processing ──
  const handleSetProcessing = async (req) => {
    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${req.id}/process`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Request ${req.request_number} set to PROCESSING.`);
        fetchRequests();
      } else {
        showError(data.message || "Failed to update status.");
      }
    } catch (err) {
      showError("Error updating request status.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Fulfill Handler ──
  const handleOpenFulfill = (req) => {
    setActiveRequest(req);
    setShowFulfillModal(true);
  };

  const handleConfirmFulfill = async () => {
    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${activeRequest.id}/fulfill`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Request ${activeRequest.request_number} fulfilled! ${data.transferred_quantity} units transferred.`);
        setShowFulfillModal(false);
        fetchRequests();
      } else {
        showError(data.message || "Fulfillment failed.");
      }
    } catch (err) {
      showError("An error occurred during fulfillment.");
    } finally {
      setActionLoading(false);
    }
  };

  // Stats calculation
  const totalPending = requests.filter(r => (r.status || "").toUpperCase() === "PENDING").length;
  const totalApproved = requests.filter(r => ["APPROVED", "PARTIALLY_APPROVED"].includes((r.status || "").toUpperCase())).length;
  const totalProcessing = requests.filter(r => ["PROCESSING", "SCHEDULED"].includes((r.status || "").toUpperCase())).length;
  const totalFulfilled = requests.filter(r => ["FULFILLED", "COMPLETED"].includes((r.status || "").toUpperCase())).length;
  const totalRejected = requests.filter(r => (r.status || "").toUpperCase() === "REJECTED").length;

  const tabs = ["Pending", "Approved", "Processing", "Fulfilled", "Rejected", "All"];

  const filteredRequests = requests.filter(r => {
    const statusUpper = (r.status || "").toUpperCase();
    const reqNum = (r.request_number || "").toLowerCase();
    const prodName = (r.Product?.name || "").toLowerCase();
    const prodSku = (r.Product?.sku || "").toLowerCase();
    const branchName = (r.Branch?.name || "").toLowerCase();
    const requesterName = (r.Requester?.username || "").toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      !q ||
      reqNum.includes(q) ||
      prodName.includes(q) ||
      prodSku.includes(q) ||
      branchName.includes(q) ||
      requesterName.includes(q);

    const matchesBranch = !selectedBranchFilter || String(r.branch_id) === String(selectedBranchFilter);
    const matchesPriority = !selectedPriorityFilter || r.priority === selectedPriorityFilter;

    let matchesTab = true;
    if (activeTab === "Pending") {
      matchesTab = statusUpper === "PENDING";
    } else if (activeTab === "Approved") {
      matchesTab = statusUpper === "APPROVED" || statusUpper === "PARTIALLY_APPROVED";
    } else if (activeTab === "Processing") {
      matchesTab = statusUpper === "PROCESSING" || statusUpper === "SCHEDULED";
    } else if (activeTab === "Fulfilled") {
      matchesTab = statusUpper === "FULFILLED" || statusUpper === "COMPLETED";
    } else if (activeTab === "Rejected") {
      matchesTab = statusUpper === "REJECTED";
    }

    return matchesSearch && matchesBranch && matchesPriority && matchesTab;
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

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="HQ STOCK REQUEST APPROVAL WORKFLOW" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container py-8">

            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black tracking-[3px] uppercase text-brand-neonblue bg-brand-neonblue/10 px-2.5 py-0.5 rounded">
                    Central Authority • Super Admin
                  </span>
                  <span className="text-[10px] font-mono text-muted/60">Separation of Duties Enforced</span>
                </div>
                <h1 className="text-2xl font-rajdhani font-black uppercase tracking-wide">
                  STOCK REQUEST <span className="text-brand-neonblue">APPROVAL DASHBOARD</span>
                </h1>
                <p className="text-xs text-muted font-medium mt-1">
                  Review branch requisitions, authorize full or partial quantities, reject unauthorized submissions, and atomically fulfill inventory movements.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={fetchRequests}
                className="btn-ghost py-2.5 px-4 h-auto text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5"
              >
                <RotateCcw size={13} className={loading ? "animate-spin" : ""} /> Refresh Data
              </motion.button>
            </div>

            {/* KPI Metrics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {/* Pending */}
              <div
                onClick={() => setActiveTab("Pending")}
                className={`cursor-pointer bg-brand-surface border p-5 rounded-2xl transition-all shadow-sm ${
                  activeTab === "Pending" ? "border-amber-400/50 ring-1 ring-amber-400/30" : "border-border hover:border-amber-400/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-main/40 uppercase tracking-widest">Pending Review</p>
                  <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400">
                    <ClipboardList size={16} />
                  </div>
                </div>
                <p className="text-3xl font-rajdhani font-black text-amber-400">{totalPending}</p>
                <p className="text-[10px] text-muted mt-1">Requires Super Admin Action</p>
              </div>

              {/* Approved */}
              <div
                onClick={() => setActiveTab("Approved")}
                className={`cursor-pointer bg-brand-surface border p-5 rounded-2xl transition-all shadow-sm ${
                  activeTab === "Approved" ? "border-emerald-400/50 ring-1 ring-emerald-400/30" : "border-border hover:border-emerald-400/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-main/40 uppercase tracking-widest">Approved / Reserved</p>
                  <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center text-emerald-400">
                    <Box size={16} />
                  </div>
                </div>
                <p className="text-3xl font-rajdhani font-black text-emerald-400">{totalApproved}</p>
                <p className="text-[10px] text-muted mt-1">Authorized for Fulfillment</p>
              </div>

              {/* Processing */}
              <div
                onClick={() => setActiveTab("Processing")}
                className={`cursor-pointer bg-brand-surface border p-5 rounded-2xl transition-all shadow-sm ${
                  activeTab === "Processing" ? "border-cyan-400/50 ring-1 ring-cyan-400/30" : "border-border hover:border-cyan-400/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-main/40 uppercase tracking-widest">In Processing</p>
                  <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                    <Truck size={16} />
                  </div>
                </div>
                <p className="text-3xl font-rajdhani font-black text-cyan-400">{totalProcessing}</p>
                <p className="text-[10px] text-muted mt-1">Preparing / In Transit</p>
              </div>

              {/* Fulfilled */}
              <div
                onClick={() => setActiveTab("Fulfilled")}
                className={`cursor-pointer bg-brand-surface border p-5 rounded-2xl transition-all shadow-sm ${
                  activeTab === "Fulfilled" ? "border-teal-400/50 ring-1 ring-teal-400/30" : "border-border hover:border-teal-400/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-main/40 uppercase tracking-widest">Fulfilled</p>
                  <div className="w-8 h-8 rounded-lg bg-teal-400/10 flex items-center justify-center text-teal-400">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <p className="text-3xl font-rajdhani font-black text-teal-400">{totalFulfilled}</p>
                <p className="text-[10px] text-muted mt-1">Inventory Transferred</p>
              </div>

              {/* Rejected */}
              <div
                onClick={() => setActiveTab("Rejected")}
                className={`cursor-pointer bg-brand-surface border p-5 rounded-2xl transition-all shadow-sm ${
                  activeTab === "Rejected" ? "border-rose-400/50 ring-1 ring-rose-400/30" : "border-border hover:border-rose-400/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-main/40 uppercase tracking-widest">Rejected</p>
                  <div className="w-8 h-8 rounded-lg bg-rose-400/10 flex items-center justify-center text-rose-400">
                    <XCircle size={16} />
                  </div>
                </div>
                <p className="text-3xl font-rajdhani font-black text-rose-400">{totalRejected}</p>
                <p className="text-[10px] text-muted mt-1">Reason Recorded</p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-brand-surface border border-border rounded-2xl p-5 mb-6 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1">
                {/* Search */}
                <div className="relative group flex-1">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-main/30 group-focus-within:text-brand-neonblue transition-colors">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Request #, SKU, Product, or Requester..."
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-main focus:outline-none focus:border-brand-neonblue/40 transition-all shadow-sm"
                  />
                </div>

                {/* Branch filter */}
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="bg-brand-bgbase border border-border rounded-xl py-2.5 px-3 text-xs font-medium text-main focus:outline-none focus:border-brand-neonblue/40 transition-colors"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Priority filter */}
                <select
                  value={selectedPriorityFilter}
                  onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                  className="bg-brand-bgbase border border-border rounded-xl py-2.5 px-3 text-xs font-medium text-main focus:outline-none focus:border-brand-neonblue/40 transition-colors"
                >
                  <option value="">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Status Tabs */}
              <div className="flex gap-1 overflow-x-auto no-scrollbar w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-border/40">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`h-9 px-3.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
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

            {/* Content List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-2 border-border border-t-brand-neonblue rounded-full animate-spin mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-muted">Retrieving stock requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-brand-surface border border-dashed border-border rounded-2xl">
                <ClipboardList size={40} className="text-main/15 mb-3" />
                <h3 className="text-sm font-black uppercase tracking-wider text-main">No Stock Requests Found</h3>
                <p className="text-xs text-muted mt-1">Try adjusting your filters or search keywords.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredRequests.map((req) => {
                  const statusInfo = getStatusBadge(req.status);
                  const statusUpper = (req.status || "").toUpperCase();
                  const isPending = statusUpper === "PENDING";
                  const isApproved = statusUpper === "APPROVED" || statusUpper === "PARTIALLY_APPROVED";
                  const isProcessing = statusUpper === "PROCESSING" || statusUpper === "SCHEDULED";
                  const isFulfilled = statusUpper === "FULFILLED" || statusUpper === "COMPLETED";
                  const isRejected = statusUpper === "REJECTED";

                  return (
                    <motion.div
                      key={req.id}
                      layoutId={`admin-req-${req.id}`}
                      className="bg-brand-surface border border-border rounded-2xl p-5 shadow-sm hover:border-brand-neonblue/20 transition-all flex flex-col xl:flex-row gap-5 items-start xl:items-center justify-between"
                    >
                      {/* Left: Ref, Destination, Requester */}
                      <div className="flex flex-col gap-1.5 min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-brand-neonblue bg-brand-neonblue/10 px-2 py-0.5 rounded">
                            {req.request_number}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getPriorityBadge(req.priority)}`}>
                            {req.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-main mt-1">
                          <MapPin size={13} className="text-brand-neonblue shrink-0" />
                          <span>To: {req.Branch?.name || "Branch"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted">
                          <User size={12} className="shrink-0" />
                          <span>Req by: {req.Requester?.username} ({req.Requester?.role || "Staff"})</span>
                        </div>
                      </div>

                      {/* Middle: Product & Source Stock */}
                      <div className="flex flex-col gap-1 flex-1 min-w-[260px]">
                        <h4 className="text-sm font-rajdhani font-black text-main leading-snug">
                          {req.Product?.name || "Product"}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-muted font-mono">
                          <span>SKU: {req.Product?.sku || "N/A"}</span>
                          <span>•</span>
                          <span>Source: {req.SourceBranch ? req.SourceBranch.name : "HQ Central Warehouse"}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-muted uppercase">Warehouse Available:</span>
                          <span className={`text-xs font-black ${(req.Product?.available_quantity || 0) < req.quantity_requested ? "text-rose-400" : "text-emerald-400"}`}>
                            {req.Product?.available_quantity ?? 0} in stock
                          </span>
                        </div>
                      </div>

                      {/* Quantities Column */}
                      <div className="text-left xl:text-center min-w-[140px]">
                        <div className="text-[10px] uppercase font-black text-muted tracking-wider mb-0.5">Quantities</div>
                        <div className="text-xs font-bold text-main">
                          Requested: <span className="font-black text-sm">{req.quantity_requested}</span>
                        </div>
                        {req.quantity_approved !== null && (
                          <div className="text-[11px] font-bold text-brand-neonblue">
                            Approved: {req.quantity_approved}
                          </div>
                        )}
                        {req.quantity_fulfilled !== null && (
                          <div className="text-[11px] font-bold text-teal-400">
                            Fulfilled: {req.quantity_fulfilled}
                          </div>
                        )}
                      </div>

                      {/* Status and Actions Column */}
                      <div className="flex flex-col sm:flex-row xl:flex-col items-start xl:items-end gap-2.5 w-full xl:w-auto shrink-0">
                        {/* Status Badge */}
                        <div className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5 ${statusInfo.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {/* Details Drawer Button */}
                          <button
                            onClick={() => handleOpenDetails(req)}
                            className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-lg border border-border bg-brand-bgbase hover:border-brand-neonblue/40 transition-colors flex items-center gap-1 text-main"
                          >
                            <FileText size={12} /> Details
                          </button>

                          {/* PENDING Actions: Approve / Reject */}
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleOpenApprove(req)}
                                className="text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg bg-brand-neonblue text-white dark:text-brand-navy hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm"
                              >
                                <ThumbsUp size={12} /> Approve
                              </button>
                              <button
                                onClick={() => handleOpenReject(req)}
                                className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors flex items-center gap-1"
                              >
                                <ThumbsDown size={12} /> Reject
                              </button>
                            </>
                          )}

                          {/* APPROVED Actions: Process / Fulfill */}
                          {isApproved && (
                            <>
                              <button
                                onClick={() => handleSetProcessing(req)}
                                className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center gap-1"
                              >
                                <Truck size={12} /> Process
                              </button>
                              <button
                                onClick={() => handleOpenFulfill(req)}
                                className="text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg bg-teal-500 text-white dark:text-brand-navy hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm"
                              >
                                <CheckCircle2 size={12} /> Fulfill
                              </button>
                              <button
                                onClick={() => handleOpenReject(req)}
                                className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* PROCESSING Actions: Fulfill */}
                          {isProcessing && (
                            <>
                              <button
                                onClick={() => handleOpenFulfill(req)}
                                className="text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg bg-teal-500 text-white dark:text-brand-navy hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm"
                              >
                                <CheckCircle2 size={12} /> Complete Fulfillment
                              </button>
                              <button
                                onClick={() => handleOpenReject(req)}
                                className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                              >
                                Reject
                              </button>
                            </>
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

      {/* ── APPROVE MODAL ── */}
      <AnimatePresence>
        {showApproveModal && activeRequest && (
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
                    Super Admin Authorization
                  </span>
                  <h3 className="text-lg font-rajdhani font-black text-main mt-1">
                    APPROVE STOCK REQUEST
                  </h3>
                  <p className="text-xs font-mono text-muted">{activeRequest.request_number}</p>
                </div>
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-main"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5">
                {/* Request Overview */}
                <div className="bg-brand-bgbase border border-border p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Destination Branch:</span>
                    <span className="font-bold text-main">{activeRequest.Branch?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Product:</span>
                    <span className="font-bold text-main truncate max-w-[240px]">{activeRequest.Product?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Requested Quantity:</span>
                    <span className="font-black font-rajdhani text-sm text-main">{activeRequest.quantity_requested}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Warehouse Available:</span>
                    <span className={`font-black font-rajdhani text-sm ${(activeRequest.Product?.available_quantity || 0) < activeRequest.quantity_requested ? "text-rose-400" : "text-emerald-400"}`}>
                      {activeRequest.Product?.available_quantity ?? 0}
                    </span>
                  </div>
                </div>

                {/* Approved Quantity Input (Partial Approval) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">
                      Authorized Quantity
                    </label>
                    <span className="text-[10px] text-brand-neonblue font-bold">
                      {approvedQty < activeRequest.quantity_requested ? "Partial Approval" : "Full Approval"}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={activeRequest.quantity_requested}
                    value={approvedQty}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setApprovedQty(Math.min(activeRequest.quantity_requested, Math.max(1, val)));
                    }}
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-base font-rajdhani font-black text-main focus:outline-none focus:border-brand-neonblue"
                  />
                  <p className="text-[10px] text-muted mt-1">
                    Super Admin can authorize a lower quantity than requested based on available stock.
                  </p>
                </div>

                {/* Optional Approval Notes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Approval Notes (Optional)
                  </label>
                  <textarea
                    rows="2"
                    maxLength={500}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="E.g. Approved 6 units; remaining 4 units will be fulfilled on next shipment..."
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-2.5 px-3 text-xs text-main focus:outline-none focus:border-brand-neonblue"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowApproveModal(false)}
                    className="flex-1 py-3 rounded-xl border border-border text-xs font-black uppercase tracking-wider text-main hover:bg-brand-bgbase"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading || (activeRequest.Product?.available_quantity || 0) < approvedQty}
                    onClick={handleApprove}
                    className="flex-1 py-3 rounded-xl bg-brand-neonblue text-white dark:text-brand-navy text-xs font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 shadow-sm"
                  >
                    {actionLoading ? "Authorizing..." : "Approve & Reserve Stock"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── REJECT MODAL ── */}
      <AnimatePresence>
        {showRejectModal && activeRequest && (
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-400/10 px-2.5 py-0.5 rounded">
                    Super Admin Action
                  </span>
                  <h3 className="text-lg font-rajdhani font-black text-main mt-1">
                    REJECT STOCK REQUEST
                  </h3>
                  <p className="text-xs font-mono text-muted">{activeRequest.request_number}</p>
                </div>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-main"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <p className="text-xs text-muted">
                  A rejection reason is strictly required and will be permanently recorded in the audit trail and visible to the requester.
                </p>

                {/* Preset Reason Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Select Rejection Reason Template
                  </label>
                  <select
                    value={rejectionPreset}
                    onChange={(e) => setRejectionPreset(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-3 text-xs font-medium text-main focus:outline-none focus:border-rose-400"
                  >
                    {REJECTION_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Additional Explanation */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Additional Explanation / Instructions
                  </label>
                  <textarea
                    rows="3"
                    maxLength={500}
                    value={rejectionCustomText}
                    onChange={(e) => setRejectionCustomText(e.target.value)}
                    placeholder="Add specific details or instructions for the requesting branch manager..."
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-2.5 px-3 text-xs text-main focus:outline-none focus:border-rose-400"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 py-3 rounded-xl border border-border text-xs font-black uppercase tracking-wider text-main hover:bg-brand-bgbase"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleReject}
                    className="flex-1 py-3 rounded-xl bg-rose-500 text-white text-xs font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 shadow-sm"
                  >
                    {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FULFILL MODAL ── */}
      <AnimatePresence>
        {showFulfillModal && activeRequest && (
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-400/10 px-2.5 py-0.5 rounded">
                    Atomic Inventory Transfer
                  </span>
                  <h3 className="text-lg font-rajdhani font-black text-main mt-1">
                    CONFIRM STOCK FULFILLMENT
                  </h3>
                  <p className="text-xs font-mono text-muted">{activeRequest.request_number}</p>
                </div>
                <button
                  onClick={() => setShowFulfillModal(false)}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-main"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div className="bg-brand-bgbase border border-border p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Source:</span>
                    <span className="font-bold text-main">
                      {activeRequest.SourceBranch?.name || "HQ Central Warehouse"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Destination:</span>
                    <span className="font-bold text-main">{activeRequest.Branch?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Product:</span>
                    <span className="font-bold text-main">{activeRequest.Product?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Approved Quantity:</span>
                    <span className="font-black text-sm text-teal-400">
                      {activeRequest.quantity_approved || activeRequest.quantity_requested} units
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-xs text-teal-400">
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={15} /> Inventory Integrity Guaranteed
                  </p>
                  <p className="text-[11px] leading-relaxed text-teal-300/80">
                    Executing fulfillment will atomically deduct {activeRequest.quantity_approved || activeRequest.quantity_requested} units from the source inventory and add them to the destination branch inventory.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowFulfillModal(false)}
                    className="flex-1 py-3 rounded-xl border border-border text-xs font-black uppercase tracking-wider text-main hover:bg-brand-bgbase"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleConfirmFulfill}
                    className="flex-1 py-3 rounded-xl bg-teal-500 text-white dark:text-brand-navy text-xs font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-40 shadow-sm"
                  >
                    {actionLoading ? "Transferring..." : "Fulfill & Update Stock"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DETAILS DOSSIER DRAWER ── */}
      <AnimatePresence>
        {showDetailsDrawer && activeRequest && (
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-xl bg-brand-surface border-l border-border h-full flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-border flex items-center justify-between shrink-0 bg-brand-surface">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-brand-neonblue bg-brand-neonblue/10 px-2 py-0.5 rounded">
                      {activeRequest.request_number}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusBadge(activeRequest.status).cls}`}>
                      {getStatusBadge(activeRequest.status).label}
                    </span>
                  </div>
                  <h3 className="text-lg font-rajdhani font-black text-main mt-1 uppercase">
                    Stock Request Dossier
                  </h3>
                </div>
                <button
                  onClick={() => setShowDetailsDrawer(false)}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-main"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 text-main">
                {/* 1. Request Overview */}
                <div className="bg-brand-bgbase border border-border rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <ClipboardList size={14} className="text-brand-neonblue" /> Request Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted block text-[10px]">Destination Branch</span>
                      <span className="font-bold text-main">{activeRequest.Branch?.name}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">Source Branch / Warehouse</span>
                      <span className="font-bold text-main">{activeRequest.SourceBranch?.name || "HQ Central Warehouse"}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">Requester</span>
                      <span className="font-bold text-main">{activeRequest.Requester?.username} ({activeRequest.Requester?.role})</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">Date Submitted</span>
                      <span className="font-bold text-main">{new Date(activeRequest.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">Priority</span>
                      <span className="font-bold uppercase text-main">{activeRequest.priority}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[10px]">Current Status</span>
                      <span className="font-bold uppercase text-main">{activeRequest.status}</span>
                    </div>
                  </div>
                  {activeRequest.notes && (
                    <div className="mt-2 pt-2 border-t border-border/60 text-xs">
                      <span className="text-muted block text-[10px]">Requester Notes</span>
                      <p className="italic text-main/80 mt-0.5">{activeRequest.notes}</p>
                    </div>
                  )}
                </div>

                {/* 2. Item & Quantities */}
                <div className="bg-brand-bgbase border border-border rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Package size={14} className="text-brand-neonblue" /> Requested Product
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-surface border border-border flex items-center justify-center shrink-0">
                      <Package size={22} className="text-brand-neonblue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-sm text-main truncate">{activeRequest.Product?.name}</h5>
                      <p className="text-xs text-muted font-mono">SKU: {activeRequest.Product?.sku}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center">
                    <div className="bg-brand-surface p-2.5 rounded-xl border border-border">
                      <p className="text-[9px] uppercase font-black text-muted">Requested</p>
                      <p className="text-base font-rajdhani font-black text-main">{activeRequest.quantity_requested}</p>
                    </div>
                    <div className="bg-brand-surface p-2.5 rounded-xl border border-border">
                      <p className="text-[9px] uppercase font-black text-muted">Approved</p>
                      <p className="text-base font-rajdhani font-black text-brand-neonblue">{activeRequest.quantity_approved ?? "—"}</p>
                    </div>
                    <div className="bg-brand-surface p-2.5 rounded-xl border border-border">
                      <p className="text-[9px] uppercase font-black text-muted">Fulfilled</p>
                      <p className="text-base font-rajdhani font-black text-teal-400">{activeRequest.quantity_fulfilled ?? "—"}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Approval / Rejection Info */}
                {(activeRequest.approved_by || activeRequest.rejection_reason || activeRequest.approval_notes) && (
                  <div className="bg-brand-bgbase border border-border rounded-2xl p-5 space-y-2.5 text-xs">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-brand-neonblue" /> Review Details
                    </h4>
                    {activeRequest.Approver && (
                      <div className="flex justify-between">
                        <span className="text-muted">Reviewed By:</span>
                        <span className="font-bold text-main">{activeRequest.Approver.username} (Super Admin)</span>
                      </div>
                    )}
                    {activeRequest.approved_at && (
                      <div className="flex justify-between">
                        <span className="text-muted">Approved At:</span>
                        <span className="font-bold text-main">{new Date(activeRequest.approved_at).toLocaleString()}</span>
                      </div>
                    )}
                    {activeRequest.approval_notes && (
                      <div className="pt-2 border-t border-border/60">
                        <span className="text-muted block text-[10px]">Approval Notes</span>
                        <p className="text-main mt-0.5">{activeRequest.approval_notes}</p>
                      </div>
                    )}
                    {activeRequest.rejection_reason && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 mt-2">
                        <span className="text-[10px] uppercase font-black tracking-wider block">Rejection Reason</span>
                        <p className="font-medium mt-0.5">{activeRequest.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Activity & Audit Trail Timeline */}
                <div className="bg-brand-bgbase border border-border rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <History size={14} className="text-brand-neonblue" /> Lifecycle Activity Trail
                  </h4>

                  {auditLoading ? (
                    <div className="py-6 flex justify-center">
                      <div className="w-6 h-6 border-2 border-border border-t-brand-neonblue rounded-full animate-spin" />
                    </div>
                  ) : requestAuditTrail.length === 0 ? (
                    <p className="text-xs text-muted italic">No audit trail logged yet.</p>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                      {requestAuditTrail.map((log) => (
                        <div key={log.id} className="relative pl-8 text-xs">
                          <div className="absolute left-2 top-1 w-3.5 h-3.5 rounded-full bg-brand-surface border-2 border-brand-neonblue -translate-x-1/2" />
                          <div className="flex items-center justify-between text-[10px] text-muted">
                            <span className="font-black font-mono text-brand-neonblue uppercase">{log.action}</span>
                            <span>{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-main font-medium mt-0.5">{log.details}</p>
                          <span className="text-[10px] text-muted/70 block mt-0.5">
                            By {log.User ? `${log.User.username} [${log.User.role}]` : "System"}
                          </span>
                        </div>
                      ))}
                    </div>
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
