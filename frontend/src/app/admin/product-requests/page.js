"use client";

import { useState, useEffect, useMemo } from "react";
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
  ArrowLeft,
  ShieldCheck,
  Check,
  X,
  Building2,
  CheckSquare,
  Square,
  CheckCheck,
  ChevronRight,
  Sparkles,
  Filter,
  AlertTriangle
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";

export default function AdminProductRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [branchSummaries, setBranchSummaries] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Pending");
  const [selectedBranch, setSelectedBranch] = useState(null); // null = Cards View, Branch object = Drill-down List
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("");

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [showBatchRejectModal, setShowBatchRejectModal] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState("");

  // Single Action Modals & Drawer States
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
    "Request quantity exceeds branch quota",
    "Duplicate request submitted",
    "Product unavailable or discontinued",
    "Request requires inventory correction / resubmission",
    "Other reason"
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    await Promise.all([fetchBranchSummary(), fetchRequests(), fetchBranches()]);
  };

  const fetchBranchSummary = async () => {
    const token = localStorage.getItem("token");
    try {
      setSummaryLoading(true);
      const res = await fetch(apiUrl("/api/product-requests/branch-summary"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setBranchSummaries(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Summary error:", err);
    } finally {
      setSummaryLoading(false);
    }
  };

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

  // ── Single Approval Handler ──
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

    const isPendingAdmin = (activeRequest.status || "").toUpperCase() === "PENDING_ADMIN";
    const available = activeRequest.source_branch_id
      ? 999
      : (activeRequest.Product?.available_quantity ?? 0);

    if (!isPendingAdmin && !activeRequest.source_branch_id && available < approvedQty) {
      showError(`Insufficient warehouse stock. Only ${available} available.`);
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const endpoint = isPendingAdmin
        ? `/api/product-requests/${activeRequest.id}/branch-approve`
        : `/api/product-requests/${activeRequest.id}/approve`;

      const bodyData = isPendingAdmin
        ? { approval_notes: approvalNotes }
        : { quantity_approved: approvedQty, approval_notes: approvalNotes };

      const res = await fetch(apiUrl(endpoint), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(
          isPendingAdmin
            ? `Stock Request ${activeRequest.request_number} endorsed & forwarded to HQ!`
            : `Stock Request ${activeRequest.request_number} approved successfully!`
        );
        setShowApproveModal(false);
        fetchRequests();
        fetchBranchSummary();
      } else {
        showError(data.message || "Approval failed.");
      }
    } catch (err) {
      showError("An error occurred during approval.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Single Rejection Handler ──
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

    const isPendingAdmin = (activeRequest?.status || "").toUpperCase() === "PENDING_ADMIN";
    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const endpoint = isPendingAdmin
        ? `/api/product-requests/${activeRequest.id}/branch-reject`
        : `/api/product-requests/${activeRequest.id}/reject`;

      const res = await fetch(apiUrl(endpoint), {
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
        fetchBranchSummary();
      } else {
        showError(data.message || "Rejection failed.");
      }
    } catch (err) {
      showError("An error occurred during rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Single Transition to Processing ──
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
        fetchBranchSummary();
      } else {
        showError(data.message || "Failed to update status.");
      }
    } catch (err) {
      showError("Error updating request status.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Single Fulfill Handler ──
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
        showSuccess(`Request ${activeRequest.request_number} fulfilled! ${data.transferred_quantity} units transferred to ${activeRequest.Branch?.name}.`);
        setShowFulfillModal(false);
        fetchRequests();
        fetchBranchSummary();
      } else {
        showError(data.message || "Fulfillment failed.");
      }
    } catch (err) {
      showError("An error occurred during fulfillment.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── BATCH ACTIONS (Approve / Reject Selected) ──
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    const selectedReqObjs = requests.filter(r => selectedIds.has(r.id));
    const hasPendingAdmin = selectedReqObjs.some(r => (r.status || "").toUpperCase() === "PENDING_ADMIN");

    const confirmed = await showConfirm(
      "Batch Approve Stock Requests",
      `Are you sure you want to approve ${selectedIds.size} stock request(s)?`,
      { confirmLabel: `Approve ${selectedIds.size} Requests` }
    );
    if (!confirmed) return;

    setBatchActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const endpoint = hasPendingAdmin
        ? "/api/product-requests/batch-branch-approve"
        : "/api/product-requests/batch-approve";

      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          approval_notes: hasPendingAdmin
            ? "Endorsed via Batch Approval"
            : "Authorized via Super Admin Batch Approval"
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || "Batch approval successful!");
        setSelectedIds(new Set());
        fetchRequests();
        fetchBranchSummary();
      } else {
        showError(data.message || "Batch approval encountered errors.");
      }
    } catch (err) {
      showError("Network error during batch approval.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchRejectSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    if (!batchRejectReason.trim()) {
      showError("Rejection reason is required.");
      return;
    }

    const selectedReqObjs = requests.filter(r => selectedIds.has(r.id));
    const hasPendingAdmin = selectedReqObjs.some(r => (r.status || "").toUpperCase() === "PENDING_ADMIN");

    setBatchActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const endpoint = hasPendingAdmin
        ? "/api/product-requests/batch-branch-reject"
        : "/api/product-requests/batch-reject";

      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          reason: batchRejectReason.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || "Batch reject completed.");
        setShowBatchRejectModal(false);
        setBatchRejectReason("");
        setSelectedIds(new Set());
        fetchRequests();
        fetchBranchSummary();
      } else {
        showError(data.message || "Batch reject failed.");
      }
    } catch (err) {
      showError("Network error during batch reject.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  // ── Checkbox Helpers for Drill-Down View ──
  const branchRequests = useMemo(() => {
    if (!selectedBranch) return [];
    return requests.filter(r => r.branch_id === selectedBranch.branch_id || r.branch_id === selectedBranch.id);
  }, [requests, selectedBranch]);

  const pendingBranchRequests = useMemo(() => {
    return branchRequests.filter(r => {
      const s = (r.status || "").toUpperCase();
      return s === "PENDING_SUPERADMIN" || s === "PENDING";
    });
  }, [branchRequests]);

  const allPendingSelected = pendingBranchRequests.length > 0 && pendingBranchRequests.every(r => selectedIds.has(r.id));
  const somePendingSelected = pendingBranchRequests.some(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingBranchRequests.map(r => r.id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Filtered requests within drill-down list
  const filteredBranchRequests = useMemo(() => {
    return branchRequests.filter(r => {
      const statusUpper = (r.status || "").toUpperCase();
      const reqNum = (r.request_number || "").toLowerCase();
      const prodName = (r.Product?.name || "").toLowerCase();
      const prodSku = (r.Product?.sku || "").toLowerCase();
      const requesterName = (r.Requester?.username || "").toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        !q ||
        reqNum.includes(q) ||
        prodName.includes(q) ||
        prodSku.includes(q) ||
        requesterName.includes(q);

      const matchesPriority = !selectedPriorityFilter || r.priority === selectedPriorityFilter;

      let matchesTab = true;
      if (activeTab === "Pending") {
        matchesTab = statusUpper === "PENDING_SUPERADMIN" || statusUpper === "PENDING";
      } else if (activeTab === "Approved") {
        matchesTab = statusUpper === "APPROVED" || statusUpper === "PARTIALLY_APPROVED";
      } else if (activeTab === "Processing") {
        matchesTab = statusUpper === "PROCESSING" || statusUpper === "SCHEDULED";
      } else if (activeTab === "Fulfilled") {
        matchesTab = statusUpper === "FULFILLED" || statusUpper === "COMPLETED";
      } else if (activeTab === "Rejected") {
        matchesTab = statusUpper === "REJECTED";
      }

      return matchesSearch && matchesPriority && matchesTab;
    });
  }, [branchRequests, searchQuery, selectedPriorityFilter, activeTab]);

  // Overall Global KPI calculation
  const totalPendingHQ = requests.filter(r => {
    const s = (r.status || "").toUpperCase();
    return s === "PENDING_SUPERADMIN" || s === "PENDING";
  }).length;
  const totalApproved = requests.filter(r => ["APPROVED", "PARTIALLY_APPROVED"].includes((r.status || "").toUpperCase())).length;
  const totalProcessing = requests.filter(r => ["PROCESSING", "SCHEDULED"].includes((r.status || "").toUpperCase())).length;
  const totalFulfilled = requests.filter(r => ["FULFILLED", "COMPLETED"].includes((r.status || "").toUpperCase())).length;
  const totalBranchesCount = branchSummaries.length;

  const tabs = ["Pending", "Approved", "Processing", "Fulfilled", "Rejected", "All"];

  const getStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "PENDING_ADMIN":
        return { label: "Pending Branch Admin", cls: "text-orange-400 border-orange-400/20 bg-orange-400/10", dot: "bg-orange-400" };
      case "PENDING_SUPERADMIN":
      case "PENDING":
        return { label: "Pending HQ Review", cls: "text-amber-400 border-amber-400/20 bg-amber-400/10", dot: "bg-amber-400" };
      case "APPROVED":
        return { label: "Approved / Reserved", cls: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10", dot: "bg-emerald-400" };
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

            {/* Breadcrumb Navigation Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-black tracking-[3px] uppercase text-brand-neonblue bg-brand-neonblue/10 px-2.5 py-0.5 rounded">
                    Central Authority • Super Admin
                  </span>
                  {selectedBranch && (
                    <>
                      <span className="text-muted text-xs">/</span>
                      <button
                        onClick={() => { setSelectedBranch(null); setSelectedIds(new Set()); }}
                        className="text-[10px] font-black uppercase tracking-wider text-muted hover:text-brand-neonblue transition-colors flex items-center gap-1"
                      >
                        <ArrowLeft size={11} /> All Branches
                      </button>
                      <span className="text-muted text-xs">/</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-main bg-brand-surface border border-border px-2 py-0.5 rounded">
                        {selectedBranch.branch_name || selectedBranch.name}
                      </span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl font-rajdhani font-black uppercase tracking-wide flex items-center gap-2">
                  {selectedBranch ? (
                    <>
                      <span>{selectedBranch.branch_name || selectedBranch.name}</span>
                      <span className="text-brand-neonblue">— STOCK REQUESTS</span>
                    </>
                  ) : (
                    <>
                      <span>BRANCH RESTOCK</span>
                      <span className="text-brand-neonblue">DASHBOARD</span>
                    </>
                  )}
                </h1>
                <p className="text-xs text-muted font-medium mt-1">
                  {selectedBranch
                    ? `Reviewing requests submitted from ${selectedBranch.branch_name || selectedBranch.name}. Authorize batch or single approvals and fulfill warehouse stock.`
                    : "Select a branch below to review its restock requests, endorse quantities, and fulfill inventory."
                  }
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedBranch && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setSelectedBranch(null); setSelectedIds(new Set()); }}
                    className="btn-ghost py-2.5 px-4 h-auto text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5"
                  >
                    <ArrowLeft size={13} /> Back to Branches
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={fetchInitialData}
                  className="btn-ghost py-2.5 px-4 h-auto text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5"
                >
                  <RotateCcw size={13} className={loading || summaryLoading ? "animate-spin" : ""} /> Refresh
                </motion.button>
              </div>
            </div>

            {/* KPI Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-brand-surface border border-border p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-main/40 uppercase tracking-widest">Active Branches</p>
                  <div className="w-8 h-8 rounded-lg bg-brand-neonblue/10 flex items-center justify-center text-brand-neonblue">
                    <Building2 size={16} />
                  </div>
                </div>
                <p className="text-3xl font-rajdhani font-black text-main">{totalBranchesCount}</p>
                <p className="text-[10px] text-muted mt-1">Branch locations registered</p>
              </div>

              <div className="bg-brand-surface border border-amber-400/30 p-5 rounded-2xl shadow-sm bg-gradient-to-br from-amber-400/5 to-transparent">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Awaiting HQ Action</p>
                  <div className="w-8 h-8 rounded-lg bg-amber-400/15 flex items-center justify-center text-amber-500">
                    <ClipboardList size={16} />
                  </div>
                </div>
                <p className="text-3xl font-rajdhani font-black text-amber-500">{totalPendingHQ}</p>
                <p className="text-[10px] text-muted mt-1">Pending Super Admin review</p>
              </div>

              <div className="bg-brand-surface border border-border p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-main/40 uppercase tracking-widest">Authorized / Reserved</p>
                  <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center text-emerald-400">
                    <Box size={16} />
                  </div>
                </div>
                <p className="text-3xl font-rajdhani font-black text-emerald-400">{totalApproved}</p>
                <p className="text-[10px] text-muted mt-1">Ready for fulfillment</p>
              </div>

              <div className="bg-brand-surface border border-border p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-main/40 uppercase tracking-widest">Fulfilled Transferred</p>
                  <div className="w-8 h-8 rounded-lg bg-teal-400/10 flex items-center justify-center text-teal-400">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <p className="text-3xl font-rajdhani font-black text-teal-400">{totalFulfilled}</p>
                <p className="text-[10px] text-muted mt-1">Completed stock transfers</p>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* VIEW 1: BRANCH CARDS OVERVIEW (When no branch is selected)         */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {!selectedBranch && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-rajdhani font-bold uppercase tracking-wider text-main flex items-center gap-2">
                    <Building2 size={16} className="text-brand-neonblue" /> Branches Overview
                  </h2>
                  <span className="text-xs text-muted">Click a branch to view its stock request queue</span>
                </div>

                {summaryLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-2 border-border border-t-brand-neonblue rounded-full animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted">Loading branch queues...</p>
                  </div>
                ) : branchSummaries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-brand-surface border border-dashed border-border rounded-2xl">
                    <Building2 size={40} className="text-main/20 mb-3" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-main">No Branches Registered</h3>
                    <p className="text-xs text-muted mt-1">Add branches in the Admin section to view restock requests.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {branchSummaries.map((b) => {
                      const hasPending = b.pending_superadmin_count > 0;
                      return (
                        <motion.div
                          key={b.branch_id}
                          whileHover={{ y: -4, transition: { duration: 0.2 } }}
                          onClick={() => {
                            setSelectedBranch(b);
                            setSelectedIds(new Set());
                            setActiveTab("Pending");
                          }}
                          className={`cursor-pointer bg-brand-surface border rounded-3xl p-6 shadow-sm transition-all relative overflow-hidden flex flex-col justify-between ${
                            hasPending
                              ? "border-amber-400/40 hover:border-amber-400 ring-1 ring-amber-400/20"
                              : "border-border hover:border-brand-neonblue/40"
                          }`}
                        >
                          {/* Top Glow Accent for pending */}
                          {hasPending && (
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
                          )}

                          <div>
                            {/* Branch Title & Location */}
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-rajdhani font-black text-main uppercase tracking-wide truncate">
                                    {b.branch_name}
                                  </h3>
                                  {b.has_urgent && (
                                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-pulse">
                                      URGENT
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                                  <MapPin size={12} className="text-brand-neonblue shrink-0" />
                                  <span className="truncate">{b.branch_location || "Location unset"}</span>
                                </p>
                              </div>

                              {/* Pending Badge */}
                              <div className={`shrink-0 px-3 py-1.5 rounded-xl border text-center ${
                                hasPending
                                  ? "bg-amber-400/15 border-amber-400/30 text-amber-500 font-black"
                                  : "bg-brand-bgbase border-border text-muted font-bold"
                              }`}>
                                <span className="text-base font-rajdhani font-black block leading-none">
                                  {b.pending_superadmin_count}
                                </span>
                                <span className="text-[8px] uppercase tracking-widest block mt-0.5">
                                  Pending
                                </span>
                              </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-3 gap-2.5 py-3 border-y border-border/40 text-center my-3 bg-brand-bgbase/40 rounded-xl">
                              <div>
                                <span className="text-[9px] font-black uppercase text-muted tracking-wider block">Units Pending</span>
                                <span className="text-sm font-rajdhani font-black text-main">
                                  {b.total_pending_units || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase text-muted tracking-wider block">Approved</span>
                                <span className="text-sm font-rajdhani font-black text-emerald-400">
                                  {b.approved_count || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] font-black uppercase text-muted tracking-wider block">Fulfilled</span>
                                <span className="text-sm font-rajdhani font-black text-teal-400">
                                  {b.fulfilled_count || 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Footer action */}
                          <div className="flex items-center justify-between pt-3 mt-1 text-xs">
                            <span className="text-[10px] text-muted font-medium">
                              {b.total_requests} total request{b.total_requests === 1 ? '' : 's'}
                            </span>
                            <div className="flex items-center gap-1 text-brand-neonblue font-bold text-xs group-hover:translate-x-1 transition-transform">
                              <span>Open Request List</span>
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* VIEW 2: DRILL-DOWN BRANCH REQUESTS LIST (When a branch is selected)*/}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {selectedBranch && (
              <div>
                {/* Branch Info Header Card */}
                <div className="bg-brand-surface border border-border rounded-3xl p-6 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-neonblue/10 border border-brand-neonblue/20 flex items-center justify-center text-brand-neonblue">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-rajdhani font-black uppercase text-main">
                        {selectedBranch.branch_name || selectedBranch.name}
                      </h2>
                      <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                        <MapPin size={12} className="text-brand-neonblue" />
                        <span>{selectedBranch.branch_location || selectedBranch.location || "Branch Location"}</span>
                        {selectedBranch.phone && <span>• {selectedBranch.phone}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
                    <div className="px-4 py-2 bg-amber-400/10 border border-amber-400/20 rounded-2xl text-center">
                      <span className="text-lg font-rajdhani font-black text-amber-500 block leading-none">
                        {pendingBranchRequests.length}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-500/80">
                        Pending HQ Review
                      </span>
                    </div>
                  </div>
                </div>

                {/* Filter and Tab Bar */}
                <div className="bg-brand-surface border border-border rounded-2xl p-4 mb-4 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm">
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
                        placeholder="Search product, SKU, request #..."
                        className="w-full bg-brand-bgbase border border-border rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-main focus:outline-none focus:border-brand-neonblue/40 transition-all"
                      />
                    </div>

                    {/* Priority filter */}
                    <select
                      value={selectedPriorityFilter}
                      onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                      className="bg-brand-bgbase border border-border rounded-xl py-2 px-3 text-xs font-medium text-main focus:outline-none focus:border-brand-neonblue/40 transition-colors"
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
                        className={`h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
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

                {/* ── BATCH ACTION BAR (Shown when 1 or more items are selected) ── */}
                <AnimatePresence>
                  {selectedIds.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 flex items-center justify-between gap-4 px-5 py-3 bg-brand-neonblue/10 border border-brand-neonblue/30 rounded-2xl shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <CheckSquare size={18} className="text-brand-neonblue" />
                        <span className="text-xs font-bold text-main">
                          <strong className="text-brand-neonblue font-black">{selectedIds.size}</strong> request{selectedIds.size > 1 ? 's' : ''} selected
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleBatchApprove}
                          disabled={batchActionLoading}
                          className="h-8 px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCheck size={14} /> Approve Selected
                        </button>
                        <button
                          onClick={() => setShowBatchRejectModal(true)}
                          disabled={batchActionLoading}
                          className="h-8 px-4 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                        >
                          <XCircle size={14} /> Reject Selected
                        </button>
                        <button
                          onClick={() => setSelectedIds(new Set())}
                          className="h-8 px-3 rounded-xl border border-border text-xs font-medium text-muted hover:text-main"
                        >
                          Clear
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Requests Table */}
                <div className="bg-brand-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border bg-brand-bgbase/60 text-[10px] font-black text-muted uppercase tracking-wider">
                          {/* Checkbox Column for Select All */}
                          <th className="py-3.5 px-4 w-12 text-center">
                            <button
                              onClick={toggleSelectAll}
                              title={allPendingSelected ? "Deselect all pending" : "Select all pending"}
                              className="text-muted hover:text-main transition-colors"
                            >
                              {allPendingSelected ? (
                                <CheckSquare size={16} className="text-brand-neonblue" />
                              ) : somePendingSelected ? (
                                <CheckSquare size={16} className="text-brand-neonblue/50" />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </th>
                          <th className="py-3.5 px-4">Request # & Date</th>
                          <th className="py-3.5 px-4">Product Details</th>
                          <th className="py-3.5 px-4">Requester / Endorser</th>
                          <th className="py-3.5 px-4 text-center">Qty Requested</th>
                          <th className="py-3.5 px-4">Stock Available</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {loading ? (
                          <tr>
                            <td colSpan="8" className="py-16 text-center text-xs font-bold text-muted animate-pulse">
                              Loading branch requests...
                            </td>
                          </tr>
                        ) : filteredBranchRequests.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="py-16 text-center">
                              <ClipboardList size={32} className="mx-auto text-main/20 mb-2" />
                              <p className="text-sm font-bold text-main">No Stock Requests in this view</p>
                              <p className="text-xs text-muted mt-0.5">Try selecting another tab or clearing search filters.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredBranchRequests.map((req) => {
                            const statusInfo = getStatusBadge(req.status);
                            const statusUpper = (req.status || "").toUpperCase();
                            const isPendingHQ = statusUpper === "PENDING_SUPERADMIN" || statusUpper === "PENDING";
                            const isApproved = statusUpper === "APPROVED" || statusUpper === "PARTIALLY_APPROVED";
                            const isProcessing = statusUpper === "PROCESSING" || statusUpper === "SCHEDULED";
                            const isSelected = selectedIds.has(req.id);
                            const warehouseAvailable = req.Product?.available_quantity ?? 0;
                            const isStockSufficient = warehouseAvailable >= req.quantity_requested;

                            return (
                              <tr
                                key={req.id}
                                className={`transition-colors ${
                                  isSelected ? "bg-brand-neonblue/5" : "hover:bg-brand-bgbase/40"
                                }`}
                              >
                                {/* Checkbox */}
                                <td className="py-4 px-4 text-center">
                                  {isPendingHQ ? (
                                    <button
                                      onClick={() => toggleSelectOne(req.id)}
                                      className="text-muted hover:text-brand-neonblue transition-colors"
                                    >
                                      {isSelected ? (
                                        <CheckSquare size={16} className="text-brand-neonblue" />
                                      ) : (
                                        <Square size={16} />
                                      )}
                                    </button>
                                  ) : (
                                    <span className="text-muted/30">—</span>
                                  )}
                                </td>

                                {/* Request # & Date */}
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-black text-brand-neonblue">
                                      {req.request_number}
                                    </span>
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${getPriorityBadge(req.priority)}`}>
                                      {req.priority}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-muted mt-0.5">
                                    {new Date(req.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                                  </div>
                                </td>

                                {/* Product Details */}
                                <td className="py-4 px-4 max-w-[220px]">
                                  <p className="text-xs font-black text-main truncate" title={req.Product?.name}>
                                    {req.Product?.name}
                                  </p>
                                  <p className="text-[10px] text-muted font-mono">
                                    SKU: {req.Product?.sku || "N/A"}
                                  </p>
                                  {req.notes && (
                                    <p className="text-[10px] text-muted/70 italic truncate mt-0.5" title={req.notes}>
                                      "{req.notes}"
                                    </p>
                                  )}
                                </td>

                                {/* Requester / Endorser */}
                                <td className="py-4 px-4 text-xs">
                                  <div className="text-main font-bold">
                                    @{req.Requester?.username} <span className="text-[10px] text-muted">({req.Requester?.role === 'employee' ? 'Staff' : 'Admin'})</span>
                                  </div>
                                  {req.BranchApprover && (
                                    <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 mt-0.5">
                                      <ShieldCheck size={11} /> Endorsed by @{req.BranchApprover.username}
                                    </div>
                                  )}
                                </td>

                                {/* Qty Requested / Approved */}
                                <td className="py-4 px-4 text-center">
                                  <span className="text-sm font-rajdhani font-black text-main">
                                    {req.quantity_requested}
                                  </span>
                                  {req.quantity_approved && req.quantity_approved !== req.quantity_requested && (
                                    <span className="block text-[10px] text-brand-neonblue font-bold">
                                      Appr: {req.quantity_approved}
                                    </span>
                                  )}
                                </td>

                                {/* Stock Available */}
                                <td className="py-4 px-4 text-xs">
                                  <span className={`font-black ${isStockSufficient ? "text-emerald-400" : "text-rose-400"}`}>
                                    {warehouseAvailable} in HQ
                                  </span>
                                  {!isStockSufficient && (
                                    <span className="block text-[9px] text-rose-400/80 font-bold">Low WH Stock</span>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="py-4 px-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusInfo.cls}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                    {statusInfo.label}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="py-4 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    {/* Details Button */}
                                    <button
                                      onClick={() => handleOpenDetails(req)}
                                      className="px-2 py-1 rounded-lg border border-border text-[10px] font-bold text-muted hover:text-main hover:bg-brand-bgbase transition-colors"
                                      title="View Details & Audit Trail"
                                    >
                                      Details
                                    </button>

                                    {/* PENDING HQ Actions */}
                                    {isPendingHQ && (
                                      <>
                                        <button
                                          onClick={() => handleOpenApprove(req)}
                                          className="px-2.5 py-1 rounded-lg bg-brand-neonblue text-white dark:text-brand-navy text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleOpenReject(req)}
                                          className="px-2 py-1 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-wider hover:bg-rose-500/20 transition-colors"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}

                                    {/* APPROVED Actions */}
                                    {isApproved && (
                                      <>
                                        <button
                                          onClick={() => handleSetProcessing(req)}
                                          className="px-2 py-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/20 transition-colors"
                                        >
                                          Dispatch
                                        </button>
                                        <button
                                          onClick={() => handleOpenFulfill(req)}
                                          className="px-2.5 py-1 rounded-lg bg-teal-500 text-white dark:text-brand-navy text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
                                        >
                                          Fulfill
                                        </button>
                                      </>
                                    )}

                                    {/* PROCESSING Actions */}
                                    {isProcessing && (
                                      <button
                                        onClick={() => handleOpenFulfill(req)}
                                        className="px-2.5 py-1 rounded-lg bg-teal-500 text-white dark:text-brand-navy text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
                                      >
                                        Complete
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── SINGLE APPROVE MODAL ── */}
      <AnimatePresence>
        {showApproveModal && activeRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-brand-surface border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-main"
            >
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

              <div className="p-6 space-y-5">
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
                    <span className="font-black font-rajdhani text-sm text-main">{activeRequest.quantity_requested} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">HQ Warehouse Available:</span>
                    <span className={`font-black font-rajdhani text-sm ${(activeRequest.Product?.available_quantity || 0) < activeRequest.quantity_requested ? "text-rose-400" : "text-emerald-400"}`}>
                      {activeRequest.Product?.available_quantity ?? 0} units
                    </span>
                  </div>
                </div>

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
                    className="w-full bg-brand-bgbase border border-border rounded-xl px-4 py-3 text-sm font-bold text-main focus:outline-none focus:border-brand-neonblue"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1.5">
                    Approval Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Instructions for packaging or warehouse dispatch..."
                    className="w-full bg-brand-bgbase border border-border rounded-xl px-4 py-3 text-xs text-main focus:outline-none focus:border-brand-neonblue resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 py-3 border border-border rounded-2xl text-xs font-bold text-muted hover:text-main"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleApprove}
                  className="flex-1 py-3 bg-brand-neonblue text-white dark:text-brand-navy rounded-2xl text-xs font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? "Processing..." : "Authorize Stock"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SINGLE REJECT MODAL ── */}
      <AnimatePresence>
        {showRejectModal && activeRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-brand-surface border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-main"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-rajdhani font-black text-rose-400">
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

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1.5">
                    Preset Rejection Reason
                  </label>
                  <select
                    value={rejectionPreset}
                    onChange={(e) => setRejectionPreset(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border rounded-xl px-4 py-3 text-xs font-medium text-main focus:outline-none focus:border-brand-neonblue"
                  >
                    {REJECTION_PRESETS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1.5">
                    Custom Notes / Details *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectionCustomText}
                    onChange={(e) => setRejectionCustomText(e.target.value)}
                    placeholder="Provide specific details for the requester..."
                    className="w-full bg-brand-bgbase border border-border rounded-xl px-4 py-3 text-xs text-main focus:outline-none focus:border-rose-400 resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-3 border border-border rounded-2xl text-xs font-bold text-muted hover:text-main"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReject}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-rose-600 disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Confirm Rejection"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── BATCH REJECT MODAL ── */}
      <AnimatePresence>
        {showBatchRejectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface border border-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-main"
            >
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-rajdhani font-black text-rose-400">
                  BATCH REJECT ({selectedIds.size} REQUESTS)
                </h3>
                <p className="text-xs text-muted mt-1">
                  This rejection reason will apply to all selected items from this branch.
                </p>
              </div>

              <form onSubmit={handleBatchRejectSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1.5">
                    Reason for rejection *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={batchRejectReason}
                    onChange={(e) => setBatchRejectReason(e.target.value)}
                    placeholder="Enter comprehensive rejection reason..."
                    className="w-full bg-brand-bgbase border border-border rounded-xl px-4 py-3 text-xs text-main focus:outline-none focus:border-rose-400 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowBatchRejectModal(false); setBatchRejectReason(""); }}
                    className="flex-1 py-3 border border-border rounded-2xl text-xs font-bold text-muted hover:text-main"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={batchActionLoading}
                    className="flex-1 py-3 bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-rose-600 disabled:opacity-50"
                  >
                    {batchActionLoading ? "Processing..." : `Reject ${selectedIds.size} Items`}
                  </button>
                </div>
              </form>
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
              className="bg-brand-surface border border-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-main"
            >
              <div className="p-6 border-b border-border">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-400/10 px-2.5 py-0.5 rounded">
                  Physical Inventory Movement
                </span>
                <h3 className="text-lg font-rajdhani font-black text-main mt-1">
                  CONFIRM STOCK FULFILLMENT
                </h3>
                <p className="text-xs font-mono text-muted">{activeRequest.request_number}</p>
              </div>

              <div className="p-6 space-y-3 text-xs">
                <div className="p-4 bg-brand-bgbase border border-border rounded-2xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted">Product:</span>
                    <span className="font-bold text-main">{activeRequest.Product?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Quantity to Transfer:</span>
                    <span className="font-black text-brand-neonblue">{activeRequest.quantity_approved || activeRequest.quantity_requested} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Destination:</span>
                    <span className="font-bold text-main">{activeRequest.Branch?.name}</span>
                  </div>
                </div>
                <p className="text-muted text-[11px] leading-relaxed">
                  Executing fulfillment will immediately deduct reserved units from HQ Central Warehouse and credit them to {activeRequest.Branch?.name}'s live branch inventory.
                </p>
              </div>

              <div className="p-6 border-t border-border flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowFulfillModal(false)}
                  className="flex-1 py-3 border border-border rounded-2xl text-xs font-bold text-muted hover:text-main"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmFulfill}
                  className="flex-1 py-3 bg-teal-500 text-white dark:text-brand-navy rounded-2xl text-xs font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading ? "Transferring..." : "Complete Transfer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DETAILS & AUDIT DRAWER ── */}
      <AnimatePresence>
        {showDetailsDrawer && activeRequest && (
          <div className="fixed inset-0 z-[110] flex justify-end bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="bg-brand-surface border-l border-border w-full max-w-lg h-full overflow-y-auto custom-scrollbar p-6 flex flex-col justify-between shadow-2xl text-main"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-neonblue">
                      Stock Request Lifecycle
                    </span>
                    <h3 className="text-lg font-rajdhani font-black text-main">
                      {activeRequest.request_number}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowDetailsDrawer(false)}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:text-main"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Details Breakdown */}
                <div className="py-5 space-y-4 text-xs">
                  <div className="p-4 bg-brand-bgbase border border-border rounded-2xl space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-muted">Destination Branch:</span>
                      <span className="font-bold text-main">{activeRequest.Branch?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Product SKU:</span>
                      <span className="font-mono text-main">{activeRequest.Product?.sku || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Requested By:</span>
                      <span className="font-bold text-main">@{activeRequest.Requester?.username}</span>
                    </div>
                    {activeRequest.BranchApprover && (
                      <div className="flex justify-between">
                        <span className="text-muted">Endorsed By Admin:</span>
                        <span className="font-bold text-emerald-500">@{activeRequest.BranchApprover?.username}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted">Priority:</span>
                      <span className="font-bold uppercase text-main">{activeRequest.priority}</span>
                    </div>
                  </div>

                  {activeRequest.notes && (
                    <div className="p-4 bg-brand-bgbase border border-border rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-muted tracking-wider block mb-1">Requester Notes</span>
                      <p className="text-main leading-relaxed">{activeRequest.notes}</p>
                    </div>
                  )}

                  {activeRequest.rejection_reason && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider block mb-1">Rejection Reason</span>
                      <p className="text-rose-400 leading-relaxed">{activeRequest.rejection_reason}</p>
                    </div>
                  )}

                  {/* Audit Trail Timeline */}
                  <div className="pt-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                      <History size={14} className="text-brand-neonblue" /> Audit Trail Ledger
                    </h4>
                    {auditLoading ? (
                      <p className="text-xs text-muted animate-pulse">Loading audit trail...</p>
                    ) : requestAuditTrail.length === 0 ? (
                      <p className="text-xs text-muted">No audit logs recorded yet.</p>
                    ) : (
                      <div className="space-y-3 pl-3 border-l-2 border-brand-neonblue/20">
                        {requestAuditTrail.map((log) => (
                          <div key={log.id} className="relative text-xs">
                            <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-brand-neonblue" />
                            <p className="font-bold text-main">{log.action.replace(/_/g, " ")}</p>
                            <p className="text-[11px] text-muted">{log.details}</p>
                            <span className="text-[9px] text-muted/60 font-mono">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <button
                  onClick={() => setShowDetailsDrawer(false)}
                  className="w-full py-3 bg-brand-bgbase border border-border rounded-2xl text-xs font-bold text-main hover:bg-brand-surface"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
