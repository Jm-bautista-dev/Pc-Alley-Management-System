"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  User,
  Phone,
  Laptop,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  X,
  CreditCard,
  Check,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_PIPELINE = [
  { key: "received", label: "Received", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { key: "diagnosing", label: "Diagnosing", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { key: "waiting_for_approval", label: "Awaiting Approval", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { key: "in_progress", label: "In Progress", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { key: "ready_for_release", label: "Ready for Release", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { key: "completed", label: "Completed & Invoiced", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  { key: "cancelled", label: "Cancelled", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" }
];

export default function ServiceJobsPage() {
  const { user } = useAuthGuard();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Create Job Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    customer_name: "",
    customer_phone: "",
    service_id: "",
    device_type: "Desktop Gaming PC",
    device_specs: "",
    serial_number: "",
    reported_issue: "",
    estimated_price: ""
  });

  // Edit / Status Modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: "received",
    diagnosis: "",
    final_price: "",
    price_override_reason: "",
    customer_approved: false
  });

  useEffect(() => {
    fetchJobs();
    fetchServices();
  }, [selectedStatus]);

  const fetchJobs = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      let url = `/api/services/jobs/list?status=${selectedStatus}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await fetch(apiUrl(url), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setJobs(await res.json());
      }
    } catch (err) {
      console.error("Error fetching service jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/services?status=active"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setServices(await res.json());
    } catch (err) {
      console.error("Error loading services:", err);
    }
  };

  const handleOpenCreate = () => {
    setCreateForm({
      customer_name: "",
      customer_phone: "",
      service_id: services[0]?.id || "",
      device_type: "Desktop Gaming PC",
      device_specs: "",
      serial_number: "",
      reported_issue: "",
      estimated_price: services[0]?.base_price || 500
    });
    setIsCreateOpen(true);
  };

  const handleServiceSelectInCreate = (sId) => {
    const s = services.find(x => String(x.id) === String(sId));
    setCreateForm({
      ...createForm,
      service_id: sId,
      estimated_price: s ? s.base_price : createForm.estimated_price
    });
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!createForm.customer_name.trim()) {
      showError("Customer name is required");
      return;
    }
    if (!createForm.service_id) {
      showError("Please select a technical service");
      return;
    }

    setCreateSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/services/jobs"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });
      if (res.ok) {
        showSuccess("Service Work Order created");
        setIsCreateOpen(false);
        fetchJobs();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to create work order");
      }
    } catch {
      showError("Network error");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenDetail = (job) => {
    setSelectedJob(job);
    setStatusForm({
      status: job.status,
      diagnosis: job.diagnosis || "",
      final_price: parseFloat(job.final_price || job.estimated_price || 0),
      price_override_reason: job.price_override_reason || "",
      customer_approved: !!job.customer_approved
    });
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    setStatusUpdating(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/services/jobs/${selectedJob.id}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(statusForm)
      });
      if (res.ok) {
        showSuccess("Work Order updated");
        setSelectedJob(null);
        fetchJobs();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to update work order");
      }
    } catch {
      showError("Network error");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSendToPOS = (job) => {
    // Stage work order into POS cart draft and route to /sales
    const serviceItem = {
      id: job.service_id,
      item_type: "service",
      name: `${job.service_name} (${job.job_number})`,
      price: parseFloat(job.final_price || job.estimated_price || 0),
      quantity: 1,
      serviceJobId: job.id,
      priceOverrideReason: job.price_override_reason || `Invoiced Work Order #${job.job_number} for ${job.customer_name}`,
      selectionSummary: `Device: ${job.device_type} | Work Order #${job.job_number}`,
      isService: true
    };

    localStorage.setItem("pc_alley_pos_cart", JSON.stringify([serviceItem]));
    localStorage.setItem("pc_alley_pos_customer", job.customer_name);
    showSuccess(`Work order #${job.job_number} sent to POS checkout`);
    router.push("/sales");
  };

  const filteredJobs = jobs.filter(j => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      j.job_number.toLowerCase().includes(q) ||
      j.customer_name.toLowerCase().includes(q) ||
      j.service_name.toLowerCase().includes(q) ||
      (j.device_type && j.device_type.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="px-8 py-6 bg-brand-surface border-b border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ClipboardList size={20} />
              </div>
              <h1 className="text-2xl font-rajdhani font-black text-main uppercase tracking-wider">
                Service Jobs &amp; Work Orders
              </h1>
            </div>
            <p className="text-xs text-brand-muted font-bold">
              Track customer repair tickets, diagnostics, technician assignments, and send completed jobs to POS checkout.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 bg-brand-neonblue hover:bg-brand-neonblue/90 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
            >
              <Plus size={16} /> New Work Order
            </button>
          </div>
        </header>

        {/* Toolbar & Status Filters */}
        <div className="p-8 pb-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type="text"
                placeholder="Search ticket #, customer, device..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue/40"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
            >
              <option value="all">All Statuses</option>
              {STATUS_PIPELINE.map(st => (
                <option key={st.key} value={st.key}>{st.label}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-brand-muted font-bold">
            Total Work Orders: <span className="text-main font-black">{filteredJobs.length}</span>
          </div>
        </div>

        {/* Work Orders List */}
        <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center text-brand-muted">
              <RefreshCw size={32} className="animate-spin text-brand-neonblue mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Loading Work Orders...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-28 text-center bg-brand-surface border border-brand-border rounded-3xl p-8">
              <ClipboardList size={48} className="mx-auto text-brand-muted mb-3 opacity-40" />
              <h3 className="text-sm font-black uppercase tracking-wider text-main mb-1">No work orders found</h3>
              <p className="text-xs text-brand-muted mb-6">Create a customer repair ticket to start tracking jobs.</p>
              <button
                onClick={handleOpenCreate}
                className="px-5 py-2.5 bg-brand-neonblue text-white rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2"
              >
                <Plus size={16} /> Create Work Order
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map(job => {
                const statusMeta = STATUS_PIPELINE.find(s => s.key === job.status) || STATUS_PIPELINE[0];

                return (
                  <motion.div
                    key={job.id}
                    layout
                    className="bg-brand-surface border border-brand-border rounded-3xl p-6 hover:border-purple-500/30 transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono font-black text-main text-sm">
                          {job.job_number}
                        </span>
                        <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                        <span className="text-[10px] font-bold text-brand-muted flex items-center gap-1">
                          <Clock size={12} /> {new Date(job.created_at || job.received_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                        <div className="flex items-center gap-1.5 text-main">
                          <User size={14} className="text-purple-400" />
                          <span>{job.customer_name}</span>
                          {job.customer_phone && <span className="text-brand-muted">({job.customer_phone})</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-brand-muted">
                          <Laptop size={14} className="text-brand-neonblue" />
                          <span>{job.device_type} {job.serial_number ? `• S/N: ${job.serial_number}` : ''}</span>
                        </div>
                      </div>

                      <p className="text-xs text-brand-muted font-normal line-clamp-1">
                        <strong className="text-main font-bold">Service:</strong> {job.service_name} &nbsp;|&nbsp; 
                        <strong className="text-main font-bold"> Issue:</strong> {job.reported_issue || "No notes"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-brand-border pt-4 md:pt-0">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block">
                          Final Cost
                        </span>
                        <span className="text-lg font-rajdhani font-black text-main">
                          ₱{parseFloat(job.final_price || job.estimated_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDetail(job)}
                          className="px-4 py-2 bg-brand-panel hover:bg-brand-hover border border-brand-border text-main font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                        >
                          View / Update
                        </button>

                        {job.status !== 'completed' && job.status !== 'cancelled' && (
                          <button
                            onClick={() => handleSendToPOS(job)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                            title="Invoice at POS"
                          >
                            <CreditCard size={14} /> Checkout in POS
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Work Order Modal */}
        <AnimatePresence>
          {isCreateOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-brand-surface border border-brand-border rounded-3xl max-w-lg w-full p-8 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
              >
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="absolute top-6 right-6 text-brand-muted hover:text-main"
                >
                  <X size={20} />
                </button>

                <h2 className="text-xl font-rajdhani font-black text-main uppercase tracking-wider mb-4">
                  New Service Work Order
                </h2>

                <form onSubmit={handleCreateJob} className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Juan Dela Cruz"
                        value={createForm.customer_name}
                        onChange={e => setCreateForm({ ...createForm, customer_name: e.target.value })}
                        className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="0917XXXXXXX"
                        value={createForm.customer_phone}
                        onChange={e => setCreateForm({ ...createForm, customer_phone: e.target.value })}
                        className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                      Technical Service *
                    </label>
                    <select
                      value={createForm.service_id}
                      onChange={e => handleServiceSelectInCreate(e.target.value)}
                      className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                    >
                      {services.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.pricing_type.toUpperCase()} • ₱{s.base_price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        Device Type
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Gaming PC / Laptop"
                        value={createForm.device_type}
                        onChange={e => setCreateForm({ ...createForm, device_type: e.target.value })}
                        className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        Estimated Fee (₱)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={createForm.estimated_price}
                        onChange={e => setCreateForm({ ...createForm, estimated_price: e.target.value })}
                        className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                      Hardware Specs / Serial Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ryzen 5 5600, RTX 3060, S/N: SN-49821"
                      value={createForm.device_specs}
                      onChange={e => setCreateForm({ ...createForm, device_specs: e.target.value })}
                      className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                      Reported Issue / Symptoms
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. PC powers on but displays no signal on monitor..."
                      value={createForm.reported_issue}
                      onChange={e => setCreateForm({ ...createForm, reported_issue: e.target.value })}
                      className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none custom-scrollbar"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-5 py-2 bg-brand-panel text-brand-muted font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createSubmitting}
                      className="px-6 py-2 bg-brand-neonblue text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2"
                    >
                      {createSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Create Ticket
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Update Work Order Status Modal */}
        <AnimatePresence>
          {selectedJob && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-brand-surface border border-brand-border rounded-3xl max-w-lg w-full p-8 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
              >
                <button
                  onClick={() => setSelectedJob(null)}
                  className="absolute top-6 right-6 text-brand-muted hover:text-main"
                >
                  <X size={20} />
                </button>

                <h2 className="text-xl font-rajdhani font-black text-main uppercase tracking-wider mb-1">
                  Ticket #{selectedJob.job_number}
                </h2>
                <p className="text-xs text-brand-muted font-bold mb-4">
                  {selectedJob.customer_name} • {selectedJob.service_name}
                </p>

                <form onSubmit={handleUpdateStatus} className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                      Workflow Stage
                    </label>
                    <select
                      value={statusForm.status}
                      onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}
                      className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                    >
                      {STATUS_PIPELINE.map(st => (
                        <option key={st.key} value={st.key}>{st.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                      Technician Diagnosis &amp; Findings
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Detail inspection results, replaced thermal paste, faulty RAM module isolated, etc."
                      value={statusForm.diagnosis}
                      onChange={e => setStatusForm({ ...statusForm, diagnosis: e.target.value })}
                      className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none custom-scrollbar"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        Final Service Fee (₱)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={statusForm.final_price}
                        onChange={e => setStatusForm({ ...statusForm, final_price: e.target.value })}
                        className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        Customer Approval
                      </label>
                      <div className="flex items-center h-10 px-3 bg-brand-panel border border-brand-border rounded-xl">
                        <label className="flex items-center gap-2 text-xs font-bold text-main cursor-pointer">
                          <input
                            type="checkbox"
                            checked={statusForm.customer_approved}
                            onChange={e => setStatusForm({ ...statusForm, customer_approved: e.target.checked })}
                            className="w-4 h-4 accent-purple-500 rounded"
                          />
                          <span>Approved by Customer</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                      Fee Adjustment / Override Reason
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Extended troubleshooting required for intermittent power fault"
                      value={statusForm.price_override_reason}
                      onChange={e => setStatusForm({ ...statusForm, price_override_reason: e.target.value })}
                      className="w-full px-4 py-2 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(null)}
                      className="px-5 py-2 bg-brand-panel text-brand-muted font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={statusUpdating}
                      className="px-6 py-2 bg-brand-neonblue text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2"
                    >
                      {statusUpdating ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Update Ticket
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
