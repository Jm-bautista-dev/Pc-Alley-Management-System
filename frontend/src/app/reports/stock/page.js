// src/app/reports/stock/page.js
"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { PackageCheck, Search, Download, Plus, RefreshCw, AlertCircle, TrendingUp, Edit, Clock, ShieldAlert, CheckCircle2, FileDown, Trash2, UploadCloud, Image as ImageIcon, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { useRouter } from "next/navigation";
import RestockRequestModal from "@/components/restock/RestockRequestModal";
import { exportToExcel } from "@/lib/excelExport";

// --- Modals ---

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
  const [filterBranch, setFilterBranch] = useState("");
  const [branches, setBranches] = useState([]);

  const [filterCategory, setFilterCategory] = useState("All");
  const [categories, setCategories] = useState([]);

  const [activeRestock, setActiveRestock] = useState(null);
  const [activeHistory, setActiveHistory] = useState(null);
  const [activeDelete, setActiveDelete] = useState(null);
  const [activeEdit, setActiveEdit] = useState(null);

  // Pagination & sorting state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('ASC');
  const [refreshKey, setRefreshKey] = useState(0);

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
    // Fetch branches and categories for filter dropdowns
    const fetchDropdowns = async () => {
      const token = localStorage.getItem("token");
      try {
        const [bRes, cRes] = await Promise.all([
          fetch(apiUrl("/api/branches"), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(apiUrl("/api/categories"), { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (bRes.ok) setBranches(await bRes.json());
        if (cRes.ok) {
          const cData = await cRes.json();
          setCategories(Array.isArray(cData) ? cData : (cData?.data || []));
        }
      } catch (e) { }
    };
    fetchDropdowns();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [limit, debouncedSearch, filterStatus, filterBranch, filterCategory, sortField, sortDir]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      try {
        const branchParam = filterBranch ? `&branch_id=${filterBranch}` : '';
        const categoryParam = filterCategory && filterCategory !== "All" ? `&category_id=${filterCategory}` : '';
        const invRes = await fetch(apiUrl(`/api/inventory?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&sortField=${sortField}&sortDir=${sortDir}${branchParam}${categoryParam}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const salesRes = await fetch(apiUrl("/api/sales/history?limit=10000"), { headers: { Authorization: `Bearer ${token}` } });
        if (invRes.ok) {
          const raw = await invRes.json();
          setInventory(raw.data ?? []);
          setTotalItems(raw.totalItems || 0);
          setTotalPages(raw.totalPages || 0);
        }
        if (salesRes.ok) {
          const salesRaw = await salesRes.json();
          setSalesData(Array.isArray(salesRaw) ? salesRaw : (salesRaw?.data ?? salesRaw?.sales ?? []));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, [page, limit, debouncedSearch, filterBranch, filterCategory, sortField, sortDir, refreshKey]);

  const processedData = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const prodSales = {};
    salesData.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= thirtyDaysAgo) {
        const items = order.SaleItems || order.OrderItems || order.items || [];
        items.forEach(item => {
          const pId = item.productId ?? item.product_id;
          if (pId) {
            prodSales[pId] = (prodSales[pId] || 0) + (Number(item.quantity) || 0);
          }
        });
      }
    });
    return inventory.map(item => {
      const pId = item.product_id || item.Product?.id || item.id;
      const stock = item.stock !== undefined && item.stock !== null ? Number(item.stock) : Number(item.quantity || 0);
      const sold = prodSales[pId] || 0;
      const daily = sold / 30;
      const daysRem = daily > 0 ? Math.floor(stock / daily) : (stock === 0 ? 0 : 999);

      // ── Percentage & Category-based Minimum Stock Baseline ──
      // Default baseline: GPUs (and high-value components) = 10 pcs minimum
      // Fast-moving peripherals (monitors, keyboards, mice, headsets, cables) = 50 pcs minimum
      const catName = (item.Product?.Category?.name || item.category || '').toLowerCase();
      const prodName = (item.Product?.name || item.name || '').toLowerCase();

      let targetMinStock = item.low_stock_threshold || 10;
      const isFastMoving = 
        catName.includes('monitor') || 
        catName.includes('keyboard') || 
        catName.includes('mouse') || 
        catName.includes('headset') || 
        catName.includes('accessory') || 
        catName.includes('accessories') || 
        catName.includes('peripheral') || 
        catName.includes('peripherals') ||
        prodName.includes('monitor') || 
        prodName.includes('keyboard') || 
        prodName.includes('mouse') || 
        prodName.includes('headset') || 
        prodName.includes('earbuds') || 
        prodName.includes('cable') || 
        prodName.includes('mousepad');

      const isGPU = 
        catName.includes('gpu') || 
        catName.includes('graphics card') || 
        catName.includes('nvidia') || 
        prodName.includes('rtx') || 
        prodName.includes('gtx') || 
        prodName.includes('radeon') || 
        prodName.includes('rx ');

      if (isFastMoving) {
        targetMinStock = item.low_stock_threshold && item.low_stock_threshold > 10 ? item.low_stock_threshold : 50;
      } else if (isGPU) {
        targetMinStock = item.low_stock_threshold && item.low_stock_threshold > 0 ? item.low_stock_threshold : 10;
      } else {
        targetMinStock = item.low_stock_threshold || 15;
      }

      // Percentage calculation relative to minimum stock target (100% capacity)
      const stockPercent = targetMinStock > 0 ? Math.round((stock / targetMinStock) * 100) : 100;

      const createdAtDate = item.Product?.createdAt || item.createdAt;
      const ageDays = createdAtDate ? (today - new Date(createdAtDate)) / 86400000 : 90;

      let statusGroup = 'In Stock', statusColor = 'text-green-500', badge = 'bg-green-500/10 border-green-500/20';
      if (stock === 0 || stockPercent === 0) {
        // 0% -> Out of Stock
        statusGroup = 'Out of Stock';
        statusColor = 'text-brand-crimson';
        badge = 'bg-red-500/10 border-red-500/20';
      } else if (stockPercent <= 15) {
        // <= 15% -> Critical Stock
        statusGroup = 'Critical Stock';
        statusColor = 'text-red-400 font-black';
        badge = 'bg-red-500/15 border-red-500/30 animate-pulse';
      } else if (stockPercent <= 30) {
        // <= 30% -> Low Stock
        statusGroup = 'Low Stock';
        statusColor = 'text-orange-500';
        badge = 'bg-orange-500/10 border-orange-500/20';
      } else if (sold === 0 && ageDays >= 30) {
        statusGroup = 'Dead Stock';
        statusColor = 'text-yellow-500';
        badge = 'bg-yellow-500/10 border-yellow-500/20';
      }
      return {
        id: pId,
        branch_id: item.branch_id,
        name: item.Product?.name || item.name || 'Unknown',
        category: item.Product?.Category?.name || 'Uncategorized',
        category_id: item.Product?.category_id || '',
        brand_id: item.Product?.brand_id || '',
        sku: item.Product?.sku || '',
        description: item.Product?.description || '',
        specifications: item.Product?.specifications || '',
        last_purchase_price: item.Product?.last_purchase_price,
        image_url: item.Product?.image_url || null,
        product_image: item.Product?.product_image || null,
        price: item.price !== null && item.price !== undefined ? item.price : item.Product?.price,
        branch_price: item.price,
        global_price: item.Product?.price,
        enabled: item.enabled !== false,
        low_stock_threshold: item.low_stock_threshold,
        minTarget: targetMinStock,
        stockPercent,
        stock,
        sold30: sold,
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
      const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase());
      let matchesFilter = true;
      if (filterStatus === "Critical Stock") {
        matchesFilter = i.statusGroup === "Critical Stock";
      } else if (filterStatus === "Low Stock") {
        matchesFilter = i.statusGroup === "Low Stock" || i.statusGroup === "Critical Stock";
      } else if (filterStatus === "Dead Stock") {
        matchesFilter = i.statusGroup === "Dead Stock";
      } else if (filterStatus === "Out of Stock") {
        matchesFilter = i.statusGroup === "Out of Stock";
      } else if (filterStatus !== "All") {
        matchesFilter = i.statusGroup === filterStatus;
      }
      return matchesSearch && matchesFilter;
    });
  }, [processedData, search, filterStatus]);

  const kpis = {
    total: processedData.length,
    critical: processedData.filter(i => i.statusGroup === 'Critical Stock').length,
    low: processedData.filter(i => i.statusGroup === 'Low Stock' || i.statusGroup === 'Critical Stock').length,
    dead: processedData.filter(i => i.statusGroup === 'Dead Stock').length,
    outOfStock: processedData.filter(i => i.statusGroup === 'Out of Stock').length,
    incoming: 0
  };

  const handleExport = () => {
    const exportData = filteredData.map(i => ({
      'Product Name': i.name,
      'Category': i.category,
      'Current Stock': i.stock,
      '30-Day Sales': i.sold30,
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
        'Out of Stock Items': kpis.outOfStock,
        'Report Accuracy': 'High (Live System Data)'
      }
    };
    try { exportToExcel(exportData, `PCA_Stock_Report`, 'Inventory', exportOptions); showSuccess("Excel Intelligence Report Generated"); }
    catch (error) { showError("Export Protocol Failed"); }
  };

  const setSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDir('ASC');
    }
  };

  // Sliding window pagination helper (Option 1)
  const getPaginationItems = (current, total) => {
    if (!total || total <= 0) return [];
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const items = [];
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) items.push(i);
      items.push("...");
      items.push(total);
    } else if (current >= total - 3) {
      items.push(1);
      items.push("...");
      for (let i = total - 4; i <= total; i++) items.push(i);
    } else {
      items.push(1);
      items.push("...");
      items.push(current - 1);
      items.push(current);
      items.push(current + 1);
      items.push("...");
      items.push(total);
    }
    return items;
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = await showConfirm(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      { danger: true, confirmLabel: "Delete" }
    );
    if (!confirmed) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/api/products/${product.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Product deleted');
        // Refresh inventory data
        setPage(1);
      } else {
        const err = await res.json();
        showError(err.error || 'Delete failed');
      }
    } catch (e) {
      showError('Error deleting product');
    }
  };

  // Refresh after modal save (modal handles its own API calls)
  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  const handleResync = async () => {
    const confirmed = await showConfirm(
      "Resync Products to Branches?",
      "This will scan the database and create missing branch product records for any branches that don't have them yet."
    );
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl("/api/inventory/resync"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || "Resync complete.");
        setRefreshKey(k => k + 1);
      } else {
        showError(data.error || "Resync failed.");
      }
    } catch (e) {
      showError("Error during resync.");
    }
  };

  // State to toggle debug panel visibility
  const [showDebug, setShowDebug] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState(null);

  const handleRepairAll = async () => {
    setRepairing(true);
    setRepairResult(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl("/api/inventory/repair"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRepairResult(data);
        showSuccess(data.message || "Repair completed.");
        setRefreshKey(k => k + 1);
      } else {
        showError(data.error || "Repair failed.");
      }
    } catch (e) {
      showError("Error during repair.");
    }
    setRepairing(false);
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-all duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
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
              <div className="flex flex-wrap gap-2">
                {['All', 'Low Stock', 'Critical Stock', 'Dead Stock', 'Out of Stock'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                      filterStatus === status 
                        ? status === 'Critical Stock'
                          ? 'bg-red-500/15 border-red-500/50 text-red-400 shadow-sm shadow-red-500/20'
                          : 'bg-brand-neonblue/10 border-brand-neonblue/40 text-brand-neonblue' 
                        : 'bg-brand-surface border-border text-muted hover:text-main'
                    }`}
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
                <div><p className="text-[10px] uppercase font-black tracking-widest text-muted mb-1">Low Stock (≤30%)</p><h3 className="text-2xl font-black text-orange-500">{kpis.low}</h3></div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500"><TrendingUp size={20} /></div>
              </div>
              <div className="glass-card p-4 md:p-6 flex items-center justify-between border-l-2 border-red-500">
                <div><p className="text-[10px] uppercase font-black tracking-widest text-muted mb-1">Critical (≤15%)</p><h3 className="text-2xl font-black text-red-500">{kpis.critical}</h3></div>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500"><AlertCircle size={20} /></div>
              </div>
              <div className="glass-card p-4 md:p-6 flex items-center justify-between border-l-2 border-yellow-500">
                <div><p className="text-[10px] uppercase font-black tracking-widest text-muted mb-1">Dead Stock</p><h3 className="text-2xl font-black text-yellow-500">{kpis.dead}</h3></div>
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500"><Clock size={20} /></div>
              </div>
              <div className="glass-card p-4 md:p-6 flex items-center justify-between border-l-2 border-brand-crimson">
                <div><p className="text-[10px] uppercase font-black tracking-widest text-muted mb-1">Out of Stock</p><h3 className="text-2xl font-black text-brand-crimson">{kpis.outOfStock}</h3></div>
                <div className="w-10 h-10 rounded-xl bg-brand-crimson/10 flex items-center justify-center text-brand-crimson"><AlertCircle size={20} /></div>
              </div>
            </div>
            {/* Filter & Action Bar */}
            <div className="bg-brand-surface border border-border/50 rounded-xl p-4 mb-6 flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="flex w-full lg:w-auto gap-4">
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-brand-bgbase border border-border/50 text-main text-xs font-bold rounded-lg pl-9 pr-4 py-3 outline-none focus:border-brand-neonblue transition-colors" />
                </div>

                {/* Category Filter Dropdown */}
                <div className="w-full sm:w-56">
                  <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border/50 text-main text-xs font-bold rounded-lg px-3 py-3 outline-none focus:border-brand-neonblue cursor-pointer transition-colors"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
              <div className="flex w-full lg:w-auto gap-3">
                {user?.role === 'super_admin' && (
                  <button onClick={handleResync} className="bg-brand-neonblue/10 border border-brand-neonblue/25 text-brand-neonblue hover:bg-brand-neonblue/20 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                    <RefreshCw size={14} /> Resync Branches
                  </button>
                )}
                <button onClick={handleExport} className="bg-brand-bgbase border border-border text-muted hover:text-main px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-brand-surface">
                  <FileDown size={16} className="text-brand-neonblue" /> Export Excel
                </button>

              </div>
            </div>
            {/* Rows‑per‑page selector */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium text-main">Show</span>
              <select
                value={limit}
                onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                className="border border-border rounded-lg px-2.5 py-1 text-sm bg-brand-surface text-main font-semibold outline-none focus:border-brand-neonblue cursor-pointer transition-colors"
              >
                <option value={10} className="bg-brand-surface text-main">10</option>
                <option value={25} className="bg-brand-surface text-main">25</option>
                <option value={50} className="bg-brand-surface text-main">50</option>
                <option value={100} className="bg-brand-surface text-main">100</option>
              </select>
              <span className="text-sm font-medium text-main">entries</span>
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
                      <th className="py-4 px-4 text-right">Price</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="py-12 text-center text-muted font-semibold text-sm">Loading inventory data...</td></tr>
                    ) : filteredData.length === 0 ? (
                      <tr><td colSpan={6} className="py-16 text-center text-muted font-bold text-sm">No products found matching the selected filters.</td></tr>
                    ) : (
                      filteredData.map((item, idx) => (
                        <motion.tr initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={idx} className="border-b border-border/20 text-sm hover:bg-brand-bgbase/30 transition-colors group">
                          <td className="py-4 px-6 font-bold text-main">{item.name}</td>
                          <td className="py-4 px-6 text-xs text-muted/80 font-bold uppercase tracking-wider">{item.category}</td>
                          <td className="py-4 px-4 text-right">
                            <div className="font-black text-main text-lg leading-tight">{item.stock}</div>
                            <div className="text-[10px] font-bold text-muted mt-0.5">
                              <span className={item.stockPercent <= 15 ? 'text-red-400 font-black' : item.stockPercent <= 30 ? 'text-orange-400 font-black' : 'text-green-400'}>
                                {item.stockPercent}%
                              </span>
                              <span className="text-muted/60"> of {item.minTarget} min</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-brand-crimson">₱{Number(item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-4"><span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border rounded w-full inline-block text-center ${item.badge} ${item.statusColor}`}>{item.statusGroup}</span></td>
                          <td className="py-4 px-6"><div className="flex items-center justify-end gap-2 transition-opacity">
                            {(user?.role === 'employee' || user?.role === 'branch_admin') && (
                              <button
                                onClick={() => setActiveRestock(item)}
                                className="px-3 py-1.5 bg-brand-neonblue/10 border border-brand-neonblue/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-brand-neonblue hover:bg-brand-neonblue/20 transition-all"
                              >
                                Request Restock
                              </button>
                            )}
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
            {/* Pagination Controls — Option 1: Centered Sliding Window */}
            {totalPages > 0 && (
              <div className="mt-8 flex flex-col items-center justify-center gap-3">
                {/* Centered Page Navigation */}
                <div className="flex items-center justify-center flex-wrap gap-1.5 bg-brand-surface/60 p-2 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm">
                  {/* First button */}
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      page === 1
                        ? "text-muted/30 cursor-not-allowed border border-transparent"
                        : "text-muted hover:text-main hover:bg-brand-bgbase border border-border/50"
                    }`}
                    title="First Page"
                  >
                    « First
                  </button>

                  {/* Previous button */}
                  <button
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      page === 1
                        ? "text-muted/30 cursor-not-allowed border border-transparent"
                        : "text-muted hover:text-main hover:bg-brand-bgbase border border-border/50"
                    }`}
                    title="Previous Page"
                  >
                    ‹ Previous
                  </button>

                  {/* Sliding Page Numbers with Ellipsis */}
                  {getPaginationItems(page, totalPages).map((item, idx) => {
                    if (item === "...") {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-muted/40 font-bold select-none">
                          …
                        </span>
                      );
                    }
                    const isCurrent = item === page;
                    return (
                      <button
                        key={`page-${item}`}
                        onClick={() => setPage(item)}
                        className={`min-w-[34px] h-[34px] px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
                          isCurrent
                            ? "bg-brand-neonblue text-white shadow-lg shadow-brand-neonblue/25 scale-105"
                            : "text-muted hover:text-main hover:bg-brand-bgbase border border-border/40 hover:border-brand-neonblue/30"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}

                  {/* Next button */}
                  <button
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      page === totalPages
                        ? "text-muted/30 cursor-not-allowed border border-transparent"
                        : "text-muted hover:text-main hover:bg-brand-bgbase border border-border/50"
                    }`}
                    title="Next Page"
                  >
                    Next ›
                  </button>

                  {/* Last button */}
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      page === totalPages
                        ? "text-muted/30 cursor-not-allowed border border-transparent"
                        : "text-muted hover:text-main hover:bg-brand-bgbase border border-border/50"
                    }`}
                    title="Last Page"
                  >
                    Last »
                  </button>
                </div>

                {/* Centered Record Summary & Rows Per Page Selector */}
                <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[2px] text-muted/60 text-center flex-wrap justify-center">
                  <span>
                    Showing <span className="text-main font-mono">{(page - 1) * limit + 1}–{Math.min(page * limit, totalItems)}</span> of <span className="text-main font-mono">{totalItems}</span> records
                  </span>
                  <span className="opacity-30">•</span>
                  <div className="flex items-center gap-1.5 lowercase tracking-normal">
                    <span className="text-[10px] uppercase font-bold text-muted/50 tracking-wider">Per page:</span>
                    <select
                      value={limit}
                      onChange={e => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="bg-brand-surface border border-border/50 rounded-lg px-2 py-0.5 text-xs font-bold text-main focus:outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            <AnimatePresence>
              {showDebug && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-brand-surface border border-border/50 rounded-xl p-6 mt-8 overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-border/30 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-rajdhani font-black uppercase text-brand-neonblue">Imported Products Diagnostics</h3>
                      <span className="px-2 py-0.5 rounded bg-brand-neonblue/10 text-brand-neonblue text-[8px] font-black uppercase">Live</span>
                    </div>
                    {user?.role === 'super_admin' && (
                      <button
                        onClick={handleRepairAll}
                        disabled={repairing}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {repairing ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        {repairing ? "Repairing..." : "Repair All"}
                      </button>
                    )}
                  </div>

                  {repairResult && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4 text-xs">
                      <p className="font-black text-green-500 uppercase text-[10px] tracking-widest mb-2">{repairResult.message}</p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {Object.entries(repairResult.details || {}).map(([key, val]) => (
                          <div key={key} className="bg-brand-bgbase rounded p-2">
                            <p className="text-[8px] text-muted uppercase font-bold">{key.replace(/([A-Z])/g, ' $1')}</p>
                            <p className="text-sm font-black text-main">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-brand-bgbase p-3 rounded-lg border border-border/20 text-xs">
                        <span className="text-muted font-bold block uppercase tracking-wider text-[9px] mb-1">User Scope</span>
                        <p className="font-bold text-main">Role: {user?.role || "N/A"}</p>
                        <p className="text-[10px] text-muted">Branch Association: {user?.branch_name || "Global / All"}</p>
                      </div>
                      <div className="bg-brand-bgbase p-3 rounded-lg border border-border/20 text-xs">
                        <span className="text-muted font-bold block uppercase tracking-wider text-[9px] mb-1">Active Filters</span>
                        <p className="font-bold text-main">Branch Filter ID: {filterBranch || "All"}</p>
                        <p className="text-[10px] text-muted">Status Filter: {filterStatus}</p>
                      </div>
                      <div className="bg-brand-bgbase p-3 rounded-lg border border-border/20 text-xs">
                        <span className="text-muted font-bold block uppercase tracking-wider text-[9px] mb-1">Query Diagnostic</span>
                        <p className="font-bold text-main">Filtered Dataset Count: {filteredData.length}</p>
                        <p className="text-[10px] text-muted">Total Database Items: {totalItems}</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[400px] custom-scrollbar border border-border/25 rounded-lg">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-bgbase text-[9px] font-black uppercase tracking-wider text-muted border-b border-border/30 sticky top-0">
                            <th className="py-2.5 px-4">Product</th>
                            <th className="py-2.5 px-4">Branch</th>
                            <th className="py-2.5 px-4">Brand</th>
                            <th className="py-2.5 px-4 text-center">Enabled</th>
                            <th className="py-2.5 px-4 text-center">POS Visible</th>
                            <th className="py-2.5 px-4 text-right">Stock</th>
                            <th className="py-2.5 px-4">Reason Hidden</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventory.map((item, idx) => {
                            const isEnabled = item.enabled !== false;
                            const hasActiveStatus = item.Product?.status === 'active';
                            const hasBrand = !!item.Product?.brand_id;
                            const hasCategory = !!item.Product?.category_id;
                            const isVisible = isEnabled && hasActiveStatus;

                            const reasons = [];
                            if (!isEnabled) reasons.push("Disabled in branch");
                            if (!hasActiveStatus) reasons.push(`Status: ${item.Product?.status || 'null'}`);
                            if (!hasBrand) reasons.push("Missing brand");
                            if (!hasCategory) reasons.push("Missing category");

                            return (
                              <tr key={idx} className="border-b border-border/10 hover:bg-brand-bgbase/20 font-mono text-[11px]">
                                <td className="py-2 px-4">
                                  <span className="text-muted mr-1">#{item.product_id}</span>
                                  <span className="font-bold text-main">{item.Product?.name}</span>
                                </td>
                                <td className="py-2 px-4 text-muted">{item.Branch?.name || `#${item.branch_id}`}</td>
                                <td className="py-2 px-4">
                                  <span className={`text-[10px] font-bold ${item.Product?.Brand?.name ? 'text-main' : 'text-amber-500'}`}>
                                    {item.Product?.Brand?.name || "⚠ None"}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${
                                    isEnabled ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-brand-crimson"
                                  }`}>
                                    {isEnabled ? "✓" : "✕"}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${
                                    isVisible ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-brand-crimson"
                                  }`}>
                                    {isVisible ? "✓" : "✕"}
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-right font-bold text-main">{item.stock ?? item.quantity ?? 0}</td>
                                <td className="py-2 px-4">
                                  {reasons.length > 0 ? (
                                    <span className="text-[9px] text-brand-crimson font-bold">{reasons.join(", ")}</span>
                                  ) : (
                                    <span className="text-[9px] text-green-500 font-bold">OK</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* Modals */}
        {activeEdit && <EditProductModal product={activeEdit} isOpen={!!activeEdit} onClose={() => { setActiveEdit(null); handleRefresh(); }} onUpdate={() => { handleRefresh(); }} branches={branches} />}
        {activeHistory && <HistoryModal isOpen={!!activeHistory} onClose={() => setActiveHistory(null)} product={activeHistory} />}
        {activeDelete && <DeleteActionModal product={activeDelete} onClose={() => setActiveDelete(null)} onSuccess={() => { setPage(1); setActiveDelete(null); }} user={user} />}
        {activeRestock && <RestockRequestModal isOpen={!!activeRestock} onClose={() => setActiveRestock(null)} product={activeRestock} onSuccess={handleRefresh} />}
      </main>
    </div>
  );
}
