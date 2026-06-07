// src/app/reports/stock/page.js
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { PackageCheck, Search, Download, Plus, RefreshCw, AlertCircle, TrendingUp, Edit, Clock, ShieldAlert, CheckCircle2, FileDown, Trash2, UploadCloud, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import RestockRequestModal from "@/components/restock/RestockRequestModal";
import { exportToExcel } from "@/lib/excelExport";

// --- Modals ---
// Removed old RestockModal implementation in favor of shared component

const AddProductModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({ name: '', sku: '', description: '', category_id: '', price: '' });
  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const fetchCats = async () => {
        try {
          const res = await fetch(apiUrl("/api/categories"), { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
          if (res.ok) setCategories(await res.json());
        } catch (e) {}
      };
      fetchCats();
      setFormData({ name: '', sku: '', description: '', category_id: '', price: '' });
      setImageFile(null);
      setImagePreview(null);
    }
  }, [isOpen]);

  const processImageFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error("Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-brand-surface border border-brand-neonblue/30 rounded-2xl p-6 lg:p-8 max-w-lg w-full shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar">
        <h2 className="text-2xl font-rajdhani font-black uppercase text-main mb-6">Create New Product</h2>
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-[10px] uppercase font-black tracking-widest text-muted mb-1">Product Name</label>
            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-4 py-2.5 font-bold outline-none focus:border-brand-neonblue" placeholder="e.g. NVIDIA RTX 5090" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-muted mb-1">SKU Code</label>
              <input type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-4 py-2.5 font-bold outline-none focus:border-brand-neonblue" placeholder="PCA-GPU-..." />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-muted mb-1">Price (₱)</label>
              <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-4 py-2.5 font-bold outline-none focus:border-brand-neonblue" placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-muted mb-1">Hardware Category</label>
              <select value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })} className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-4 py-2.5 font-bold outline-none focus:border-brand-neonblue h-11 appearance-none cursor-pointer">
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-muted mb-1">Product Description</label>
              <input type="text" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-4 py-2.5 font-bold outline-none focus:border-brand-neonblue" placeholder="Brief details..." />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-black tracking-widest text-muted mb-1.5">Product Image</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); processImageFile(e.dataTransfer.files[0]); }}
              className={`w-full h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${
                isDragging ? 'border-brand-neonblue bg-brand-neonblue/10 scale-[1.01]' : 'border-border hover:border-brand-neonblue hover:bg-brand-neonblue/5'
              }`}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest bg-brand-surface/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
                      <UploadCloud size={12} /> Replace
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                      className="text-white text-[10px] font-black uppercase tracking-widest bg-brand-crimson/80 hover:bg-brand-crimson px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <UploadCloud size={20} className="text-muted mx-auto mb-2 group-hover:text-brand-neonblue transition-colors" />
                  <p className="text-xs font-bold text-main">Drag & Drop or click to upload</p>
                  <p className="text-[9px] text-muted uppercase tracking-widest mt-0.5">JPG, PNG, or WEBP (Max. 5MB)</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={e => processImageFile(e.target.files[0])} accept="image/jpeg,image/png,image/webp" className="hidden" />
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-border text-main font-bold uppercase tracking-widest hover:bg-brand-bgbase transition-colors">Cancel</button>
          <button onClick={() => onSave(formData, imageFile)} className="flex-1 py-3 rounded-lg bg-brand-neonblue text-white font-black uppercase tracking-[2px] shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:scale-[1.02] transition-transform">Save Product</button>
        </div>
      </motion.div>
    </div>
  );
};

// Placeholder components for EditProductModal, HistoryModal, DeleteActionModal – import them if they exist
import EditProductModal from "./EditProductModal";
import HistoryModal from "./HistoryModal";
import DeleteActionModal from "./DeleteActionModal";

