"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit3,
  Download,
  User,
  ChevronLeft,
  ChevronRight,
  Printer,
  X,
  AlertCircle,
  Archive
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { useTheme } from "@/context/ThemeContext";

export default function QuotationsPage() {
  const { theme } = useTheme();
  const [quotations, setQuotations] = useState(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("pc_alley_quotations") || "[]"); } catch { return []; }
    }
    return [];
  });
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewQuote, setViewQuote] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [errors, setErrors] = useState({});
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    customer_name: "",
    valid_until: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    items: [{ product_id: "", product_name: "", quantity: 1, unit_price: 0 }],
    note: ""
  });

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    return customers.filter(c =>
      (c.name || c.first_name || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.contact_number || c.phone || "").includes(customerSearch)
    ).slice(0, 8);
  }, [customerSearch, customers]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(apiUrl("/api/products"), { headers }).then(r => r.ok ? r.json() : []),
      fetch(apiUrl("/api/customers"), { headers }).then(r => r.ok ? r.json() : [])
    ]).then(([prods, custs]) => {
      setProducts(Array.isArray(prods) ? prods : []);
      setCustomers(Array.isArray(custs) ? custs : []);
    });
  }, []);

  const saveQuotations = (updated) => {
    setQuotations(updated);
    localStorage.setItem("pc_alley_quotations", JSON.stringify(updated));
  };

  const addItem = () =>
    setForm(f => ({ ...f, items: [...f.items, { product_id: "", product_name: "", quantity: 1, unit_price: 0 }] }));

  const removeItem = (idx) =>
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx, field, value) =>
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === "product_id") {
        const prod = products.find(p => String(p.id) === String(value));
        if (prod) { items[idx].product_name = prod.name; items[idx].unit_price = parseFloat(prod.price); }
        else { items[idx].product_name = ""; items[idx].unit_price = 0; }
      }
      return { ...f, items };
    });

  const subtotal = form.items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);

  const validate = () => {
    const errs = {};
    if (!form.customer_name || !form.customer_name.trim())
      errs.customer_name = "Customer name is required";
    else if (form.customer_name.trim().length < 2)
      errs.customer_name = "Name must be at least 2 characters";
    if (!form.valid_until)
      errs.valid_until = "Valid until date is required";
    else if (new Date(form.valid_until) <= new Date(new Date().toDateString()))
      errs.valid_until = "Must be a future date";
    const itemErrors = [];
    form.items.forEach((item, i) => {
      const ie = {};
      if (!item.product_id) ie.product_id = "Select a product";
      if (!item.quantity || item.quantity < 1) ie.quantity = "Min 1";
      else if (item.quantity > 99999) ie.quantity = "Too high";
      if (item.unit_price < 0) ie.unit_price = "Can't be negative";
      if (Object.keys(ie).length) itemErrors[i] = ie;
    });
    if (itemErrors.length) errs.items = itemErrors;
    setErrors(errs);
    return !Object.keys(errs).length && !itemErrors.length;
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (editingQuote) {
      const updated = quotations.map(q => q.id === editingQuote.id
        ? { ...q, ...form, customer_name: form.customer_name.trim(), subtotal }
        : q);
      saveQuotations(updated);
      showSuccess("Warranty updated");
    } else {
      const newQuote = {
        id: Date.now(),
        ...form,
        customer_name: form.customer_name.trim(),
        subtotal,
        status: "Draft",
        createdAt: new Date().toISOString()
      };
      saveQuotations([newQuote, ...quotations]);
      showSuccess("Warranty record created");
    }
    setIsModalOpen(false);
    resetForm();
  };

  const openEditModal = (q) => {
    setEditingQuote(q);
    setForm({
      customer_name: q.customer_name || "",
      valid_until: q.valid_until || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      items: (q.items || []).length > 0
        ? q.items.map(i => ({ ...i }))
        : [{ product_id: "", product_name: "", quantity: 1, unit_price: 0 }],
      note: q.note || ""
    });
    setCustomerSearch(q.customer_name || "");
    setErrors({});
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setForm({ customer_name: "", valid_until: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0], items: [{ product_id: "", product_name: "", quantity: 1, unit_price: 0 }], note: "" });
    setErrors({});
    setCustomerSearch("");
    setEditingQuote(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const selectCustomer = (name) => {
    setForm(f => ({ ...f, customer_name: name }));
    setCustomerSearch(name);
    setShowCustomerDropdown(false);
    if (errors.customer_name) setErrors(e => { const { customer_name, ...rest } = e; return rest; });
  };

  // Auto-expire warranties past their valid_until date
  const expireOverdue = useCallback((list) => {
    const now = new Date();
    return list.map(q => {
      if (q.status !== 'Expired' && new Date(q.valid_until) < now) {
        return { ...q, status: 'Expired' };
      }
      return q;
    });
  }, []);

  useEffect(() => {
    const expired = expireOverdue(quotations);
    const hasChanges = expired.some((q, i) => q.status !== quotations[i]?.status);
    if (hasChanges) saveQuotations(expired);
    const timer = setInterval(() => {
      const updated = expireOverdue(quotations);
      const changed = updated.some((q, i) => q.status !== quotations[i]?.status);
      if (changed) saveQuotations(updated);
    }, 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = (id, status) => {
    const isAdmin = user?.role === 'super_admin';
    if (isAdmin && status === 'Accepted') {
      saveQuotations(quotations.map(x => x.id === id ? { ...x, status: 'Accepted' } : x));
      showSuccess('Warranty accepted');
    } else if (!isAdmin && status === 'Sent') {
      saveQuotations(quotations.map(x => x.id === id ? { ...x, status: 'Sent' } : x));
      showSuccess('Warranty marked as Sent');
    }
  };

  const canArchive = (q) => (q.status === 'Accepted' || q.status === 'Expired') && !q.archived;

  const toggleSelect = (id) => {
    const q = quotations.find(x => x.id === id);
    if (!q || !canArchive(q)) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const archivable = paginated.filter(canArchive);
    if (selectedIds.size === archivable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(archivable.map(q => q.id)));
    }
  };

  const bulkArchive = () => {
    if (!selectedIds.size) return;
    const updated = quotations.map(q =>
      selectedIds.has(q.id) && canArchive(q) ? { ...q, archived: true } : q
    );
    saveQuotations(updated);
    showSuccess(`${selectedIds.size} warranty(s) archived`);
    setSelectedIds(new Set());
  };

  const canChangeStatus = (q) => {
    if (q.status === 'Expired' || q.archived) return false;
    if (user?.role === 'super_admin') return q.status !== 'Accepted';
    return q.status === 'Draft';
  };

  const statusOptions = (q) => {
    if (user?.role === 'super_admin') return ['Sent', 'Accepted'];
    return Object.keys(STATUS_STYLE);
  };

  const filtered = quotations.filter(q =>
    (showArchived ? q.archived : !q.archived) &&
    (q.customer_name || "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const STATUS_STYLE = {
    Draft:    "text-muted bg-border/30 border-border",
    Sent:     "text-brand-neonblue bg-brand-neonblue/10 border-brand-neonblue/30",
    Accepted: "text-green-500 bg-green-500/10 border-green-500/30",

    Expired:  "text-brand-crimson bg-brand-crimson/10 border-brand-crimson/30",
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="WARRANTIES" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">

          {/* Header */}
          <div className="mb-6">
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
              Client Warranties
            </motion.h2>
            <h1 className="text-2xl font-rajdhani font-black uppercase">
              LIST <span className="text-brand-neonblue">WARRANTIES</span>
            </h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Warranties", value: quotations.length, color: "text-main" },
              { label: "Draft", value: quotations.filter(q => q.status === "Draft").length, color: "text-muted" },
              { label: "Accepted", value: quotations.filter(q => q.status === "Accepted").length, color: "text-green-500" },
              { label: "Expired", value: quotations.filter(q => q.status === "Expired").length, color: "text-brand-crimson" },
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
                placeholder="Search by customer name..."
                className="w-full bg-brand-surface border border-border text-main text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-brand-neonblue transition-colors" />
            </div>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-premium flex items-center gap-2 px-6 py-2.5 rounded-full text-xs">
              <Plus size={16} /> New Warranty
            </button>
            <button onClick={() => { setShowArchived(!showArchived); setSelectedIds(new Set()); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${showArchived ? 'bg-brand-surface border-brand-neonblue/40 text-brand-neonblue' : 'bg-brand-bgbase border-border text-muted hover:text-main'}`}>
              <Archive size={14} /> {showArchived ? 'Active Warranties' : 'Archived'}
            </button>
          </div>

          {/* Bulk action bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="bg-brand-surface border border-brand-neonblue/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                <span className="text-xs font-bold text-muted">{selectedIds.size} selected</span>
                <div className="flex gap-2">
                  <button onClick={bulkArchive} className="px-4 py-2 rounded-lg bg-brand-bgbase border border-border text-xs font-bold text-muted hover:text-main hover:border-border transition-all flex items-center gap-2">
                    <Archive size={14} /> Archive Selected
                  </button>
                  <button onClick={() => setSelectedIds(new Set())} className="px-4 py-2 rounded-lg bg-brand-bgbase border border-border text-xs font-bold text-muted hover:text-main transition-all">
                    Clear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[750px]">
                <thead>
                  <tr className="bg-brand-bgbase/50 text-[10px] font-black uppercase tracking-widest text-muted border-b border-border">
                    <th className="py-4 px-4 w-10">
                      <input type="checkbox" checked={paginated.length > 0 && selectedIds.size === paginated.length}
                        onChange={toggleSelectAll}
                        className="accent-brand-neonblue cursor-pointer" />
                    </th>
                    <th className="py-4 px-6">Warranty #</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Items</th>
                    <th className="py-4 px-6">Valid Until</th>
                    <th className="py-4 px-6 text-right">Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan="8" className="py-20 text-center">
                      <FileText className="mx-auto text-main/10 mb-3" size={36} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                        {search ? "No matching warranties" : 'No warranties logged yet — click "New Warranty" to start'}
                      </p>
                    </td></tr>
                  ) : paginated.map((q, idx) => (
                    <motion.tr key={q.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`border-b border-border/30 hover:bg-brand-bgbase/30 transition-colors group ${selectedIds.has(q.id) ? 'bg-brand-neonblue/5' : ''}`}>
                      <td className="py-4 px-4 w-10">
                        <input type="checkbox" checked={selectedIds.has(q.id)}
                          disabled={!canArchive(q)}
                          onChange={() => toggleSelect(q.id)}
                          className={`accent-brand-neonblue ${canArchive(q) ? 'cursor-pointer' : 'cursor-not-allowed opacity-30'}`} />
                      </td>
                      <td className="py-4 px-6 font-mono text-[10px] text-muted">WR-{String(q.id).slice(-5)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-brand-bgbase border border-border flex items-center justify-center text-[10px] font-bold text-muted">
                            {(q.customer_name || "?").substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-main">{q.customer_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 bg-brand-bgbase border border-border rounded text-[9px] font-black text-muted">
                          {q.items.length} Products
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-muted font-bold">
                        {new Date(q.valid_until).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-4 px-6 text-right font-rajdhani font-black text-main text-lg">
                        ₱{q.subtotal.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <select value={q.status}
                          disabled={!canChangeStatus(q)}
                          onChange={e => handleStatusChange(q.id, e.target.value)}
                          className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border appearance-none bg-transparent ${canChangeStatus(q) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${STATUS_STYLE[q.status] || STATUS_STYLE.Draft}`}>
                          {user?.role === 'super_admin'
                            ? (canChangeStatus(q)
                              ? statusOptions(q).map(s => <option key={s} value={s}>{s}</option>)
                              : <option value={q.status}>{q.status}</option>)
                            : (canChangeStatus(q)
                              ? Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{s}</option>)
                              : <option value={q.status}>{q.status}</option>)
                          }
                        </select>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditModal(q)}
                            disabled={q.status !== 'Draft'}
                            className={`p-2 rounded-lg border transition-all ${q.status === 'Draft' ? 'border-border text-muted hover:text-main hover:border-brand-neonblue/40 cursor-pointer' : 'border-border/20 text-muted/30 cursor-not-allowed'}`} title={q.status === 'Draft' ? 'Edit' : 'Can only edit Draft'}>
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => setViewQuote(q)}
                            className="p-2 rounded-lg border border-border text-muted hover:text-main hover:border-brand-neonblue/40 transition-all" title="View">
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
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
              onClick={closeModal}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-brand-surface border border-border rounded-[32px] p-8 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="absolute top-0 right-0 w-40 h-40 bg-brand-neonblue/10 blur-[80px] pointer-events-none" />
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue mb-1">Create</p>
                <h3 className="text-xl font-rajdhani font-black uppercase tracking-widest">{editingQuote ? 'Edit Warranty Record' : 'New Warranty Record'}</h3>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Customer Name *</label>
                    <input type="text" value={form.customer_name}
                      onChange={e => { setForm({ ...form, customer_name: e.target.value }); setCustomerSearch(e.target.value); setShowCustomerDropdown(true); if (errors.customer_name) setErrors(prev => { const { customer_name, ...rest } = prev; return rest; }); }}
                      onFocus={() => customerSearch && setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                      placeholder="Search or type client name..."
                      className={`w-full mt-1.5 bg-brand-bgbase border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none transition-all ${errors.customer_name ? 'border-brand-crimson' : 'border-border focus:border-brand-neonblue'}`} />
                    {errors.customer_name && <p className="flex items-center gap-1 text-[9px] font-bold text-brand-crimson mt-1 ml-1"><AlertCircle size={10} />{errors.customer_name}</p>}
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-brand-surface border border-border rounded-xl shadow-xl overflow-hidden">
                        {filteredCustomers.map(c => (
                          <button key={c.id} type="button" onMouseDown={() => selectCustomer(c.name || c.first_name || "")}
                            className="w-full text-left px-4 py-2.5 text-xs text-main hover:bg-brand-bgbase transition-colors flex items-center gap-2 border-b border-border/20 last:border-0">
                            <User size={12} className="text-muted shrink-0" />
                            <span className="font-bold">{c.name || c.first_name || ""}</span>
                            {(c.contact_number || c.phone) && <span className="text-muted ml-auto">{c.contact_number || c.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Valid Until</label>
                    <input type="date" value={form.valid_until} onChange={e => { setForm({ ...form, valid_until: e.target.value }); if (errors.valid_until) setErrors(prev => { const { valid_until, ...rest } = prev; return rest; }); }}
                      className={`w-full mt-1.5 bg-brand-bgbase border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none transition-all ${errors.valid_until ? 'border-brand-crimson' : 'border-border focus:border-brand-neonblue'}`} />
                    {errors.valid_until && <p className="flex items-center gap-1 text-[9px] font-bold text-brand-crimson mt-1 ml-1"><AlertCircle size={10} />{errors.valid_until}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1 block mb-2">Items</label>
                  <div className="space-y-2">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <select value={item.product_id} onChange={e => { updateItem(idx, "product_id", e.target.value); if (errors.items?.[idx]?.product_id) { const newErrors = { ...errors }; newErrors.items = [...(errors.items || [])]; delete newErrors.items[idx]; setErrors(newErrors); } }}
                            className={`w-full bg-brand-bgbase border rounded-xl py-2.5 px-3 text-xs text-main focus:outline-none appearance-none ${errors.items?.[idx]?.product_id ? 'border-brand-crimson' : 'border-border focus:border-brand-neonblue'}`}>
                            <option value="">Select product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} — ₱{parseFloat(p.price).toLocaleString()}</option>)}
                          </select>
                          {errors.items?.[idx]?.product_id && <p className="flex items-center gap-1 text-[9px] font-bold text-brand-crimson mt-1"><AlertCircle size={10} />{errors.items[idx].product_id}</p>}
                        </div>
                        <div className="w-20">
                          <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || "")}
                            className={`w-full bg-brand-bgbase border rounded-xl py-2.5 px-3 text-xs text-main focus:outline-none text-center ${errors.items?.[idx]?.quantity ? 'border-brand-crimson' : 'border-border focus:border-brand-neonblue'}`} />
                          {errors.items?.[idx]?.quantity && <p className="text-[9px] font-bold text-brand-crimson text-center mt-0.5">{errors.items[idx].quantity}</p>}
                        </div>
                        <span className="text-xs font-bold text-muted w-20 shrink-0 text-right pt-3">₱{(item.unit_price * item.quantity).toLocaleString()}</span>
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="p-1.5 pt-3 text-muted hover:text-brand-crimson transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addItem}
                    className="mt-2 text-[10px] font-black uppercase tracking-widest text-brand-neonblue hover:text-main flex items-center gap-1 transition-colors">
                    <Plus size={12} /> Add Item
                  </button>
                </div>

                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Subtotal</p>
                    <p className="text-xl font-rajdhani font-black text-main">₱{subtotal.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Notes (optional)</label>
                  <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                    rows={2} placeholder="Terms & conditions, delivery notes..."
                    className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal}
                    className="flex-1 py-3.5 rounded-full border border-border text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-[2] py-3.5 bg-brand-neonblue/20 hover:bg-brand-neonblue text-brand-neonblue hover:text-white border border-brand-neonblue/40 rounded-full text-[10px] font-black uppercase tracking-[3px] transition-all active:scale-[0.98]">
                    {editingQuote ? 'Save Warranty' : 'Create Warranty Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {viewQuote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewQuote(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-brand-surface border border-border rounded-[32px] p-8 relative z-10 shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue mb-1">Warranty</p>
                  <h3 className="text-xl font-rajdhani font-black uppercase">{viewQuote.customer_name}</h3>
                </div>
                <button onClick={() => setViewQuote(null)} className="p-2 text-muted hover:text-main transition-colors"><X size={18} /></button>
              </div>
              <div className="space-y-3 mb-6">
                {viewQuote.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-brand-bgbase/50 border border-border/30">
                    <div>
                      <p className="text-sm font-bold text-main">{item.product_name || "Product"}</p>
                      <p className="text-[10px] text-muted font-bold">Qty: {item.quantity} × ₱{item.unit_price.toLocaleString()}</p>
                    </div>
                    <p className="font-black text-main">₱{(item.quantity * item.unit_price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/50 pt-4 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-muted">Total</span>
                <span className="text-2xl font-rajdhani font-black text-main">₱{viewQuote.subtotal.toLocaleString()}</span>
              </div>
              {viewQuote.note && (
                <p className="mt-4 text-xs text-muted bg-brand-bgbase/50 rounded-xl p-3 border border-border/30">{viewQuote.note}</p>
              )}
              <button onClick={() => window.print()} className="mt-6 w-full py-3 bg-brand-bgbase border border-border rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-muted hover:text-main transition-all">
                <Printer size={14} /> Print Warranty Details
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
