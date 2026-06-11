"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  Search, 
  AlertTriangle,
  ArrowRight,
  Download,
  Building,
  CheckCircle2,
  X
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import RestockRequestModal from "@/components/restock/RestockRequestModal";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import Pagination from "@/components/Pagination";

export default function ProcurementPage() {
  const [inventory, setInventory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [limit, setLimit] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Restock Modal State
  const [restockItem, setRestockItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'employee' || user.role === 'staff') {
        window.location.href = "/products";
        return;
      }
      setCurrentUser(user);
    }
    fetchData();
  }, []);

  // Reset to first page when limit or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [limit, searchQuery]);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    try {
      const [invRes, branchRes] = await Promise.all([
        fetch(apiUrl("/api/inventory"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/branches"), { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (invRes.ok) {
        const raw = await invRes.json();
        const items = raw.data ?? [];
        setInventory(items);
      }
      if (branchRes.ok) {
        const bData = await branchRes.json();
        setBranches(bData);
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (!item.Product) return false;
    // Don't show bundles in procurement
    if (item.Product.is_bundle) return false;

    const matchesSearch = item.Product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.Product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const lowStockItems = filteredInventory.filter(item => item.quantity <= item.low_stock_threshold);
  const normalStockItems = filteredInventory.filter(item => item.quantity > item.low_stock_threshold);
  
  // Sort low stock items first
  const sortedInventory = [...lowStockItems, ...normalStockItems];

  const totalPages = Math.ceil(sortedInventory.length / limit);
  const paginatedInventory = sortedInventory.slice((currentPage - 1) * limit, currentPage * limit);

  const openRestockModal = (item) => {
    setRestockItem(item);
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="PROCUREMENT DESK" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 bg-orange-400/50 rounded-full" />
              <h3 className="text-sm font-rajdhani font-bold uppercase text-main tracking-wider">Inventory Restock</h3>
            </div>
            
            <div className="relative group w-full md:w-96">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-main/30 group-focus-within:text-orange-400 transition-colors">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inventory by component or SKU..."
                className="w-full bg-brand-surface border border-border rounded-xl py-4 pl-12 pr-4 text-xs text-main focus:outline-none focus:border-orange-400/20 transition-all font-bold tracking-tight shadow-sm"
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-border border-t-orange-400 rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[4px] text-muted">Syncing Inventory Matrix...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && paginatedInventory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 glass-card border-dashed">
              <Package size={48} className="text-main/10 mb-6" />
              <h3 className="text-sm font-black uppercase tracking-[4px] text-main">No Inventory Records Found</h3>
            </div>
          )}

          {/* Categorized List */}
          {!loading && paginatedInventory.length > 0 && (
            <div className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
              {paginatedInventory.map((item, idx) => {
                const isLowStock = item.quantity <= item.low_stock_threshold;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`flex flex-col md:flex-row md:items-center gap-4 px-6 py-4 transition-colors group ${
                      idx !== paginatedInventory.length - 1 ? 'border-b border-border' : ''
                    } hover:bg-brand-muted/5`}
                  >
                    {/* Status Indicator */}
                    <div className="flex items-center gap-4 md:w-48 shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                        isLowStock 
                          ? 'bg-brand-crimson/10 border-brand-crimson/20 text-brand-crimson' 
                          : 'bg-green-400/10 border-green-400/20 text-green-400'
                      }`}>
                        {isLowStock ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                      </div>
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isLowStock ? 'text-brand-crimson' : 'text-green-400'}`}>
                          {isLowStock ? 'CRITICAL STOCK' : 'OPTIMAL'}
                        </p>
                        <p className="text-[9px] text-muted font-mono uppercase mt-0.5">Threshold: {item.low_stock_threshold}</p>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-rajdhani font-bold text-main truncate capitalize">
                        {item.Product.name}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-muted/40 uppercase tracking-widest font-mono">{item.Product.sku}</span>
                        <div className="w-1 h-1 rounded-full bg-border" />
                        <span className="text-[10px] text-orange-400/80 uppercase tracking-widest font-bold flex items-center gap-1">
                          <Building size={10} />
                          {item.Branch?.name || 'Unknown Sector'}
                        </span>
                      </div>
                    </div>

                    {/* Current Stock */}
                    <div className="md:text-right shrink-0">
                      <p className="text-[9px] text-main/30 font-black uppercase tracking-[2px] mb-0.5">Active Stock</p>
                      <p className={`text-xl font-rajdhani font-black ${isLowStock ? 'text-brand-crimson' : 'text-main'}`}>
                        {item.quantity} <span className="text-[10px] text-muted/50 tracking-widest">UNITS</span>
                      </p>
                    </div>

                    {/* Action */}
                    <div className="shrink-0 mt-4 md:mt-0 flex justify-end">
                      <button 
                        onClick={() => openRestockModal(item)}
                        className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                          isLowStock 
                            ? 'bg-brand-crimson/10 text-brand-crimson hover:bg-brand-crimson hover:text-white border border-brand-crimson/20 shadow-[0_0_15px_rgba(215,38,56,0.15)]'
                            : 'bg-brand-surface border border-border text-main hover:text-orange-400 hover:border-orange-400/30'
                        }`}
                      >
                        <Download size={14} />
                        Restock
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          {sortedInventory.length > limit && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-muted">
                Showing {((currentPage - 1) * limit) + 1}–{Math.min(currentPage * limit, sortedInventory.length)} of {sortedInventory.length} items
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                limit={limit}
                onLimitChange={setLimit}
                limits={[10,25,50,100]}
              />
            </div>
          )}

        </div>
      </main>

      <AnimatePresence>
        {restockItem && (
          <RestockRequestModal 
            inventoryItem={restockItem} 
            onClose={() => setRestockItem(null)} 
            onSuccess={() => {
              setRestockItem(null);
              fetchData();
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
