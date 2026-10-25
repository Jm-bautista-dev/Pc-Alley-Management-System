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
import Pagination from "@/components/Pagination";
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
  const [exporting, setExporting] = useState(false);

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
    const prodSalesByName = {};
    salesData.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= thirtyDaysAgo) {
        const items = order.SaleItems || order.OrderItems || order.items || [];
        items.forEach(item => {
          const qty = Number(item.quantity) || 0;
          const pId = item.productId ?? item.product_id;
          if (pId) {
            prodSales[pId] = (prodSales[pId] || 0) + qty;
          }
          const rawName = item.productName || item.Product?.name || item.name || '';
          const cleanName = rawName.split(/,\s*/)[0].replace(/\s+\d{4}\s*$/, '').trim().toLowerCase();
          if (cleanName) {
            prodSalesByName[cleanName] = (prodSalesByName[cleanName] || 0) + qty;
          }
        });
      }
    });
    return inventory.map(item => {
      const pId = item.product_id || item.Product?.id || item.id;
      const stock = item.stock !== undefined && item.stock !== null ? Number(item.stock) : Number(item.quantity || 0);
      const prodName = (item.Product?.name || item.name || '').toLowerCase();
      const cleanProdName = prodName.split(/,\s*/)[0].replace(/\s+\d{4}\s*$/, '').trim();
      let sold = prodSales[pId] || prodSalesByName[cleanProdName] || 0;
      if (!sold && cleanProdName) {
        for (const [vName, vQty] of Object.entries(prodSalesByName)) {
          if (cleanProdName.includes(vName) || vName.includes(cleanProdName)) {
            sold = vQty;
            break;
          }
        }
      }
      const daily = sold / 30;
      const daysRem = daily > 0 ? Math.floor(stock / daily) : (stock === 0 ? 0 : 999);

      // ── Percentage & Category-based Minimum Stock Baseline ──
      // Default baseline: GPUs (and high-value components) = 10 pcs minimum
      // Fast-moving peripherals (monitors, keyboards, mice, headsets, cables) = 50 pcs minimum
      const catName = (item.Product?.Category?.name || item.category || '').toLowerCase();

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
      }
      return {
        id: pId,
        branch_id: item.branch_id,
        name: item.Product?.name || item.name || 'Unknown',
        category: item.Product?.Category?.name || 'Uncategorized',
        category_id: item.Product?.category_id || '',
        brand_id: item.Product?.brand_id || '',
        sku: item.Product?.sku || item.sku || '',
        description: item.Product?.description || '',
        specifications: item.Product?.specifications || '',
        last_purchase_price: (item.last_purchase_price !== undefined && item.last_purchase_price !== null) 
          ? item.last_purchase_price 
          : (item.Product?.last_purchase_price !== undefined && item.Product?.last_purchase_price !== null ? item.Product.last_purchase_price : 0),
        unit_price: (item.last_purchase_price !== undefined && item.last_purchase_price !== null) 
          ? item.last_purchase_price 
          : (item.Product?.last_purchase_price !== undefined && item.Product?.last_purchase_price !== null ? item.Product.last_purchase_price : 0),
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
        badge,
        branchStocks: item.branchStocks || [],
        isConsolidated: item.isConsolidated || false,
        branchName: item.Branch?.name || ''
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
      } else if (filterStatus === "In Stock") {
        matchesFilter = i.statusGroup === "In Stock";
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
    inStock: processedData.filter(i => i.statusGroup === 'In Stock').length,
    critical: processedData.filter(i => i.statusGroup === 'Critical Stock').length,
    low: processedData.filter(i => i.statusGroup === 'Low Stock' || i.statusGroup === 'Critical Stock').length,
    outOfStock: processedData.filter(i => i.statusGroup === 'Out of Stock').length,
    incoming: 0
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("token");

      // 1. Fetch Transfer History for Super Admin & Branch Admin
      let transfers = [];
      try {
        const tRes = await fetch(apiUrl("/api/stock-transfers"), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (tRes.ok) {
          const tData = await tRes.json();
          transfers = Array.isArray(tData) ? tData : [];
        }
      } catch (err) {
        console.warn("Could not fetch transfers for export:", err);
      }

      // 2. Authoritative KPI Metrics
      const totalStock = filteredData.reduce((sum, i) => sum + (Number(i.stock) || 0), 0);
      const totalInventoryVal = filteredData.reduce((sum, i) => sum + ((Number(i.stock) || 0) * (Number(i.price) || 0)), 0);
      const totalSalesVal = filteredData.reduce((sum, i) => sum + ((Number(i.sold30) || 0) * (Number(i.price) || 0)), 0);

      // Branch Label
      let branchLabel = "All Branches";
      if (filterBranch && branches.length > 0) {
        const foundB = branches.find(b => String(b.id) === String(filterBranch));
        if (foundB) branchLabel = foundB.name;
      } else if (user?.role === "branch_admin" && user?.branch_id && branches.length > 0) {
        const foundB = branches.find(b => String(b.id) === String(user.branch_id));
        if (foundB) branchLabel = foundB.name;
      }

      const exportOptions = {
        isStockReport: true,
        branchName: branchLabel,
        filterCategory: filterCategory || "All",
        filterStatus: filterStatus || "All",
        kpis: {
          totalSkus: kpis.total,
          inStock: kpis.inStock,
          outOfStock: kpis.outOfStock,
          totalStock: totalStock,
          totalSales: totalSalesVal,
          totalInventoryValue: totalInventoryVal
        },
        transfers: transfers
      };

      await exportToExcel(filteredData, 'PCA_Inventory_Intelligence_Report', 'Inventory', exportOptions);
      showSuccess("Excel Intelligence Report with Transfer History Generated");
    } catch (error) {
      console.error("Export Protocol Failed:", error);
      showError("Export Protocol Failed");
    } finally {
      setExporting(false);
    }
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
            {/* Header & Status Filter */}
            <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-rajdhani font-black uppercase tracking-wider mb-0">
                    MANAGE <span className="text-brand-neonblue">STOCK</span>
                  </h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-neonblue/10 border border-brand-neonblue/20 text-brand-neonblue font-bold uppercase tracking-widest">
                    Inventory
                  </span>
                </div>
                <p className="text-[11px] text-muted font-bold mt-0.5">Real-time multi-branch stock levels, thresholds & pricing</p>
              </div>
              <div className="flex flex-wrap gap-1 bg-brand-surface border border-border/50 p-1 rounded-xl">
                {['All', 'In Stock', 'Low Stock', 'Critical Stock', 'Out of Stock'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      filterStatus === status 
                        ? status === 'Critical Stock'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm'
                          : status === 'In Stock'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                          : status === 'Low Stock'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-sm'
                          : 'bg-brand-neonblue text-white shadow-sm' 
                        : 'text-muted hover:text-main hover:bg-brand-bgbase/50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              <div className="bg-brand-surface border border-border/50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-muted mb-0.5">Total SKUs</p>
                  <h3 className="text-lg font-rajdhani font-black text-main leading-tight">{kpis.total}</h3>
                </div>
                <div className="w-8 h-8 rounded-lg bg-brand-neonblue/10 flex items-center justify-center text-brand-neonblue shrink-0">
                  <PackageCheck size={16} />
                </div>
              </div>
              <div className="bg-brand-surface border border-border/50 border-l-2 border-l-emerald-500 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-muted mb-0.5">In Stock</p>
                  <h3 className="text-lg font-rajdhani font-black text-emerald-400 leading-tight">{kpis.inStock}</h3>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="bg-brand-surface border border-border/50 border-l-2 border-l-orange-500 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-muted mb-0.5">Low Stock</p>
                  <h3 className="text-lg font-rajdhani font-black text-orange-400 leading-tight">{kpis.low}</h3>
                </div>
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="bg-brand-surface border border-border/50 border-l-2 border-l-red-500 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-muted mb-0.5">Critical (≤15%)</p>
                  <h3 className="text-lg font-rajdhani font-black text-red-400 leading-tight">{kpis.critical}</h3>
                </div>
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                  <AlertCircle size={16} />
                </div>
              </div>
              <div className="bg-brand-surface border border-border/50 border-l-2 border-l-brand-crimson rounded-xl p-3 flex items-center justify-between col-span-2 sm:col-span-1">
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-muted mb-0.5">Out of Stock</p>
                  <h3 className="text-lg font-rajdhani font-black text-brand-crimson leading-tight">{kpis.outOfStock}</h3>
                </div>
                <div className="w-8 h-8 rounded-lg bg-brand-crimson/10 flex items-center justify-center text-brand-crimson shrink-0">
                  <AlertCircle size={16} />
                </div>
              </div>
            </div>

            {/* Consolidated Filter & Toolbar */}
            <div className="bg-brand-surface border border-border/50 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search products or SKU..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    className="w-full bg-brand-bgbase border border-border/50 text-main text-xs font-bold rounded-lg pl-8 pr-3 py-2 outline-none focus:border-brand-neonblue transition-colors h-9" 
                  />
                </div>

                {user?.role === 'super_admin' && (
                  <div className="w-48">
                    <select
                      value={filterBranch}
                      onChange={e => setFilterBranch(e.target.value)}
                      className="w-full bg-brand-bgbase border border-border/50 text-main text-xs font-bold rounded-lg px-2.5 py-2 outline-none focus:border-brand-neonblue cursor-pointer transition-colors h-9"
                    >
                      <option value="">All Branches</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="w-44">
                  <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border/50 text-main text-xs font-bold rounded-lg px-2.5 py-2 outline-none focus:border-brand-neonblue cursor-pointer transition-colors h-9"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-brand-bgbase border border-border/50 rounded-lg px-2.5 h-9 text-xs font-bold text-muted">
                  <span>Show</span>
                  <select
                    value={limit}
                    onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                    className="bg-transparent text-main font-bold outline-none cursor-pointer"
                  >
                    <option value={10} className="bg-brand-surface text-main">10</option>
                    <option value={25} className="bg-brand-surface text-main">25</option>
                    <option value={50} className="bg-brand-surface text-main">50</option>
                    <option value={100} className="bg-brand-surface text-main">100</option>
                  </select>
                </div>

                {user?.role === 'super_admin' && (
                  <button 
                    onClick={handleResync} 
                    className="bg-brand-neonblue/10 border border-brand-neonblue/25 text-brand-neonblue hover:bg-brand-neonblue/20 h-9 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    title="Resync product catalog to all branches"
                  >
                    <RefreshCw size={13} />
                    <span className="hidden sm:inline">Resync</span>
                  </button>
                )}

                <button 
                  onClick={handleExport} 
                  disabled={exporting}
                  className="bg-brand-bgbase border border-border text-muted hover:text-main h-9 px-3.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all hover:bg-brand-surface disabled:opacity-50"
                  title="Export executive inventory report with transfer ledger"
                >
                  <FileDown size={14} className={exporting ? "animate-bounce text-brand-neonblue" : "text-brand-neonblue"} /> 
                  <span>{exporting ? "Generating..." : "Export"}</span>
                </button>
              </div>
            </div>

            {/* Main Table */}
            <div className="bg-brand-surface border border-border/50 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
                  <thead>
                    <tr className="bg-brand-bgbase/60 text-[9px] uppercase font-black tracking-widest text-muted border-b border-border/50">
                      <th className="py-2.5 px-3.5 cursor-pointer w-[30%]" onClick={() => setSort('name')}>Product</th>
                      <th className="py-2.5 px-3.5 cursor-pointer w-[12%]" onClick={() => setSort('category')}>Category</th>
                      <th className="py-2.5 px-3.5 text-right cursor-pointer w-[20%]" onClick={() => setSort('quantity')}>Current Stock</th>
                      <th className="py-2.5 px-3.5 text-right w-[11%]">Unit Price</th>
                      <th className="py-2.5 px-3.5 text-right cursor-pointer w-[12%]" onClick={() => setSort('price')}>Selling Price</th>
                      <th className="py-2.5 px-3.5 text-center w-[9%]">Status</th>
                      <th className="py-2.5 px-3.5 text-right w-[6%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {loading ? (
                      <tr><td colSpan={7} className="py-12 text-center text-muted font-semibold text-xs">Loading inventory data...</td></tr>
                    ) : filteredData.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-muted font-bold text-xs">No products found matching the selected filters.</td></tr>
                    ) : (
                      filteredData.map((item, idx) => (
                        <motion.tr 
                          initial={{ opacity: 0, y: 3 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ delay: Math.min(idx * 0.02, 0.3) }} 
                          key={item.id || idx} 
                          className="hover:bg-brand-bgbase/40 transition-colors group"
                        >
                          {/* Product */}
                          <td className="py-2.5 px-3.5 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-brand-bgbase border border-border/40 flex items-center justify-center shrink-0 overflow-hidden text-muted">
                                {item.image_url || item.product_image ? (
                                  <img src={item.image_url || item.product_image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <PackageCheck size={14} className="text-brand-neonblue/70" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 max-w-xs sm:max-w-sm">
                                <span className="font-bold text-main text-xs truncate leading-tight" title={item.name}>{item.name}</span>
                                {item.sku && (
                                  <span className="text-[10px] font-mono text-muted/60 tracking-wider">SKU: {item.sku}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3.5 align-middle">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-bgbase border border-border/40 text-muted/90 inline-block">
                              {item.category}
                            </span>
                          </td>

                          {/* Current Stock */}
                          <td className="py-2.5 px-3.5 align-middle text-right">
                            <div className="flex items-baseline justify-end gap-1.5">
                              <span className={`text-sm font-black font-rajdhani ${item.stock === 0 ? 'text-brand-crimson' : item.stockPercent <= 15 ? 'text-red-400' : item.stockPercent <= 30 ? 'text-orange-400' : 'text-main'}`}>
                                {item.stock}
                              </span>
                              <span className="text-[10px] font-bold text-muted/70">
                                ({item.stockPercent}% of {item.minTarget} min)
                              </span>
                            </div>
                            {item.branchStocks && item.branchStocks.length > 0 && (
                              <div className="flex items-center justify-end gap-1 mt-0.5 flex-wrap">
                                {item.branchStocks.map(bs => (
                                  <span 
                                    key={bs.branch_id} 
                                    className="text-[9px] px-1.5 py-0.2 rounded bg-brand-bgbase border border-border/30 text-muted font-medium whitespace-nowrap"
                                    title={`${bs.branch_name}: ${bs.stock} in stock`}
                                  >
                                    <span className="text-muted/60 font-bold">{bs.branch_name?.replace(/Sector\s*\d+\s*-?\s*/i, '').replace(/Branch/i, '').trim().slice(0, 8)}:</span>{' '}
                                    <b className="text-main">{bs.stock}</b>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Unit Price (Cost) */}
                          <td className="py-2.5 px-3.5 align-middle text-right font-medium">
                            {Number(item.last_purchase_price) > 0 ? (
                              <span className="text-muted/90 text-xs font-bold">₱{Number(item.last_purchase_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-muted/40 text-xs">₱0.00</span>
                            )}
                          </td>

                          {/* Selling Price */}
                          <td className="py-2.5 px-3.5 align-middle text-right font-bold">
                            {Number(item.price) > 0 ? (
                              <span className="text-emerald-400 text-xs font-bold">₱{Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-xs font-bold text-brand-crimson/80">₱0.00</span>
                                {user?.role === 'super_admin' && (
                                  <button
                                    onClick={() => setActiveEdit(item)}
                                    className="text-[9px] font-black text-brand-neonblue hover:underline uppercase"
                                    title="Set price"
                                  >
                                    + Set
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3.5 align-middle text-center">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border rounded-md inline-block ${item.badge} ${item.statusColor}`}>
                              {item.statusGroup}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3.5 align-middle text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(user?.role === 'employee' || user?.role === 'branch_admin') && (
                                <button
                                  onClick={() => setActiveRestock(item)}
                                  className="px-2.5 py-1 bg-brand-neonblue/10 border border-brand-neonblue/20 rounded-md text-[9px] font-black uppercase tracking-wider text-brand-neonblue hover:bg-brand-neonblue/20 transition-all"
                                >
                                  Restock
                                </button>
                              )}
                              {(user?.role !== 'employee' && user?.role !== 'staff') && (
                                <button onClick={() => setActiveEdit(item)} className="w-7 h-7 rounded-md border border-border/50 flex items-center justify-center text-muted hover:text-main hover:bg-border/20 transition-all" title="Edit Product"><Edit size={13} /></button>
                              )}
                              <button onClick={() => setActiveHistory(item)} className="w-7 h-7 rounded-md border border-border/50 flex items-center justify-center text-muted hover:text-main hover:bg-border/20 transition-all" title="Stock History"><Clock size={13} /></button>
                              {user?.role === 'super_admin' && (
                                <button onClick={() => handleDeleteProduct(item)} className="w-7 h-7 rounded-md border border-border/50 flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete Product"><Trash2 size={13} /></button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Pagination Controls */}
            {totalPages > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={limit}
                onItemsPerPageChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
                itemsPerPageOptions={[10, 25, 50, 100]}
                itemLabel="records"
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="mt-8"
              />
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
