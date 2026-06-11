
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
  SlidersHorizontal,
  ThumbsUp,
  ThumbsDown,
  Truck,
  Box,
  MapPin,
  Tag,
  User,
  Package
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

export default function AdminProductRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Pending");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("");

  // Modals States
  const [activeRequest, setActiveRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Input fields for modals
  const [approvedQty, setApprovedQty] = useState(1);
  const [rejectionReason, setRejectionReason] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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
        showError(data.message || "Failed to fetch product requests.");
      }
    } catch (err) {
      console.error(err);
      showError("Telemetry Error: Catalog connection failure.");
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
      if (res.ok) setBranches(data);
    } catch (err) {
      console.error("Branch fetch error:", err);
    }
  };

  const handleOpenApprove = (req) => {
    setActiveRequest(req);
    setApprovedQty(req.quantity_requested);
    setShowApproveModal(true);
  };

  const handleApprove = async () => {
    if (!approvedQty || approvedQty < 1 || approvedQty > activeRequest.quantity_requested) {
      showError(`Approved quantity must be between 1 and ${activeRequest.quantity_requested}.`);
      return;
    }

    const available = activeRequest.Product?.available_quantity ?? 0;
    if (available < approvedQty) {
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
        body: JSON.stringify({ quantity_approved: approvedQty })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Request ${activeRequest.request_number} approved successfully!`);
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

  const handleOpenReject = (req) => {
    setActiveRequest(req);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectionReason || rejectionReason.trim() === "") {
      showError("Rejection reason is required.");
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
        body: JSON.stringify({ reason: rejectionReason })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Request ${activeRequest.request_number} rejected successfully.`);
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

  const handleOpenSchedule = (req) => {
    setActiveRequest(req);
    setScheduledDate("");
    setScheduledTime("");
    setShowScheduleModal(true);
  };

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) {
      showError("Please provide both delivery date and time.");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${activeRequest.id}/schedule`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Delivery scheduled for ${activeRequest.request_number}.`);
        setShowScheduleModal(false);
        fetchRequests();
      } else {
        showError(data.message || "Scheduling failed.");
      }
    } catch (err) {
      showError("An error occurred during scheduling.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (req) => {
    if (!window.confirm(`Mark request ${req.request_number} as Completed? This will deduct ${req.quantity_approved} unit(s) from warehouse stock and transfer it to branch "${req.Branch?.name}".`)) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${req.id}/complete`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Request ${req.request_number} has been completed! Stock transferred successfully.`);
        fetchRequests();
      } else {
        showError(data.message || "Completion failed.");
      }
    } catch (err) {
      showError("An error occurred during completion.");
    }
  };

  // Stats calculation
  const totalPending = requests.filter(r => r.status === "Pending").length;
  const totalApproved = requests.filter(r => ["Approved", "Partially Approved"].includes(r.status)).length;
  const totalScheduled = requests.filter(r => r.status === "Scheduled").length;
  const totalCompleted = requests.filter(r => r.status === "Completed").length;

  const tabs = ["Pending", "Approved/Partially Approved", "Scheduled", "Completed", "Rejected/Cancelled", "All"];

  const filteredRequests = requests.filter(r => {
    const matchesSearch =
      r.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.Product?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.Product?.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.Branch?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch = !selectedBranchFilter || String(r.branch_id) === String(selectedBranchFilter);

    let matchesTab = true;
    if (activeTab === "Pending") {
      matchesTab = r.status === "Pending";
    } else if (activeTab === "Approved/Partially Approved") {
      matchesTab = r.status === "Approved" || r.status === "Partially Approved";
    } else if (activeTab === "Scheduled") {
      matchesTab = r.status === "Scheduled";
    } else if (activeTab === "Completed") {
      matchesTab = r.status === "Completed";
    } else if (activeTab === "Rejected/Cancelled") {
      matchesTab = r.status === "Rejected" || r.status === "Cancelled";
    }

    return matchesSearch && matchesBranch && matchesTab;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return "text-amber-400 border-amber-400/20 bg-amber-400/10";
      case "Approved":
        return "text-emerald-400 border-emerald-400/20 bg-emerald-400/10";
      case "Partially Approved":
        return "text-lime-400 border-lime-400/20 bg-lime-400/10";
      case "Scheduled":
        return "text-cyan-400 border-cyan-400/20 bg-cyan-400/10";
      case "Completed":
        return "text-teal-400 border-teal-400/20 bg-teal-400/10";
      case "Rejected":
        return "text-rose-400 border-rose-400/20 bg-rose-400/10";
      case "Cancelled":
        return "text-muted border-border bg-brand-surface/20";
      default:
        return "text-muted border-border bg-brand-surface";
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
        <TopBar title="PRODUCT REQUESTS MANAGEMENT" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container">

            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-rajdhani font-black uppercase">
                  BRANCH PRODUCT <span className="text-brand-neonblue">REQUESTS</span>
                </h1>
                <p className="text-[10px] text-main/40 font-black uppercase tracking-widest mt-1">
                  Manage inventory requests, schedule transfers, and track delivery logistics
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchRequests}
                className="btn-ghost py-2.5 px-4 h-auto text-[10px] font-black tracking-widest uppercase"
              >
                <RotateCcw size={12} className="mr-1" /> Refresh list
              </motion.button>
            </div>

            {/* Stats Dashboard Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <div className="bg-brand-surface border border-border p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-main/30 uppercase tracking-widest mb-1">Pending Requests</p>
                  <p className="text-3xl font-rajdhani font-black text-amber-400">{totalPending}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                  <ClipboardList size={20} />
                </div>
              </div>

              <div className="bg-brand-surface border border-border p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-main/30 uppercase tracking-widest mb-1">Approved & Reserved</p>
                  <p className="text-3xl font-rajdhani font-black text-emerald-400">{totalApproved}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                  <Box size={20} />
                </div>
              </div>

              <div className="bg-brand-surface border border-border p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-main/30 uppercase tracking-widest mb-1">Scheduled Deliveries</p>
                  <p className="text-3xl font-rajdhani font-black text-cyan-400">{totalScheduled}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
                  <Truck size={20} />
                </div>
              </div>

              <div className="bg-brand-surface border border-border p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-main/30 uppercase tracking-widest mb-1">Completed Transfers</p>
                  <p className="text-3xl font-rajdhani font-black text-teal-400">{totalCompleted}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-center text-teal-400">
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </div>

            {/* Filter controls */}
            <div className="bg-brand-surface border border-border rounded-2xl p-6 mb-8 flex flex-col lg:flex-row gap-6 items-end lg:items-center">
              <div className="relative group w-full lg:w-80">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-main/30 group-focus-within:text-brand-neonblue transition-colors">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Request #, Branch or Product..."
                  className="w-full bg-brand-bgbase border border-border rounded-xl py-3 pl-12 pr-4 text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue/20 transition-all tracking-tight shadow-sm"
                />
              </div>

              <div className="w-full lg:w-48">
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue/30 transition-colors"
                >
                  <option value="">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-border/40 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`h-10 px-5 rounded-t-xl text-[10px] font-black uppercase tracking-[2px] transition-all flex items-center gap-2 border-b-2 ${activeTab === tab
                      ? "border-brand-neonblue text-brand-neonblue bg-brand-neonblue/5"
                      : "border-transparent text-main/45 hover:text-main hover:border-border"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content Table / Cards */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-border border-t-brand-neonblue rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[4px] text-muted">Retrieving database logs...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 glass-card border-dashed">
                <ClipboardList size={48} className="text-main/10 mb-6" />
                <h3 className="text-sm font-black uppercase tracking-[4px] text-main">No requests found</h3>
                <p className="text-[10px] text-main/30 font-black uppercase tracking-widest mt-2">Adjust search terms or status filter tab</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    layoutId={`admin-req-${req.id}`}
                    className="bg-brand-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col xl:grid xl:grid-cols-[1.2fr,1.5fr,1fr,1.2fr,1.2fr] gap-6 items-center hover:border-brand-neonblue/10 transition-all"
                  >
                    {/* ID & Branch & Requester */}
                    <div className="w-full flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-brand-neonblue bg-brand-neonblue/10 px-2 py-0.5 rounded">
                          {req.request_number}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getPriorityBadge(req.priority)}`}>
                          {req.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-black text-main/50 uppercase tracking-wider mt-3">
                        <MapPin size={12} className="text-brand-neonblue" /> Branch: {req.Branch?.name || "Unknown Branch"}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted/60 mt-0.5">
                        <User size={12} /> Requested by: {req.Requester?.username || "unknown"}
                      </div>
                    </div>

                    {/* Product requested info */}
                    <div className="w-full flex flex-col gap-1 min-w-0">
                      <h4 className="text-md font-rajdhani font-black text-main leading-tight">
                        {req.Product?.name || "Unknown Product"}
                      </h4>
                      <p className="text-[10px] text-muted/50 uppercase tracking-widest font-mono">
                        SKU: {req.Product?.sku || "N/A"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-bold text-main/40 uppercase tracking-wide">Warehouse Stock:</span>
                        <span className={`text-xs font-bold ${req.Product?.available_quantity < req.quantity_requested ? 'text-brand-crimson' : 'text-emerald-400'}`}>
                          {req.Product?.available_quantity ?? 0} available
                        </span>
                      </div>
                    </div>

                    {/* Quantities */}
                    <div className="w-full text-left xl:text-center">
                      <p className="text-[9px] text-main/30 font-black uppercase tracking-[2px] mb-1">Quantity</p>
                      <p className="text-md font-rajdhani font-black text-main">
                        Requested: {req.quantity_requested}
                      </p>
                      {req.quantity_approved !== null && (
                        <p className="text-xs text-brand-neonblue font-bold">
                          Approved: {req.quantity_approved}
                        </p>
                      )}
                    </div>

                    {/* Logistics / Date / Reason */}
                    <div className="w-full flex flex-col gap-1">
                      {req.status === "Scheduled" && (
                        <div className="bg-brand-neonblue/10 border border-brand-neonblue/20 p-3 rounded-xl flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-brand-neonblue">
                            <Calendar size={12} /> Scheduled Delivery
                          </div>
                          <p className="font-bold text-main">{req.scheduled_date}</p>
                          <p className="text-muted/70 text-[10px]">Time: {req.scheduled_time}</p>
                        </div>
                      )}
                      {req.status === "Rejected" && (
                        <div className="bg-brand-crimson/10 border border-brand-crimson/20 p-3 rounded-xl flex flex-col gap-1 text-xs text-brand-crimson">
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest">
                            <AlertCircle size={12} /> Rejected Reason
                          </div>
                          <p className="font-medium leading-snug">{req.rejection_reason || "None"}</p>
                        </div>
                      )}
                      {req.notes && (
                        <div className="text-[10px] text-muted/65 italic leading-tight border-l-2 border-border/80 pl-2 py-0.5">
                          Notes: {req.notes}
                        </div>
                      )}
                      {!["Scheduled", "Rejected"].includes(req.status) && !req.notes && (
                        <div className="text-[10px] text-muted/40 uppercase tracking-widest font-bold">
                          Requested: {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="w-full flex flex-row xl:flex-col items-center justify-between xl:justify-center xl:items-end gap-3 flex-shrink-0">
                      <span className={`text-[10px] font-black uppercase tracking-[2px] px-3.5 py-1.5 rounded-full border ${getStatusBadge(req.status)}`}>
                        {req.status}
                      </span>

                      <div className="flex gap-2">
                        {req.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleOpenApprove(req)}
                              className="text-[10px] font-black tracking-widest uppercase bg-brand-neonblue text-white dark:text-brand-navy hover:opacity-90 px-3 py-2 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                            >
                              <ThumbsUp size={12} /> Approve
                            </button>
                            <button
                              onClick={() => handleOpenReject(req)}
                              className="text-[10px] font-black tracking-widest uppercase bg-brand-crimson/10 text-brand-crimson hover:bg-brand-crimson/20 border border-brand-crimson/20 px-3 py-2 rounded-lg transition-all flex items-center gap-1"
                            >
                              <ThumbsDown size={12} /> Reject
                            </button>
                          </>
                        )}

                        {["Approved", "Partially Approved"].includes(req.status) && (
                          <>
                            <button
                              onClick={() => handleOpenSchedule(req)}
                              className="text-[10px] font-black tracking-widest uppercase bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 px-3.5 py-2 rounded-lg transition-all flex items-center gap-1"
                            >
                              <Calendar size={12} /> Schedule
                            </button>
                            <button
                              onClick={() => handleOpenReject(req)}
                              className="text-[10px] font-black tracking-widest uppercase bg-brand-crimson/10 text-brand-crimson hover:bg-brand-crimson/20 border border-brand-crimson/20 px-3 py-2 rounded-lg transition-all flex items-center gap-1"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {req.status === "Scheduled" && (
                          <>
                            <button
                              onClick={() => handleComplete(req)}
                              className="text-[10px] font-black uppercase tracking-widest bg-teal-500 text-white dark:text-brand-navy hover:opacity-90 px-3.5 py-2 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 size={12} /> Complete
                            </button>
                            <button
                              onClick={() => handleOpenReject(req)}
                              className="text-[10px] font-black tracking-widest uppercase bg-brand-crimson/10 text-brand-crimson hover:bg-brand-crimson/20 border border-brand-crimson/20 px-3 py-2 rounded-lg transition-all flex items-center gap-1"
                            >
                              Cancel/Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── Approve Dialog Modal ── */}
      <AnimatePresence>
        {showApproveModal && activeRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-main/20 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-bgbase border border-brand-border/20 rounded-[32px] w-full max-w-md overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.1)] relative"
            >
              <div className="p-8 border-b border-brand-border/10">
                <h3 className="text-xl font-rajdhani font-black text-brand-neonblue leading-none mb-2">APPROVE REQUEST</h3>
                <p className="text-xs text-brand-muted font-bold tracking-wider uppercase">{activeRequest.Product?.name}</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="bg-brand-surface border border-border p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-muted">Requested Qty:</span>
                    <p className="text-lg font-rajdhani font-black text-main">{activeRequest.quantity_requested}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-black tracking-wider text-muted">Available Stock:</span>
                    <p className={`text-lg font-rajdhani font-black ${(activeRequest.Product?.available_quantity || 0) < activeRequest.quantity_requested ? "text-brand-crimson" : "text-emerald-400"
                      }`}>
                      {activeRequest.Product?.available_quantity ?? 0}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-brand-muted mb-2">
                    Approved Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={activeRequest.quantity_requested}
                    value={approvedQty}
                    onChange={(e) => setApprovedQty(Math.min(activeRequest.quantity_requested, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full bg-brand-surface border border-border rounded-xl py-3.5 px-4 text-md font-rajdhani font-black text-main focus:outline-none focus:border-brand-neonblue transition-colors"
                  />
                  <p className="text-[9px] text-muted/60 mt-1 uppercase font-bold tracking-wider">
                    Partial approval will allocate less inventory to the branch.
                  </p>
                </div>

                {activeRequest.Product?.available_quantity < approvedQty && (
                  <div className="text-brand-crimson text-xs font-bold flex items-center gap-1.5 bg-brand-crimson/10 border border-brand-crimson/15 p-3 rounded-lg">
                    <AlertCircle size={14} /> Warning: Warehouse stock is insufficient!
                  </div>
                )}

                <div className="flex gap-4 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowApproveModal(false)}
                    className="flex-1 py-3.5 rounded-xl border border-brand-border/20 text-[10px] font-black uppercase tracking-wider font-rajdhani text-main hover:bg-brand-surface/20 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={actionLoading || activeRequest.Product?.available_quantity < approvedQty}
                    onClick={handleApprove}
                    className="flex-1 py-3.5 bg-brand-neonblue text-white dark:text-brand-navy rounded-xl text-[10px] font-black uppercase tracking-wider font-rajdhani hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    {actionLoading ? "Processing..." : "Approve & Reserve"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Reject Dialog Modal ── */}
      <AnimatePresence>
        {showRejectModal && activeRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-main/20 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-bgbase border border-brand-border/20 rounded-[32px] w-full max-w-md overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.1)] relative"
            >
              <div className="p-8 border-b border-brand-border/10">
                <h3 className="text-xl font-rajdhani font-black text-brand-crimson leading-none mb-2">REJECT REQUEST</h3>
                <p className="text-xs text-brand-muted font-bold tracking-wider uppercase">{activeRequest.request_number} - {activeRequest.Product?.name}</p>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-brand-muted mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    required
                    rows="3"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a clear reason (e.g., Limited warehouse stock, product discontinued)..."
                    className="w-full bg-brand-surface border border-border rounded-xl py-3.5 px-4 text-xs font-bold text-main focus:outline-none focus:border-brand-crimson/30 transition-colors placeholder:text-muted/40"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 py-3.5 rounded-xl border border-brand-border/20 text-[10px] font-black uppercase tracking-wider font-rajdhani text-main hover:bg-brand-surface/20 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={actionLoading || !rejectionReason.trim()}
                    onClick={handleReject}
                    className="flex-1 py-3.5 bg-brand-crimson text-white rounded-xl text-[10px] font-black uppercase tracking-wider font-rajdhani hover:opacity-90 transition-all disabled:opacity-40 shadow-sm"
                  >
                    {actionLoading ? "Processing..." : "Reject request"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Schedule Dialog Modal ── */}
      <AnimatePresence>
        {showScheduleModal && activeRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-main/20 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-bgbase border border-brand-border/20 rounded-[32px] w-full max-w-md overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.1)] relative"
            >
              <div className="p-8 border-b border-brand-border/10">
                <h3 className="text-xl font-rajdhani font-black text-cyan-400 leading-none mb-2">SCHEDULE DELIVERY</h3>
                <p className="text-xs text-brand-muted font-bold tracking-wider uppercase">{activeRequest.request_number} - {activeRequest.Product?.name}</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-brand-muted mb-2">
                      Delivery Date
                    </label>
                    <input
                      type="date"
                      required
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-brand-surface border border-border rounded-xl py-3 px-4 text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-brand-muted mb-2">
                      Time Slot
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-brand-surface border border-border rounded-xl py-3 px-4 text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue transition-colors"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 py-3.5 rounded-xl border border-brand-border/20 text-[10px] font-black uppercase tracking-wider font-rajdhani text-main hover:bg-brand-surface/20 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={actionLoading || !scheduledDate || !scheduledTime}
                    onClick={handleSchedule}
                    className="flex-1 py-3.5 bg-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider font-rajdhani hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    {actionLoading ? "Scheduling..." : "Schedule Delivery"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
