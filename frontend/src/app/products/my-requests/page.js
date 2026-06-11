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
  Trash2
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchRequests();
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
        showError(data.message || "Failed to fetch requests.");
      }
    } catch (err) {
      console.error("Telemetry Error: connection failed", err);
      showError("Failed to fetch requests history.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (id, requestNumber) => {
    if (!window.confirm(`Are you sure you want to cancel request ${requestNumber}?`)) return;

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
        showSuccess(`Request ${requestNumber} cancelled successfully.`);
        fetchRequests();
      } else {
        showError(data.message || "Failed to cancel request.");
      }
    } catch (err) {
      showError("Error cancelling request.");
    }
  };

  const tabs = ["All", "Pending", "Approved", "Scheduled", "Completed", "Rejected", "Cancelled"];

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.request_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.Product?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.Product?.sku || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === "All" || r.status === activeTab;
    return matchesSearch && matchesTab;
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
      case "In Transit":
        return "text-indigo-400 border-indigo-400/20 bg-indigo-400/10";
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
        <TopBar title="MY PRODUCT REQUESTS" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container">
            
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-rajdhani font-black uppercase">
                  MY PRODUCT <span className="text-brand-neonblue">REQUESTS</span>
                </h1>
                <p className="text-[10px] text-main/40 font-black uppercase tracking-widest mt-1">
                  Track and manage your branch procurement requests
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchRequests}
                className="btn-ghost py-2.5 px-4 h-auto text-[10px] font-black tracking-widest uppercase"
              >
                <RotateCcw size={12} className="mr-1" /> Refresh
              </motion.button>
            </div>

            {/* Search + Tab filters */}
            <div className="flex flex-col gap-6 mb-8">
              <div className="relative group w-full md:w-96">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-main/30 group-focus-within:text-brand-neonblue transition-colors">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Request #, Product or SKU..."
                  className="w-full bg-brand-surface border border-border rounded-xl py-4 pl-12 pr-4 text-xs text-main focus:outline-none focus:border-brand-neonblue/20 transition-all font-bold tracking-tight shadow-sm"
                />
              </div>

              {/* Tabs */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-border/40">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`h-10 px-5 rounded-t-xl text-[10px] font-black uppercase tracking-[2px] transition-all flex items-center gap-2 border-b-2 ${
                      activeTab === tab 
                      ? "border-brand-neonblue text-brand-neonblue bg-brand-neonblue/5" 
                      : "border-transparent text-main/45 hover:text-main hover:border-border"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-border border-t-brand-neonblue rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[4px] text-muted">Retrieving requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 glass-card border-dashed">
                <ClipboardList size={48} className="text-main/10 mb-6" />
                <h3 className="text-sm font-black uppercase tracking-[4px] text-main">No Requests Found</h3>
                <p className="text-[10px] text-main/30 font-black uppercase tracking-widest mt-2">Create a product request from the catalog page</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredRequests.map((req) => (
                  <motion.div
                    key={req.id}
                    layoutId={`req-card-${req.id}`}
                    className="bg-brand-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col md:grid md:grid-cols-[1.5fr,1fr,1.5fr,1fr] gap-6 items-center hover:border-brand-neonblue/20 transition-all"
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
                      <h4 className="text-md font-rajdhani font-black text-main truncate leading-tight mt-2">
                        {req.Product?.name || "Unknown Product"}
                      </h4>
                      <p className="text-[10px] text-muted/50 uppercase tracking-widest font-mono">
                        SKU: {req.Product?.sku || "N/A"}
                      </p>
                    </div>

                    {/* Quantities */}
                    <div className="w-full text-left md:text-center">
                      <p className="text-[9px] text-main/30 font-black uppercase tracking-[2px] mb-1">
                        Requested Qty
                      </p>
                      <p className="text-lg font-rajdhani font-black text-main">
                        {req.quantity_requested}
                      </p>
                      {req.quantity_approved !== null && (
                        <p className="text-[10px] text-brand-neonblue font-bold">
                          Approved: {req.quantity_approved}
                        </p>
                      )}
                    </div>

                    {/* Schedule / Rejection */}
                    <div className="w-full flex flex-col gap-1">
                      {req.status === "Scheduled" && (
                        <div className="bg-brand-neonblue/10 border border-brand-neonblue/20 p-3 rounded-xl flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-brand-neonblue">
                            <Calendar size={12} /> Delivery Scheduled
                          </div>
                          <p className="font-bold text-main">Date: {req.scheduled_date}</p>
                          <p className="text-muted/70 text-[10px]">Time: {req.scheduled_time}</p>
                        </div>
                      )}
                      {req.status === "Rejected" && (
                        <div className="bg-brand-crimson/10 border border-brand-crimson/20 p-3 rounded-xl flex flex-col gap-1 text-xs text-brand-crimson">
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
                            <AlertCircle size={12} /> Rejection Reason
                          </div>
                          <p className="font-medium text-brand-crimson/90 leading-tight">
                            {req.rejection_reason || "No reason provided."}
                          </p>
                        </div>
                      )}
                      {!["Scheduled", "Rejected"].includes(req.status) && (
                        <div className="text-xs text-muted/60">
                          <p>Created: {new Date(req.createdAt).toLocaleDateString()}</p>
                          {req.processed_at && (
                            <p>Processed: {new Date(req.processed_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status & Cancel */}
                    <div className="w-full flex flex-row md:flex-col items-center justify-between md:justify-center md:items-end gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-[2px] px-4 py-2 rounded-full border ${getStatusBadge(req.status)}`}>
                        {req.status}
                      </span>
                      
                      {req.status === "Pending" && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleCancelRequest(req.id, req.request_number)}
                          className="text-xs font-bold text-brand-crimson hover:bg-brand-crimson/15 px-3 py-1.5 rounded-lg border border-brand-crimson/10 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={13} /> Cancel
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
