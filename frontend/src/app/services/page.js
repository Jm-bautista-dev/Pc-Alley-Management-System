"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Clock,
  DollarSign,
  Tag,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Archive,
  RefreshCw,
  X,
  Layers,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ServicesPage() {
  const { user } = useAuthGuard();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("active");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "Diagnostics",
    description: "",
    pricing_type: "fixed",
    base_price: 500,
    estimated_duration_mins: 60,
    requires_device_info: true,
    status: "active"
  });

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, [selectedCategory, selectedStatus]);

  const fetchServices = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      let url = `/api/services?status=${selectedStatus}`;
      if (selectedCategory !== "all") url += `&category=${encodeURIComponent(selectedCategory)}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await fetch(apiUrl(url), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (err) {
      console.error("Error loading services:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/services/categories"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({
      name: "",
      category: categories[0] || "Diagnostics",
      description: "",
      pricing_type: "fixed",
      base_price: 500,
      estimated_duration_mins: 60,
      requires_device_info: true,
      status: "active"
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingService(s);
    setFormData({
      name: s.name,
      category: s.category,
      description: s.description || "",
      pricing_type: s.pricing_type,
      base_price: parseFloat(s.base_price || 0),
      estimated_duration_mins: s.estimated_duration_mins || 60,
      requires_device_info: s.requires_device_info,
      status: s.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError("Service name is required");
      return;
    }
    if (isNaN(parseFloat(formData.base_price)) || parseFloat(formData.base_price) < 0) {
      showError("Please enter a valid base price (≥ 0)");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const url = editingService ? `/api/services/${editingService.id}` : "/api/services";
      const method = editingService ? "PUT" : "POST";

      const res = await fetch(apiUrl(url), {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        showSuccess(editingService ? "Service updated successfully" : "Service created successfully");
        setIsModalOpen(false);
        fetchServices();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to save service");
      }
    } catch (err) {
      showError("Network connection error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (service) => {
    const confirmed = await showConfirm(
      "Archive Service?",
      `Are you sure you want to archive "${service.name}"? It will no longer appear in the active POS catalog.`
    );
    if (!confirmed) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/services/${service.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showSuccess("Service archived");
        fetchServices();
      } else {
        const err = await res.json();
        showError(err.error || "Failed to archive service");
      }
    } catch {
      showError("Network error");
    }
  };

  const filtered = services.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
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
                <Wrench size={20} />
              </div>
              <h1 className="text-2xl font-rajdhani font-black text-main uppercase tracking-wider">
                Technical Service Catalog
              </h1>
            </div>
            <p className="text-xs text-brand-muted font-bold">
              Manage technical labor services, pricing methods, and work order configurations (Zero Inventory Impact).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 bg-brand-neonblue hover:bg-brand-neonblue/90 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
            >
              <Plus size={16} /> Add New Service
            </button>
          </div>
        </header>

        {/* Toolbar & Filters */}
        <div className="p-8 pb-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type="text"
                placeholder="Search services..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue/40"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
            >
              <option value="active">Active Services</option>
              <option value="inactive">Inactive</option>
              <option value="all">All Statuses</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-brand-muted font-bold">
            <Layers size={14} /> Total Services: <span className="text-main font-black">{filtered.length}</span>
          </div>
        </div>

        {/* Catalog Table / Grid */}
        <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center text-brand-muted">
              <RefreshCw size={32} className="animate-spin text-brand-neonblue mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Loading Service Catalog...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-28 text-center bg-brand-surface border border-brand-border rounded-3xl p-8">
              <Wrench size={48} className="mx-auto text-brand-muted mb-3 opacity-40" />
              <h3 className="text-sm font-black uppercase tracking-wider text-main mb-1">No services found</h3>
              <p className="text-xs text-brand-muted mb-6">Create a technical service or adjust your search filters.</p>
              <button
                onClick={handleOpenAdd}
                className="px-5 py-2.5 bg-brand-neonblue text-white rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2"
              >
                <Plus size={16} /> Create Service
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(s => {
                const pricingBadge = {
                  fixed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                  variable: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                  custom: "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }[s.pricing_type] || "bg-brand-panel text-brand-muted border-brand-border";

                return (
                  <motion.div
                    key={s.id}
                    layout
                    className="bg-brand-surface border border-brand-border rounded-3xl p-6 flex flex-col justify-between hover:border-purple-500/30 transition-all shadow-sm group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-panel border border-brand-border text-brand-muted">
                          {s.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${pricingBadge}`}>
                            {s.pricing_type.toUpperCase()}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        </div>
                      </div>

                      <h3 className="text-base font-rajdhani font-black text-main uppercase tracking-wide mb-2 group-hover:text-purple-400 transition-colors">
                        {s.name}
                      </h3>

                      <p className="text-xs text-brand-muted leading-relaxed line-clamp-2 mb-4">
                        {s.description || "No description provided for this technical service."}
                      </p>
                    </div>

                    <div className="border-t border-brand-border/60 pt-4 mt-auto">
                      <div className="flex items-center justify-between mb-4 text-xs">
                        <div className="flex items-center gap-1.5 text-brand-muted font-bold">
                          <Clock size={14} className="text-purple-400" />
                          <span>~{s.estimated_duration_mins || 60} mins</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block text-right">
                            {s.pricing_type === 'fixed' ? 'Fixed Fee' : s.pricing_type === 'variable' ? 'Starting From' : 'Base Quote'}
                          </span>
                          <span className="text-lg font-rajdhani font-black text-main">
                            ₱{parseFloat(s.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="px-3.5 py-1.5 bg-brand-panel hover:bg-brand-hover border border-brand-border rounded-xl text-xs font-black text-main flex items-center gap-1.5 transition-all"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all"
                        >
                          <Archive size={13} /> Archive
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create / Edit Service Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-brand-surface border border-brand-border rounded-3xl max-w-lg w-full p-8 shadow-2xl overflow-hidden relative"
              >
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-6 right-6 text-brand-muted hover:text-main"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-rajdhani font-black text-main uppercase tracking-wider">
                      {editingService ? "Edit Service" : "Add New Technical Service"}
                    </h2>
                    <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">
                      Labor Revenue • Zero Inventory Impact
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                      Service Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PC Diagnostic & Deep Inspection"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                      >
                        {categories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        Pricing Type
                      </label>
                      <select
                        value={formData.pricing_type}
                        onChange={e => setFormData({ ...formData, pricing_type: e.target.value })}
                        className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none"
                      >
                        <option value="fixed">Fixed Price</option>
                        <option value="variable">Variable (Staff Override)</option>
                        <option value="custom">Custom Quoted</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        {formData.pricing_type === 'fixed' ? 'Fixed Price (₱) *' : 'Starting / Base Price (₱) *'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.base_price}
                        onChange={e => setFormData({ ...formData, base_price: e.target.value })}
                        className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                        Est. Duration (Mins)
                      </label>
                      <input
                        type="number"
                        min="5"
                        value={formData.estimated_duration_mins}
                        onChange={e => setFormData({ ...formData, estimated_duration_mins: e.target.value })}
                        className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-brand-muted mb-1.5">
                      Description & Scope of Work
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Specify what technical labor is included in this service..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-brand-panel border border-brand-border rounded-xl text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue custom-scrollbar"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-brand-panel border border-brand-border rounded-xl">
                    <span className="text-xs font-bold text-main">Requires Customer Device Info</span>
                    <input
                      type="checkbox"
                      checked={formData.requires_device_info}
                      onChange={e => setFormData({ ...formData, requires_device_info: e.target.checked })}
                      className="w-4 h-4 accent-purple-500 rounded"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-2.5 bg-brand-panel hover:bg-brand-hover text-brand-muted font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 bg-brand-neonblue text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2"
                    >
                      {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      {editingService ? "Save Changes" : "Create Service"}
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
