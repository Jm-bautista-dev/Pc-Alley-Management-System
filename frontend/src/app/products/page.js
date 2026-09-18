"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  ChevronLeft,
  ChevronRight,
  Zap,
  Trash2,
  UploadCloud,
  QrCode,
  Barcode,
  Sliders,
  Download
} from "lucide-react";
import { apiUrl, handleSessionExpired } from "@/lib/api";
import { resolveProductImageUrl, handleProductImageError } from "@/lib/imageHelper";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import ProductDetailsModal from "@/components/ProductDetailsModal";
import { formatSpecsSummary, formatSpecsForExport } from "@/lib/hardwareSpecs";
import { exportToExcel } from "@/lib/excelExport";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [user, setUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [inventoryRows, setInventoryRows] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  // Details Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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

  // Category Bar Horizontal Scroll & Drag Support
  const categoryScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

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
    fetchBrands();
  }, []);

  // Fetch products when filters / page change (this was the missing trigger!)
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedBranch, selectedBrand, debouncedSearch, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedBranch, selectedBrand, debouncedSearch, sortBy]);

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

  async function fetchBrands() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/brands/active"), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) setBrands(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Brand directory connection failure:", err);
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
      if (selectedBrand && selectedBrand !== "All") productParams.set("brand_id", selectedBrand);

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
        if (productRes.status === 401 || productRes.status === 403) {
          handleSessionExpired();
          return;
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
        if (inventoryRes.status === 401 || inventoryRes.status === 403) {
          handleSessionExpired();
          return;
        }
        const errData = await inventoryRes.json().catch(() => ({}));
        showError("Fetch Error", errData.message || `Failed to fetch inventory: ${inventoryRes.status}`);
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

  // Client-side category + brand + price filter (search/sort/branch are server-side)
  let filteredProducts = scopedProducts.filter(p => {
    const matchesCategory = activeCategory === "All" || p.Category?.name === activeCategory;
    const matchesBrand = selectedBrand === "All" || String(p.brand_id) === String(selectedBrand) || p.Brand?.name === selectedBrand;
    const price = Number(p.price);
    const matchesMinPrice = minPrice === "" || price >= Number(minPrice);
    const matchesMaxPrice = maxPrice === "" || price <= Number(maxPrice);
    return matchesCategory && matchesBrand && matchesMinPrice && matchesMaxPrice;
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

  // Check category scroll capability
  const checkCategoryScroll = useCallback(() => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  }, []);

  useEffect(() => {
    checkCategoryScroll();
    window.addEventListener("resize", checkCategoryScroll);
    return () => window.removeEventListener("resize", checkCategoryScroll);
  }, [categories, checkCategoryScroll]);

  // Native wheel event with passive: false for smooth horizontal scrolling via mouse wheel
  useEffect(() => {
    const el = categoryScrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        checkCategoryScroll();
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [checkCategoryScroll]);

  const scrollCategory = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = Math.min(categoryScrollRef.current.clientWidth * 0.7, 360);
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkCategoryScroll, 350);
    }
  };

  const handleCategoryMouseDown = (e) => {
    if (!categoryScrollRef.current) return;
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - categoryScrollRef.current.offsetLeft);
    setScrollLeftState(categoryScrollRef.current.scrollLeft);
  };

  const handleCategoryMouseMove = (e) => {
    if (!isDragging || !categoryScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoryScrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      setHasDragged(true);
    }
    categoryScrollRef.current.scrollLeft = scrollLeftState - walk;
    checkCategoryScroll();
  };

  const handleCategoryMouseUpOrLeave = () => {
    setIsDragging(false);
    checkCategoryScroll();
  };

  const handleSelectCategory = (cat, e) => {
    if (hasDragged) return; // Ignore click if dragging
    setActiveCategory(cat);
    if (e?.currentTarget) {
      e.currentTarget.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
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
        <TopBar title="PRODUCT CATALOG" />
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div className="relative group w-full md:w-96">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-main/30 group-focus-within:text-brand-neonblue transition-colors">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, SKU, or barcode..."
                  className="w-full bg-brand-surface border border-border rounded-xl py-3.5 pl-12 pr-4 text-xs text-main focus:outline-none focus:border-brand-neonblue/40 transition-all font-bold tracking-tight shadow-sm"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {user?.role === 'super_admin' && (
                  <>
                    <Link href="/products/add">
                      <motion.button 
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="btn-premium h-11 px-5"
                      >
                        <Package size={15} /> Add Product
                      </motion.button>
                    </Link>
                    <Link href="/products/import">
                      <motion.button 
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="btn-ghost h-11 px-4 border border-border hover:border-brand-neonblue/40"
                      >
                        <UploadCloud size={15} /> Import Excel
                      </motion.button>
                    </Link>
                  </>
                )}

                {/* Export Catalog to Excel Button */}
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (filteredProducts.length === 0) {
                      showWarning("No products available to export.");
                      return;
                    }
                    const exportData = filteredProducts.map(p => ({
                      ID: p.id,
                      SKU: p.sku,
                      Barcode: p.barcode || "",
                      "Product Name": p.name,
                      Category: p.Category?.name || "Uncategorized",
                      Brand: p.Brand?.name || "Unassigned",
                      "Price (PHP)": Number(p.price || 0),
                      "Available Stock": p.stockSummary?.totalStock ?? 0,
                      Status: p.status || "active",
                      "Technical Specifications": formatSpecsForExport(p.specifications),
                      "Created Date": p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""
                    }));
                    exportToExcel(exportData, "PC_Alley_Hardware_Catalog", "Hardware Catalog", {
                      title: "PC ALLEY HARDWARE CATALOG & SPECIFICATIONS",
                      subtitle: `Exported ${exportData.length} products • Branch Scope: ${selectedBranchName}`
                    });
                    showSuccess(`Exported ${exportData.length} products to Excel with full technical specifications!`);
                  }}
                  className="btn-ghost h-11 px-4 border border-border hover:border-brand-neonblue/40 flex items-center gap-2"
                  title="Export Catalog to Excel (.xlsx) with Technical Specifications"
                >
                  <Download size={15} /> Export Catalog
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowFilters(!showFilters)} 
                  className={`btn-ghost h-11 px-4 ${showFilters ? 'border-brand-neonblue/50 text-brand-neonblue' : ''}`}
                >
                  <Filter size={15} /> Filters
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
                  <div className="bg-brand-surface border border-border rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
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

                    {/* Brand Filter */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[2px] text-main/40 mb-2">Brand</label>
                      <select
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue/30 transition-colors"
                      >
                        <option value="All">All Brands</option>
                        {brands.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
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
                          setSelectedBrand("All");
                          setSortBy("name-asc");
                          if (user?.role === "super_admin") setSelectedBranch("");
                        }}
                        className="btn-ghost h-11 w-full"
                      >
                        Clear Filters
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category Tabs with Left/Right Buttons, Wheel Scroll, and Drag Support */}
            <div className="relative mb-8 group/cats">
              {/* Left Scroll Button & Fade Overlay */}
              <AnimatePresence>
                {canScrollLeft && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="absolute left-0 top-0 bottom-2 z-20 flex items-center pr-6 bg-gradient-to-r from-brand-bgbase via-brand-bgbase/90 to-transparent pointer-events-none"
                  >
                    <button
                      type="button"
                      onClick={() => scrollCategory("left")}
                      className="w-8 h-8 rounded-full bg-brand-surface border border-border/80 shadow-md backdrop-blur-md flex items-center justify-center text-main hover:text-brand-neonblue hover:border-brand-neonblue/50 pointer-events-auto transition-all transform hover:scale-110 active:scale-95"
                      title="Scroll categories left"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Horizontally Scrollable Category Pills */}
              <div
                ref={categoryScrollRef}
                onScroll={checkCategoryScroll}
                onMouseDown={handleCategoryMouseDown}
                onMouseMove={handleCategoryMouseMove}
                onMouseUp={handleCategoryMouseUpOrLeave}
                onMouseLeave={handleCategoryMouseUpOrLeave}
                className="flex gap-2.5 overflow-x-auto custom-scrollbar pb-2 select-none cursor-grab active:cursor-grabbing scroll-smooth"
              >
                {categories.map((cat) => (
                  <motion.button
                    key={cat}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => handleSelectCategory(cat, e)}
                    className={`h-9 px-5 rounded-full text-[10px] font-black uppercase tracking-[1.5px] transition-all flex items-center gap-2 border flex-shrink-0 whitespace-nowrap ${
                      activeCategory === cat 
                      ? "bg-brand-neonblue/15 border-brand-neonblue/60 text-brand-neonblue shadow-sm shadow-brand-neonblue/20 font-black" 
                      : "bg-brand-surface border-border text-main/50 hover:text-main hover:border-border/80 hover:bg-brand-hover"
                    }`}
                  >
                    {cat !== "All" && getCategoryIcon(cat)}
                    <span>{cat}</span>
                  </motion.button>
                ))}
              </div>

              {/* Right Scroll Button & Fade Overlay */}
              <AnimatePresence>
                {canScrollRight && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="absolute right-0 top-0 bottom-2 z-20 flex items-center pl-6 bg-gradient-to-l from-brand-bgbase via-brand-bgbase/90 to-transparent pointer-events-none"
                  >
                    <button
                      type="button"
                      onClick={() => scrollCategory("right")}
                      className="w-8 h-8 rounded-full bg-brand-surface border border-border/80 shadow-md backdrop-blur-md flex items-center justify-center text-main hover:text-brand-neonblue hover:border-brand-neonblue/50 pointer-events-auto transition-all transform hover:scale-110 active:scale-95"
                      title="Scroll categories right"
                      aria-label="Scroll right"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsDetailsModalOpen(true);
                      }}
                      className={`grid grid-cols-[auto,1fr,auto] md:flex items-center gap-4 px-4 md:px-6 py-4 hover:bg-brand-muted/5 transition-colors group cursor-pointer ${
                        idx !== items.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      {/* Icon or Image Preview */}
                      <div className="w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden border border-border/50 flex items-center justify-center bg-brand-bgbase relative">
                        <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${getCategoryColor(catName)}`}>
                          {getCategoryIcon(catName)}
                        </div>
                        {resolveProductImageUrl(product, "thumbnail") && (
                          <img 
                            src={resolveProductImageUrl(product, "thumbnail")} 
                            alt={product.name} 
                            className="absolute inset-0 w-full h-full object-cover z-10" 
                            loading="lazy"
                            onError={handleProductImageError}
                          />
                        )}
                      </div>

                      {/* SKU & Barcode */}
                      <div className="w-36 flex-shrink-0 hidden md:flex flex-col gap-0.5">
                        <span className="font-mono text-[10px] text-muted/60 uppercase tracking-wider font-bold">
                          {product.sku}
                        </span>
                        {product.barcode && (
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] text-brand-neonblue/80 bg-brand-neonblue/10 px-1.5 py-0.5 rounded border border-brand-neonblue/20 w-fit">
                            <Barcode size={10} /> {product.barcode}
                          </span>
                        )}
                      </div>

                      {/* Name & Brand */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-rajdhani font-bold text-main group-hover:text-brand-neonblue transition-colors truncate capitalize">
                            {product.name}
                          </h4>
                          {product.Brand && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-brand-neonblue bg-brand-neonblue/10 px-2 py-0.5 rounded-full border border-brand-neonblue/20">
                              <Tag size={9} /> {product.Brand.name}
                            </span>
                          )}
                        </div>

                        {/* Specification Preview Pill */}
                        {formatSpecsSummary(product.specifications) && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted/70 bg-brand-bgbase px-2 py-0.5 rounded border border-border/40 truncate max-w-sm" title="Click product to view full technical specifications">
                              <Sliders size={10} className="text-brand-neonblue shrink-0" />
                              <span className="truncate">{formatSpecsSummary(product.specifications)}</span>
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-0.5 md:hidden">
                          <span className="text-[10px] text-muted/50 uppercase tracking-widest font-mono">{product.sku}</span>
                          {product.barcode && (
                            <span className="inline-flex items-center gap-1 font-mono text-[9px] text-brand-neonblue/80 bg-brand-neonblue/10 px-1.5 py-0.2 rounded border border-brand-neonblue/20">
                              <Barcode size={9} /> {product.barcode}
                            </span>
                          )}
                        </div>
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

        {/* Product Details & Technical Specifications Modal */}
        <ProductDetailsModal
          product={selectedProduct}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedProduct(null);
          }}
        />
      </main>
    </div>
  );
}