export default function StockReportPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [inventory, setInventory] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [user, setUser] = useState(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [activeRestock, setActiveRestock] = useState(null);
  const [activeHistory, setActiveHistory] = useState(null);
  const [activeDelete, setActiveDelete] = useState(null);
  const [activeEdit, setActiveEdit] = useState(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Pagination & sorting state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('ASC');

  // Simple debounce hook
  const useDebounce = (value, delay) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debounced;
  };

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [limit, debouncedSearch, filterStatus, sortField, sortDir]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      try {
        const invRes = await fetch(apiUrl(`/api/inventory?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&sortField=${sortField}&sortDir=${sortDir}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const salesRes = await fetch(apiUrl("/api/sales/history"), { headers: { Authorization: `Bearer ${token}` } });
        if (invRes.ok) {
          const raw = await invRes.json();
          setInventory(raw.data ?? []);
          setTotalItems(raw.totalItems || 0);
          setTotalPages(raw.totalPages || 0);
        }
        if (salesRes.ok) setSalesData(await salesRes.json());
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, [page, limit, debouncedSearch, sortField, sortDir]);

  const processedData = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const prodSales = {};
    salesData.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= thirtyDaysAgo && order.OrderItems) {
        order.OrderItems.forEach(item => {
          prodSales[item.product_id] = (prodSales[item.product_id] || 0) + item.quantity;
        });
      }
    });
    return inventory.map(item => {
      const sold = prodSales[item.product_id] || 0;
      const daily = sold / 30;
      const daysRem = daily > 0 ? Math.floor(item.quantity / daily) : 999;
      let statusGroup = 'Healthy', statusColor = 'text-green-500', badge = 'bg-green-500/10 border-green-500/20';
      if (sold === 0) { statusGroup = 'Dead Stock'; statusColor = 'text-main/50'; badge = 'bg-brand-bgbase border-border'; }
      else if (daysRem <= 5) { statusGroup = 'Critical'; statusColor = 'text-brand-crimson'; badge = 'bg-red-500/10 border-red-500/20'; }
      else if (daysRem <= 10) { statusGroup = 'Low'; statusColor = 'text-orange-500'; badge = 'bg-orange-500/10 border-orange-500/20'; }
      return {
        id: item.product_id,
        branch_id: item.branch_id,
        name: item.Product?.name || 'Unknown',
        category: item.Product?.Category?.name || 'Uncategorized',
        last_purchase_price: item.Product?.last_purchase_price,
        price: item.Product?.price,
        stock: item.quantity,
        dailySales: daily.toFixed(1),
        daysRemaining: daysRem > 500 ? '∞' : daysRem,
        statusGroup,
        statusColor,
        badge
      };
    });
  }, [inventory, salesData]);

  const filteredData = useMemo(() => {
    return processedData.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterStatus === "All" || i.statusGroup === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [processedData, search, filterStatus]);

  const kpis = {
    total: processedData.length,
    low: processedData.filter(i => i.statusGroup === 'Low' || i.statusGroup === 'Critical').length,
    dead: processedData.filter(i => i.statusGroup === 'Dead Stock').length,
    incoming: 0
  };

  const handleExport = () => {
    const exportData = filteredData.map(i => ({
      'Product Name': i.name,
      'Category': i.category,
      'Current Stock': i.stock,
      'Daily Sales Trend': i.dailySales,
      'Days Remaining': i.daysRemaining,
      'Status': i.statusGroup
    }));
    const exportOptions = {
      title: 'PC ALLEY - INVENTORY INTELLIGENCE REPORT',
      subtitle: `Target Branch: All Branches | Filter: ${filterStatus}`,
      summary: {
        'Total Unique SKUs': kpis.total,
        'Stock Alert Count': kpis.low,
        'Dead Stock Items': kpis.dead,
        'Report Accuracy': 'High (Live System Data)'
      }
    };
    try { exportToExcel(exportData, `PCA_Stock_Report`, 'Inventory', exportOptions); toast.success("Excel Intelligence Report Generated"); }
    catch (error) { toast.error("Export Protocol Failed"); }
  };

  const setSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDir('ASC');
    }
  };

  // Pagination UI helper
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/api/products/${product.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Product deleted');
        // Refresh inventory data
        setPage(1);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Delete failed');
      }
    } catch (e) {
      toast.error('Error deleting product');
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-all duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Toaster position="top-right" />
        <TopBar title="MANAGE STOCK" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 text-main p-4">
          <div className="responsive-container">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h2 className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-2">Stock Status</h2>
                <h1 className="text-2xl font-rajdhani font-black uppercase mb-0">
                  INVENTORY <span className="text-brand-neonblue">SUMMARY</span>
                </h1>
              </div>
              <div className="flex gap-2">
                {['All', 'Critical', 'Low', 'Healthy', 'Dead Stock'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${filterStatus === status ? 'bg-brand-neonblue/10 border-brand-neonblue/40 text-brand-neonblue' : 'bg-brand-surface border-border text-muted hover:text-main'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            {/* KPI Strip */}
            <div className="responsive-grid mb-8">
              <div className="glass-card p-4 md:p-6 flex items-center justify-between">
                <div><p className="text-[10px] uppercase font-black tracking-widest text-muted mb-1">Total Products</p><h3 className="text-2xl font-black text-main">{kpis.total}</h3></div>
                <div className="w-10 h-10 rounded-xl bg-brand-neonblue/10 flex items-center justify-center text-brand-neonblue"><PackageCheck size={20} /></div>
              </div>
              <div className="glass-card p-4 md:p-6 flex items-center justify-between border-l-2 border-orange-500">
                <div><p className="text-[10px] uppercase font-black tracking-widest text-muted mb-1">Low / Critical</p><h3 className="text-2xl font-black text-orange-500">{kpis.low}</h3></div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500"><TrendingUp size={20} /></div>
              </div>
              <div className="glass-card p-4 md:p-6 flex items-center justify-between border-l-2 border-border">
                <div><p className="text-[10px] uppercase font-black tracking-widest text-muted mb-1">Dead Stock</p><h3 className="text-2xl font-black text-main">{kpis.dead}</h3></div>
                <div className="w-10 h-10 rounded-xl bg-brand-bgbase flex items-center justify-center text-muted"><AlertCircle size={20} /></div>
              </div>
              <div className="glass-card p-4 md:p-6 flex items-center justify-between">
                <div><p className="text-[10px] uppercase font-black tracking-widest text-muted mb-1">On The Way</p><h3 className="text-2xl font-black text-main">{kpis.incoming}</h3></div>
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500"><Clock size={20} /></div>
              </div>
            </div>
            {/* Filter & Action Bar */}
            <div className="bg-brand-surface border border-border/50 rounded-xl p-4 mb-6 flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="flex w-full lg:w-auto gap-4">
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-brand-bgbase border border-border/50 text-main text-xs font-bold rounded-lg pl-9 pr-4 py-3 outline-none focus:border-brand-neonblue transition-colors" />
                </div>
              </div>
              <div className="flex w-full lg:w-auto gap-3">
                <button onClick={handleExport} className="bg-brand-bgbase border border-border text-muted hover:text-main px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-brand-surface">
                  <FileDown size={16} className="text-brand-neonblue" /> Export Excel
                </button>
                {(user?.role !== 'employee' && user?.role !== 'staff') && (
                  <button onClick={() => setIsAddingProduct(true)} className="btn-premium flex items-center gap-2 py-2.5 px-5 rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:scale-105 transition-transform"><Plus size={16} /> Add Product</button>
                )}
              </div>
            </div>
            {/* Rows‑per‑page selector */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">Show</span>
              <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className="border border-border rounded px-2 py-1 text-sm">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm font-medium">entries</span>
            </div>
            {/* Main Table */}
            <div className="bg-brand-surface border border-border/50 rounded-xl shadow-sm overflow-hidden min-h-[400px]" style={{ minHeight: '400px' }}>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                  <thead>
                    <tr className="bg-brand-bgbase/50 text-[10px] uppercase font-black tracking-widest text-muted border-b border-border/50">
                      <th className="py-4 px-6 cursor-pointer" onClick={() => setSort('name')}>Product</th>
                      <th className="py-4 px-6 cursor-pointer" onClick={() => setSort('category')}>Category</th>
                      <th className="py-4 px-4 text-right cursor-pointer" onClick={() => setSort('quantity')}>Current Stock</th>
                      <th className="py-4 px-4 text-center cursor-pointer" onClick={() => setSort('daily')}>Daily Trend</th>
                      <th className="py-4 px-4 text-center cursor-pointer" onClick={() => setSort('runway')}>Runway</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="py-8 text-center text-muted">Loading...</td></tr>
                    ) : (
                      filteredData.map((item, idx) => (
                        <motion.tr initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={idx} className="border-b border-border/20 text-sm hover:bg-brand-bgbase/30 transition-colors group">
                          <td className="py-4 px-6 font-bold text-main">{item.name}</td>
                          <td className="py-4 px-6 text-xs text-muted/80 font-bold uppercase tracking-wider">{item.category}</td>
                          <td className="py-4 px-4 text-right font-black text-main text-lg">{item.stock}</td>
                          <td className="py-4 px-4 text-center text-xs font-bold text-muted">{item.dailySales}/day</td>
                          <td className={`py-4 px-4 text-center font-black ${item.statusColor}`}>{item.daysRemaining} {item.daysRemaining !== '∞' && 'days'}</td>
                          <td className="py-4 px-4 text-center"><span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border rounded w-full inline-block ${item.badge} ${item.statusColor}`}>{item.statusGroup}</span></td>
                          <td className="py-4 px-6"><div className="flex items-center justify-end gap-2 transition-opacity">
                            {(user?.role !== 'employee' && user?.role !== 'staff') && (
                              <button onClick={() => setActiveEdit(item)} className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted hover:text-main hover:bg-border/20 transition-all" title="Edit"><Edit size={14} /></button>
                            )}
                            <button onClick={() => setActiveHistory(item)} className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted hover:text-main hover:bg-border/20 transition-all" title="History"><Clock size={14} /></button>
                            {user?.role === 'super_admin' && (
                              <button onClick={() => handleDeleteProduct(item)} className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted hover:text-main hover:bg-border/20 transition-all" title="Delete"><Trash2 size={14} /></button>
                            )}
                          </div></td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4 text-sm">
              <div>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalItems)} of {totalItems} records</div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className={`px-2 py-1 rounded ${page === 1 ? 'text-muted cursor-not-allowed' : 'hover:bg-brand-bgbase'}`}>← Previous</button>
                {pageNumbers.map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`px-2 py-1 rounded ${p === page ? 'bg-brand-neonblue text-white' : 'hover:bg-brand-bgbase'}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages} className={`px-2 py-1 rounded ${page === totalPages ? 'text-muted cursor-not-allowed' : 'hover:bg-brand-bgbase'}`}>Next →</button>
              </div>
            </div>
          </div>
        </div>
        {/* Modals */}
        {isAddingProduct && <AddProductModal isOpen={isAddingProduct} onClose={() => setIsAddingProduct(false)} onSave={handleSaveProduct} />}
        {activeEdit && <EditProductModal product={activeEdit} isOpen={!!activeEdit} onClose={() => setActiveEdit(null)} onUpdate={handleUpdateProduct} />}
        {activeHistory && <HistoryModal isOpen={!!activeHistory} onClose={() => setActiveHistory(null)} product={activeHistory} />}
        {activeDelete && <DeleteActionModal product={activeDelete} onClose={() => setActiveDelete(null)} onSuccess={() => { setPage(1); setActiveDelete(null); }} user={user} />}
        {activeRestock && <RestockRequestModal isOpen={!!activeRestock} onClose={() => setActiveRestock(null)} product={activeRestock} />}
      </main>
    </div>
  );
}
