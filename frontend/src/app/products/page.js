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
import toast, { Toaster } from "react-hot-toast";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));
  }, []);
  
  // Advanced Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/products"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setProducts(data);
    } catch (err) {
      console.error("Catalog connection failure:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${product.name}"? This will also remove all associated inventory assets.`)) return;
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/products/${product.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Product successfully purged from registry.");
        fetchProducts();
      } else {
        const err = await res.json();
        toast.error(err.error || err.message || "Failed to purge product.");
      }
    } catch (e) {
      toast.error("Telemetry Error: Deletion sequence failed.");
    }
  };

  const categories = ["All", ...new Set(products.map(p => p.Category?.name).filter(Boolean))];

  let filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || p.Category?.name === activeCategory;
    
    // Price Range Filter
    const price = Number(p.price);
    const matchesMinPrice = minPrice === "" || price >= Number(minPrice);
    const matchesMaxPrice = maxPrice === "" || price <= Number(maxPrice);
    
    return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice;
  });

  // Sorting
  filteredProducts.sort((a, b) => {
    if (sortBy === "price-asc") return Number(a.price) - Number(b.price);
    if (sortBy === "price-desc") return Number(b.price) - Number(a.price);
    return a.name.localeCompare(b.name);
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
              {(user?.role !== 'employee' && user?.role !== 'staff') && (
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
                <div className="bg-brand-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
                  {/* Sort */}
                  <div className="flex-1">
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
                  <div className="flex-1">
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
                      onClick={() => { setMinPrice(""); setMaxPrice(""); setSortBy("name-asc"); }}
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

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-border border-t-brand-neonblue rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[4px] text-muted">Loading products...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 glass-card border-dashed">
              <Package size={48} className="text-main/10 mb-6" />
              <h3 className="text-sm font-black uppercase tracking-[4px] text-main">No Products Found</h3>
              <p className="text-[10px] text-main/30 font-black uppercase tracking-widest mt-2">Adjust filters or refine search query</p>
            </div>
          )}

          {/* Categorized List */}
          {!loading && Object.entries(grouped).map(([catName, items], groupIdx) => (
            <motion.div
              key={catName}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.07 }}
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
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: groupIdx * 0.07 + idx * 0.04 }}
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

                    {/* Price */}
                    <div className="text-right flex-shrink-0 flex items-center gap-6">
                      <div>
                        <p className="text-[9px] text-main/30 font-black uppercase tracking-[2px] mb-0.5">Price</p>
                        <p className="text-sm font-rajdhani font-black text-brand-crimson">₱{Number(product.price).toLocaleString()}</p>
                      </div>
                      {(user?.role !== 'employee' && user?.role !== 'staff') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product); }}
                          className="w-8 h-8 rounded-lg border border-brand-crimson/10 flex items-center justify-center text-brand-crimson/30 hover:text-brand-crimson hover:bg-brand-crimson/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete Product"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}

          </div>
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
