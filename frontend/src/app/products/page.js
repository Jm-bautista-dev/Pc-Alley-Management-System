"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search,
  Package,
  Layers,
  Tag,
  Filter,
  ArrowUpRight,
  Cpu,
  Monitor,
  HardDrive,
  Database,
  Hash,
  ChevronRight,
  Zap,
  Trash2
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [user, setUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [inventoryRows, setInventoryRows] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 50;

  // Advanced Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  // Debounce search to avoid firing on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Init user and branches on mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      if (parsedUser?.role !== "super_admin" && parsedUser?.branch_id) {
        setSelectedBranch(String(parsedUser.branch_id));
      }
    }
    fetchBranches();
  }, []);

  // Fetch products when filters / page change (this was the missing trigger!)
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedBranch, debouncedSearch, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedBranch, debouncedSearch, sortBy]);

  async function fetchBranches() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) setBranches(data);
      }
    } catch (err) {
      console.error("Branch directory connection failure:", err);
    }
  }

  const fetchProducts = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Build product query params
      const productParams = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        sort: sortBy,
      });
      if (debouncedSearch) productParams.set("search", debouncedSearch);

      // Build inventory query params (only current page of products)
      const inventoryParams = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (selectedBranch) inventoryParams.set("branch_id", selectedBranch);

      // Fetch both in parallel
      const [productRes, inventoryRes] = await Promise.all([
        fetch(apiUrl(`/api/products?${productParams.toString()}`), { headers }),
        fetch(apiUrl(`/api/inventory?${inventoryParams.toString()}`), { headers })
      ]);

      if (productRes.ok) {
        const productData = await productRes.json().catch(() => null);
        if (productData) {
          const rows = Array.isArray(productData?.data) ? productData.data : (Array.isArray(productData) ? productData : []);
          setProducts(rows);
          if (productData?.pagination) {
            setTotalPages(productData.pagination.totalPages || 1);
            setTotalItems(productData.pagination.total || rows.length);
          }
        }
      } else {
        console.warn("Failed to fetch products:", productRes.status);
        if (productRes.status === 403) {
          showError("Session Expired", "Token invalid or expired. Please try logging out and logging back in.");
        } else {
          const errData = await productRes.json().catch(() => ({}));
          showError("Fetch Error", errData.message || `Failed to fetch products: ${productRes.status}`);
        }
      }

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json().catch(() => null);
        if (inventoryData) {
          setInventoryRows(inventoryData.data ?? []);
        }
      } else {
        console.warn("Failed to fetch inventory:", inventoryRes.status);
        if (inventoryRes.status !== 403) { // Avoid duplicate 403 dialog
          const errData = await inventoryRes.json().catch(() => ({}));
          showError("Fetch Error", errData.message || `Failed to fetch inventory: ${inventoryRes.status}`);
        }
      }
    } catch (err) {
      console.error("Catalog connection failure:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = await showConfirm(
      "Confirm Deletion",
      `Are you sure you want to delete "${product.name}"? This action will archive or remove associated inventory assets.`
    );
    if (!confirmed) return;
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/products/${product.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        showSuccess("Success", data.message || "Product successfully processed.");
        fetchProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        showError("Failed to delete", data.error || data.message || "Failed to delete product.");
      }
    } catch (e) {
      showError("Telemetry Error", "Deletion sequence failed.");
    }
  };

  const stockByProductId = inventoryRows.reduce((acc, item) => {
    const productId = item.Product?.id || item.product_id;
    if (!productId) return acc;

    if (!acc[productId]) {
      acc[productId] = {
        totalStock: 0,
        branchStocks: {},
        lowStockThreshold: item.low_stock_threshold || 5,
        hasInventoryRecord: true
      };
    }

    acc[productId].totalStock += Number(item.quantity || 0);
    acc[productId].branchStocks[item.branch_id] = Number(item.quantity || 0);
    acc[productId].lowStockThreshold = item.low_stock_threshold || acc[productId].lowStockThreshold;
    return acc;
  }, {});

  const scopedProducts = products
    .map(product => ({
      ...product,
      stockSummary: stockByProductId[product.id] || {
        totalStock: 0,
        branchStocks: {},
        lowStockThreshold: 5,
        hasInventoryRecord: false
      }
    }));

  const selectedBranchName = selectedBranch
    ? branches.find(branch => String(branch.id) === String(selectedBranch))?.name || user?.branch_name || `Branch #${selectedBranch}`
    : "All Branches";

  const categories = ["All", ...new Set(scopedProducts.map(p => p.Category?.name).filter(Boolean))];

  // Client-side category + price filter (search/sort/branch are server-side)
  let filteredProducts = scopedProducts.filter(p => {
    const matchesCategory = activeCategory === "All" || p.Category?.name === activeCategory;
    const price = Number(p.price);
    const matchesMinPrice = minPrice === "" || price >= Number(minPrice);
    const matchesMaxPrice = maxPrice === "" || price <= Number(maxPrice);
    return matchesCategory && matchesMinPrice && matchesMaxPrice;
  });

  // Group products by category
  const grouped = filteredProducts.reduce((acc, product) => {
    const cat = product.Category?.name || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  const getCategoryIcon = (catName) => {
    switch(catName?.toUpperCase()) {
      case 'CPU': return <Cpu size={14} />;
      case 'GPU': return <Layers size={14} />;
      case 'MOTHERBOARD': return <Database size={14} />;
      case 'RAM': return <Hash size={14} />;
      case 'STORAGE': return <HardDrive size={14} />;
      case 'PERIPHERALS': return <Monitor size={14} />;
      case 'POWER SUPPLY': return <Zap size={14} />;
      default: return <Tag size={14} />;
    }
  };

  const getCategoryColor = (catName) => {
    switch(catName?.toUpperCase()) {
      case 'GPU': return 'text-brand-crimson border-brand-crimson/20 bg-brand-crimson/10';
      case 'CPU': return 'text-brand-neonblue border-brand-neonblue/20 bg-brand-neonblue/10';
      case 'MOTHERBOARD': return 'text-purple-400 border-purple-400/20 bg-purple-400/10';
      case 'RAM': return 'text-green-400 border-green-400/20 bg-green-400/10';
      case 'STORAGE': return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10';
      case 'PERIPHERALS': return 'text-pink-400 border-pink-400/20 bg-pink-400/10';
      case 'POWER SUPPLY': return 'text-orange-400 border-orange-400/20 bg-orange-400/10';
      default: return 'text-muted border-border bg-brand-surface';
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="PRODUCT LIST" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container">
            
            <div className="mb-6">
                <h1 className="text-2xl font-rajdhani font-black uppercase">
                  PRODUCT <span className="text-brand-neonblue">CATALOG</span>
                </h1>
                <p className="text-[10px] text-main/40 font-black uppercase tracking-widest mt-1">
                  Branch scope: {selectedBranchName}
                </p>
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div className="relative group w-full md:w-96">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-main/30 group-focus-within:text-brand-neonblue transition-colors">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or SKU code..."
                  className="w-full bg-brand-surface border border-border rounded-xl py-4 pl-12 pr-4 text-xs text-main focus:outline-none focus:border-brand-neonblue/20 transition-all font-bold tracking-tight shadow-sm"
                />
              </div>
              <div className="flex gap-4">
                {user?.role === 'super_admin' && (
                  <Link href="/products/add">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn-premium h-12"
                    >
                      <Package size={16} /> Add Product
                    </motion.button>
                  </Link>
                )}
                
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)} 
                  className={`btn-ghost h-12 ${showFilters ? 'border-brand-neonblue/50 text-brand-neonblue' : ''}`}
                >
                  <Filter size={16} /> Advanced Filter
                </motion.button>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-8"
                >
                  <div className="bg-brand-surface border border-border rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Branch Scope */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[2px] text-main/40 mb-2">Branch Scope</label>
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        disabled={user?.role !== "super_admin"}
                        className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {user?.role === "super_admin" && <option value="">All Branches</option>}
                        {branches.map(branch => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sort */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[2px] text-main/40 mb-2">Sort By</label>
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue/30 transition-colors"
                      >
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="price-asc">Price (Low to High)</option>
                        <option value="price-desc">Price (High to Low)</option>
                      </select>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[2px] text-main/40 mb-2">Price Range (₱)</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          placeholder="Min" 
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue/30 transition-colors"
                        />
                        <span className="text-muted font-bold">-</span>
                        <input 
                          type="number" 
                          placeholder="Max" 
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue/30 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Reset Filters */}
                    <div className="flex items-end">
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setMinPrice("");
                          setMaxPrice("");
                          setSortBy("name-asc");
                          if (user?.role === "super_admin") setSelectedBranch("");
                        }}
                        className="btn-ghost h-11"
                      >
                        Clear Filters
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category Tabs */}
            <div className="flex gap-3 mb-10 overflow-x-auto no-scrollbar pb-2">
              {categories.map((cat) => (
                <motion.button
                  key={cat}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCategory(cat)}
                  className={`h-10 px-6 rounded-full text-[10px] font-black uppercase tracking-[2px] transition-all flex items-center gap-2 border flex-shrink-0 ${
                    activeCategory === cat 
                    ? "bg-brand-neonblue/10 border-brand-neonblue/40 text-brand-neonblue" 
                    : "bg-brand-surface border-border text-main/40 hover:text-main"
                  }`}
                >
                  {cat !== "All" && getCategoryIcon(cat)}
                  {cat}
                </motion.button>
              ))}
            </div>

            {/* Skeleton Loading */}
            {loading && (
              <div className="space-y-6">
                {[1, 2, 3].map(g => (
                  <div key={g} className="mb-8">
                    <div className="flex items-center gap-3 mb-3 px-1">
                      <div className="h-7 w-24 rounded-xl bg-brand-surface border border-border animate-pulse" />
                      <div className="flex-1 h-px bg-border/40" />
                    </div>
                    <div className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                      {[1, 2, 3, 4, 5].map(r => (
                        <div key={r} className={`flex items-center gap-4 px-6 py-4 ${r !== 5 ? 'border-b border-border' : ''}`}>
                          <div className="w-10 h-10 rounded-xl bg-brand-bgbase animate-pulse flex-shrink-0" />
                          <div className="w-28 h-3 rounded bg-brand-bgbase animate-pulse hidden md:block" />
                          <div className="flex-1 h-4 rounded bg-brand-bgbase animate-pulse" />
                          <div className="w-16 h-4 rounded bg-brand-bgbase animate-pulse" />
                          <div className="w-16 h-4 rounded bg-brand-bgbase animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 glass-card border-dashed">
                <Package size={48} className="text-main/10 mb-6" />
                <h3 className="text-sm font-black uppercase tracking-[4px] text-main">No Products Found</h3>
                <p className="text-[10px] text-main/30 font-black uppercase tracking-widest mt-2">Adjust branch scope, filters, or search query</p>
              </div>
            )}

            {/* Categorized List */}
            {!loading && Object.entries(grouped).map(([catName, items]) => (
              <motion.div
                key={catName}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mb-8"
              >
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-3 px-1">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${getCategoryColor(catName)}`}>
                    {getCategoryIcon(catName)}
                    {catName}
                  </div>
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] font-black text-main/30 uppercase tracking-widest">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Product Rows */}
                <div className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  {items.map((product, idx) => (
                    <div
                      key={product.id}
                      className={`grid grid-cols-[auto,1fr,auto] md:flex items-center gap-4 px-4 md:px-6 py-4 hover:bg-brand-muted/5 transition-colors group cursor-pointer ${
                        idx !== items.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      {/* Icon or Image Preview */}
                      <div className="w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden border border-border/50 flex items-center justify-center bg-brand-bgbase relative">
                        <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${getCategoryColor(catName)}`}>
                          {getCategoryIcon(catName)}
                        </div>
                        {(product.product_image || product.image_url) && (
                          <img 
                            src={apiUrl(product.product_image || product.image_url).replace('.webp', '_thumbnail.webp')} 
                            alt={product.name} 
                            className="absolute inset-0 w-full h-full object-cover z-10" 
                            loading="lazy"
                            onError={(e) => {
                              if (e.target.src.includes('_thumbnail.webp')) {
                                e.target.src = e.target.src.replace('_thumbnail.webp', '_medium.webp');
                              } else {
                                e.target.style.display = 'none';
                              }
                            }}
                          />
                        )}
                      </div>

                      {/* SKU */}
                      <span className="font-mono text-[10px] text-muted/40 uppercase tracking-widest w-32 flex-shrink-0 hidden md:block">
                        {product.sku}
                      </span>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-rajdhani font-bold text-main group-hover:text-brand-neonblue transition-colors truncate capitalize">
                          {product.name}
                        </h4>
                        <p className="text-[10px] text-muted/40 uppercase tracking-widest font-mono md:hidden">{product.sku}</p>
                      </div>

                      {/* Stock + Price */}
                      <div className="text-right flex-shrink-0 flex items-center gap-6">
                        <div>
                          <p className="text-[9px] text-main/30 font-black uppercase tracking-[2px] mb-0.5">
                            {selectedBranch ? "Branch Stock" : "Total Stock"}
                          </p>
                          <p className={`text-sm font-rajdhani font-black ${
                            product.stockSummary.totalStock <= product.stockSummary.lowStockThreshold ? "text-brand-crimson" : "text-main"
                          }`}>
                            {product.stockSummary.totalStock.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-main/30 font-black uppercase tracking-[2px] mb-0.5">Price</p>
                          <p className="text-sm font-rajdhani font-black text-brand-crimson">₱{Number(product.price).toLocaleString()}</p>
                        </div>
                        {user?.role === 'super_admin' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product); }}
                            className="w-8 h-8 rounded-lg border border-brand-crimson/10 flex items-center justify-center text-brand-crimson/30 hover:text-brand-crimson hover:bg-brand-crimson/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pb-8">
                <p className="text-[10px] text-main/40 font-black uppercase tracking-widest">
                  Page {page} of {totalPages} &bull; {totalItems} total items
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-9 px-4 rounded-lg border border-border text-[11px] font-black uppercase tracking-widest text-main/60 hover:text-main hover:border-brand-neonblue/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, page - 2);
                    const p = start + i;
                    if (p > totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`h-9 w-9 rounded-lg border text-[11px] font-black transition-all ${p === page ? 'border-brand-neonblue/50 text-brand-neonblue bg-brand-neonblue/10' : 'border-border text-main/40 hover:text-main hover:border-brand-neonblue/30'}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="h-9 px-4 rounded-lg border border-border text-[11px] font-black uppercase tracking-widest text-main/60 hover:text-main hover:border-brand-neonblue/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
