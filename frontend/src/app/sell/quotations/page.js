"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  FileText,
  Search,
  Plus,
  Eye,
  Download,
  User,
  ChevronLeft,
  ChevronRight,
  Printer,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
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
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewQuote, setViewQuote] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    customer_name: "",
    valid_until: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    items: [{ product_id: "", product_name: "", quantity: 1, unit_price: 0 }],
    note: ""
  });

  useEffect(() => {
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
      }
      return { ...f, items };
    });

  const subtotal = form.items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.customer_name) return toast.error("Please enter a customer name");
    if (form.items.some(i => !i.product_id && !i.product_name)) return toast.error("Please fill in all items");
    const newQuote = {
      id: Date.now(),
      ...form,
      subtotal,
      status: "Draft",
      createdAt: new Date().toISOString()
    };
    saveQuotations([newQuote, ...quotations]);
    toast.success("Quotation created");
    setIsModalOpen(false);
    setForm({ customer_name: "", valid_until: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0], items: [{ product_id: "", product_name: "", quantity: 1, unit_price: 0 }], note: "" });
  };

  const handleStatusChange = (id, status) => {
    saveQuotations(quotations.map(q => q.id === id ? { ...q, status } : q));
    toast.success(`Quotation marked as ${status}`);
  };

  const filtered = quotations.filter(q =>
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
        <TopBar title="QUOTATIONS" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">

          {/* Header */}
          <div className="mb-6">
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
              Client Quotes
            </motion.h2>
            <h1 className="text-2xl font-rajdhani font-black uppercase">
              LIST <span className="text-brand-neonblue">QUOTATIONS</span>
            </h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Quotes", value: quotations.length, color: "text-main" },
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
            <button onClick={() => setIsModalOpen(true)} className="btn-premium flex items-center gap-2 px-6 py-2.5 rounded-full text-xs">
              <Plus size={16} /> New Quotation
            </button>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-brand-bgbase/50 text-[10px] font-black uppercase tracking-widest text-muted border-b border-border">
                    <th className="py-4 px-6">Quote #</th>
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
                    <tr><td colSpan="7" className="py-20 text-center">
                      <FileText className="mx-auto text-main/10 mb-3" size={36} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                        {search ? "No matching quotations" : 'No quotations yet — click "New Quotation" to start'}
                      </p>
                    </td></tr>
                  ) : paginated.map((q, idx) => (
                    <motion.tr key={q.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-border/30 hover:bg-brand-bgbase/30 transition-colors group">
                      <td className="py-4 px-6 font-mono text-[10px] text-muted">QT-{String(q.id).slice(-5)}</td>
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
                          onChange={e => handleStatusChange(q.id, e.target.value)}
                          className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border appearance-none bg-transparent cursor-pointer ${STATUS_STYLE[q.status] || STATUS_STYLE.Draft}`}>
                          {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button onClick={() => setViewQuote(q)}
                          className="p-2 rounded-lg border border-border text-muted hover:text-main hover:border-brand-neonblue/40 transition-all">
                          <Eye size={13} />
                        </button>
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
        <Toaster position="bottom-right" />
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-brand-surface border border-border rounded-[32px] p-8 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="absolute top-0 right-0 w-40 h-40 bg-brand-neonblue/10 blur-[80px] pointer-events-none" />
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue mb-1">Create</p>
                <h3 className="text-xl font-rajdhani font-black uppercase tracking-widest">New Quotation</h3>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Customer Name *</label>
                    <input type="text" required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                      placeholder="Client name..."
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1">Valid Until</label>
                    <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                      className="w-full mt-1.5 bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all" />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-1 block mb-2">Items</label>
                  <div className="space-y-2">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select value={item.product_id} onChange={e => updateItem(idx, "product_id", e.target.value)}
                          className="flex-1 bg-brand-bgbase border border-border rounded-xl py-2.5 px-3 text-xs text-main focus:outline-none focus:border-brand-neonblue appearance-none">
                          <option value="">Select product...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} — ₱{parseFloat(p.price).toLocaleString()}</option>)}
                        </select>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value))}
                          className="w-16 bg-brand-bgbase border border-border rounded-xl py-2.5 px-3 text-xs text-main focus:outline-none focus:border-brand-neonblue" />
                        <span className="text-xs font-bold text-muted w-20 shrink-0 text-right">₱{(item.unit_price * item.quantity).toLocaleString()}</span>
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-muted hover:text-brand-crimson transition-colors">
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
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 rounded-full border border-border text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main transition-all">Cancel</button>
                  <button type="submit"
                    className="flex-[2] py-3.5 bg-brand-neonblue/20 hover:bg-brand-neonblue text-brand-neonblue hover:text-white border border-brand-neonblue/40 rounded-full text-[10px] font-black uppercase tracking-[3px] transition-all active:scale-[0.98]">
                    Create Quotation
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
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue mb-1">Quotation</p>
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
                <Printer size={14} /> Print Quotation
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
