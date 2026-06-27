"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  Truck,
  Search,
  Plus,
  MapPin,
  Package,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

const COURIERS = ["LBC Express", "J&T Express", "Ninja Van", "GrabExpress", "Lalamove", "2GO Express", "Flash Express", "In-House Delivery"];

const STATUS_CONFIG = {
  Preparing:  { color: "text-yellow-500",     bg: "bg-yellow-500/10",     border: "border-yellow-500/20" },
  Shipped:    { color: "text-brand-neonblue", bg: "bg-brand-neonblue/10", border: "border-brand-neonblue/20" },
  Delivered:  { color: "text-green-500",      bg: "bg-green-500/10",      border: "border-green-500/20" },
  Cancelled:  { color: "text-brand-crimson",  bg: "bg-brand-crimson/10",  border: "border-brand-crimson/20" },
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("pc_alley_shipments") || "[]"); } catch { return []; }
    }
    return [];
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewShipment, setViewShipment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [limit, search, statusFilter]);

  const [form, setForm] = useState({
    order_id: "",
    customer_name: "",
    address: "",
    courier: COURIERS[0],
    tracking_number: "",
    items_count: 1,
    note: ""
  });

  const saveShipments = (updated) => {
    setShipments(updated);
    localStorage.setItem("pc_alley_shipments", JSON.stringify(updated));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.order_id || !form.customer_name || !form.address) return showError("Fill in all required fields");
    const newShipment = {
      id: Date.now(),
      ...form,
      status: "Preparing",
      createdAt: new Date().toISOString()
    };
    saveShipments([newShipment, ...shipments]);
    showSuccess("Shipment created");
    setIsModalOpen(false);
    setForm({ order_id: "", customer_name: "", address: "", courier: COURIERS[0], tracking_number: "", items_count: 1, note: "" });
  };

  const handleStatusChange = (id, status) => {
    saveShipments(shipments.map(s => s.id === id ? { ...s, status, updatedAt: new Date().toISOString() } : s));
    showSuccess(`Shipment marked as ${status}`);
    setViewShipment(v => v?.id === id ? { ...v, status } : v);
  };

  const filtered = shipments.filter(s => {
    const matchSearch = (s.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.tracking_number || "").toLowerCase().includes(search.toLowerCase()) ||
      String(s.order_id).includes(search);
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((currentPage - 1) * limit, currentPage * limit);

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SHIPMENTS" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">

          <div className="mb-6">
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
              Logistics & Delivery
            </motion.h2>
            <h1 className="text-2xl font-rajdhani font-black uppercase">
              SHIP<span className="text-brand-neonblue">MENTS</span>
            </h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total", value: shipments.length, color: "text-main" },
              { label: "Preparing", value: shipments.filter(s => s.status === "Preparing").length, color: "text-yellow-500" },
              { label: "Shipped", value: shipments.filter(s => s.status === "Shipped").length, color: "text-brand-neonblue" },
              { label: "Delivered", value: shipments.filter(s => s.status === "Delivered").length, color: "text-green-500" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-brand-surface border border-border rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-1">{s.label}</p>
                <p className={`text-2xl font-rajdhani font-black ${s.color}`}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); }}
                placeholder="Search customer, order ID, or tracking..."
                className="w-full bg-brand-surface border border-border text-main text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-brand-neonblue transition-colors" />
            </div>
            <div className="flex gap-2">
              {["All", "Preparing", "Shipped", "Delivered", "Cancelled"].map(s => (
                <button key={s} onClick={() => { setStatusFilter(s); }}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                    statusFilter === s ? "bg-brand-neonblue/20 text-brand-neonblue border-brand-neonblue/40" : "bg-brand-surface border-border text-muted hover:text-main"
                  }`}>{s}</button>
              ))}
            </div>
            <button onClick={() => setIsModalOpen(true)} className="btn-premium flex items-center gap-2 px-6 py-2.5 rounded-full text-xs ml-auto">
              <Plus size={16} /> New Shipment
            </button>
            {/* Rows per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Show</span>
              <select value={limit} onChange={e => { setLimit(Number(e.target.value)); }} className="border border-border rounded px-2 py-1 text-sm">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm font-medium">entries</span>
            </div>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="bg-brand-bgbase/50 text-[10px] font-black uppercase tracking-widest text-muted border-b border-border">
                    <th className="py-4 px-6">Shipment #</th>
                    <th className="py-4 px-6">Order #</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Courier</th>
                    <th className="py-4 px-6">Tracking</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan="7" className="py-20 text-center">
                      <Truck className="mx-auto text-main/10 mb-3" size={36} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                        {search || statusFilter !== "All" ? "No matching shipments" : 'No shipments yet — click "New Shipment" to start'}
                      </p>
                    </td></tr>
                  ) : paginated.map((s, idx) => {
                    const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.Preparing;
                    return (
                      <motion.tr key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-border/30 hover:bg-brand-bgbase/30 transition-colors group">
                        <td className="py-4 px-6 font-mono text-[10px] text-muted">SHP-{String(s.id).slice(-5)}</td>
                        <td className="py-4 px-6 font-mono text-[10px] text-brand-neonblue">#{s.order_id}</td>
                        <td className="py-4 px-6 text-sm font-bold text-main">{s.customer_name}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Truck size={12} className="text-muted shrink-0" />
                            <span className="text-xs font-bold text-main">{s.courier}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {s.tracking_number ? (
                            <span className="font-mono text-[10px] text-brand-neonblue">{s.tracking_number}</span>
                          ) : (
                            <span className="text-[10px] text-muted/40 font-bold">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <select value={s.status} onChange={e => handleStatusChange(s.id, e.target.value)}
                            className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border appearance-none bg-transparent cursor-pointer ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            {Object.keys(STATUS_CONFIG).map(st => <option key={st} value={st}>{st}</option>)}
                          </select>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button onClick={() => setViewShipment(s)}
                            className="p-1.5 rounded-lg border border-border text-muted hover:text-main hover:border-brand-neonblue/40 transition-all">
                            <Eye size={12} />
                          </button>
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
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-brand-surface border border-border rounded-[32px] p-8 relative z-10 shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-neonblue/10 blur-[80px] pointer-events-none" />
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue mb-1">Logistics</p>
                <h3 className="text-xl font-rajdhani font-black uppercase tracking-widest">New Shipment</h3>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Order ID *</label>
                    <input type="text" required value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })}
                      placeholder="e.g. 000042"
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Items</label>
                    <input type="number" min="1" value={form.items_count} onChange={e => setForm({ ...form, items_count: parseInt(e.target.value) })}
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Customer Name *</label>
                  <input type="text" required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="Recipient name"
                    className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Delivery Address *</label>
                  <textarea required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                    rows={2} placeholder="Full delivery address"
                    className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Courier</label>
                    <select value={form.courier} onChange={e => setForm({ ...form, courier: e.target.value })}
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all appearance-none">
                      {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Tracking #</label>
                    <input type="text" value={form.tracking_number} onChange={e => setForm({ ...form, tracking_number: e.target.value })}
                      placeholder="Optional"
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 rounded-full border border-border text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-[2] py-3.5 bg-brand-neonblue/20 hover:bg-brand-neonblue text-brand-neonblue hover:text-white border border-brand-neonblue/40 rounded-full text-[10px] font-black uppercase tracking-[3px] transition-all active:scale-[0.98]">
                    Create Shipment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {viewShipment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewShipment(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-brand-surface border border-border rounded-[32px] p-8 relative z-10 shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue mb-1">Shipment Details</p>
                  <h3 className="text-xl font-rajdhani font-black uppercase">SHP-{String(viewShipment.id).slice(-5)}</h3>
                </div>
                <button onClick={() => setViewShipment(null)} className="p-2 text-muted hover:text-main"><X size={18} /></button>
              </div>
              <div className="space-y-3 mb-6">
                {[
                  { label: "Customer", value: viewShipment.customer_name },
                  { label: "Order #", value: `#${viewShipment.order_id}` },
                  { label: "Address", value: viewShipment.address },
                  { label: "Courier", value: viewShipment.courier },
                  { label: "Tracking", value: viewShipment.tracking_number || "—" },
                  { label: "Items", value: `${viewShipment.items_count} item(s)` },
                  { label: "Created", value: new Date(viewShipment.createdAt).toLocaleString() },
                ].map(f => (
                  <div key={f.label} className="flex justify-between items-start p-3 rounded-xl bg-brand-bgbase/50 border border-border/30">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted shrink-0">{f.label}</span>
                    <span className="text-sm font-bold text-main text-right max-w-[220px]">{f.value}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-[3px] text-muted">Update Status</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {Object.keys(STATUS_CONFIG).map(st => (
                    <button key={st} onClick={() => handleStatusChange(viewShipment.id, st)}
                      className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                        viewShipment.status === st
                          ? `${STATUS_CONFIG[st].color} ${STATUS_CONFIG[st].bg} ${STATUS_CONFIG[st].border}`
                          : "bg-brand-surface border-border text-muted hover:text-main"
                      }`}>{st}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
