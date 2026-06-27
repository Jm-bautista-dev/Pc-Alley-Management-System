"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PackagePlus, 
  Layers, 
  Plus, 
  X,
  Search,
  Package,
  ShoppingBag
} from "lucide-react";
import { apiUrl } from "@/lib/api";

export default function BundlesPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Bundle Form State
  const [bundleName, setBundleName] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [selectedItems, setSelectedItems] = useState([]); // { product, quantity }
  const [searchQuery, setSearchQuery] = useState("");

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
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBundle = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    
    if (selectedItems.length === 0) {
      alert("Please add at least one item to the bundle.");
      return;
    }

    const payload = {
      name: bundleName,
      price: Number(bundlePrice),
      items: selectedItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }))
    };

    try {
      const res = await fetch(apiUrl("/api/products/bundles"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setBundleName("");
        setBundlePrice("");
        setSelectedItems([]);
        fetchProducts(); // Refresh list
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create bundle");
      }
    } catch (err) {
      console.error("Error creating bundle:", err);
    }
  };

  const bundles = products.filter(p => p.is_bundle);
  const availableItems = products.filter(p => !p.is_bundle && 
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addItemToBundle = (product) => {
    if (!selectedItems.find(item => item.product.id === product.id)) {
      setSelectedItems([...selectedItems, { product, quantity: 1 }]);
    }
  };

  const updateItemQuantity = (productId, qty) => {
    if (qty < 1) return;
    setSelectedItems(selectedItems.map(item => 
      item.product.id === productId ? { ...item, quantity: qty } : item
    ));
  };

  const removeItemFromBundle = (productId) => {
    setSelectedItems(selectedItems.filter(item => item.product.id !== productId));
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="PRODUCT BUNDLES" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 bg-brand-neonpurple/50 rounded-full" />
              <h3 className="text-sm font-rajdhani font-bold uppercase text-main tracking-wider">Bundle Packages</h3>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-premium h-12 px-8 rounded-full flex items-center gap-2"
            >
              <PackagePlus size={18} />
              <span>Create Bundle</span>
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-border border-t-brand-neonpurple rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[4px] text-muted">Syncing Bundles...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && bundles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 glass-card border-dashed">
              <Layers size={48} className="text-main/10 mb-6" />
              <h3 className="text-sm font-black uppercase tracking-[4px] text-main">No Bundles Created</h3>
              <p className="text-[10px] text-main/30 font-black uppercase tracking-widest mt-2">Click create bundle to start</p>
            </div>
          )}

          {/* Bundles Grid */}
          {!loading && bundles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bundles.map((bundle, idx) => (
                <motion.div
                  key={bundle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-brand-surface border border-border rounded-2xl p-6 shadow-sm group hover:border-brand-neonpurple/30 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-neonpurple/10 border border-brand-neonpurple/20 flex items-center justify-center text-brand-neonpurple">
                      <ShoppingBag size={24} />
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] text-muted uppercase tracking-widest mb-1">Package Price</p>
                       <p className="text-lg font-rajdhani font-black text-brand-neonpurple">₱{Number(bundle.price).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-bold text-main mb-1 capitalize truncate">{bundle.name}</h4>
                  <p className="text-[10px] text-muted/40 font-mono uppercase tracking-widest mb-6">SKU: {bundle.sku}</p>
                  
                  <div className="border-t border-border pt-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-main/40 mb-3">Included Items</p>
                    <div className="space-y-2">
                      {bundle.BundleItems?.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <span className="text-muted truncate pr-4">{item.name}</span>
                          <span className="font-mono text-brand-neonpurple font-bold shrink-0">x{item.ProductBundle?.quantity || 1}</span>
                        </div>
                      ))}
                      {(!bundle.BundleItems || bundle.BundleItems.length === 0) && (
                        <p className="text-xs text-muted/50 italic">No items attached</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Create Bundle Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl bg-brand-surface border border-border rounded-[32px] overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-border flex justify-between items-center bg-brand-surface shrink-0">
                <div>
                  <h2 className="text-2xl font-rajdhani font-black text-main uppercase tracking-wider mb-1">Package Builder</h2>
                  <p className="text-[10px] text-muted uppercase tracking-widest">Create a new bundled offering</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-muted hover:text-brand-crimson transition-colors rounded-full hover:bg-brand-crimson/10">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                {/* Left Side: Bundle Info & Selected Items */}
                <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto custom-scrollbar border-r border-border">
                  <form id="bundle-form" onSubmit={handleCreateBundle} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[2px] text-main/40 mb-2">Bundle Name</label>
                        <input
                          type="text"
                          required
                          value={bundleName}
                          onChange={(e) => setBundleName(e.target.value)}
                          className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-sm font-bold text-main focus:outline-none focus:border-brand-neonpurple/50 transition-colors"
                          placeholder="e.g. Starter PC Package"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[2px] text-main/40 mb-2">Bundle Price (₱)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={bundlePrice}
                          onChange={(e) => setBundlePrice(e.target.value)}
                          className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-sm font-bold text-brand-neonpurple focus:outline-none focus:border-brand-neonpurple/50 transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border">
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-[10px] font-black uppercase tracking-[2px] text-main/40">Included Components</label>
                        <span className="text-[10px] font-bold text-brand-neonpurple uppercase">{selectedItems.length} items selected</span>
                      </div>
                      
                      {selectedItems.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border rounded-xl bg-brand-bgbase">
                          <p className="text-xs text-muted">Select components from the inventory pane</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedItems.map((item) => (
                            <div key={item.product.id} className="flex items-center gap-3 bg-brand-bgbase p-3 rounded-xl border border-border">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-main truncate capitalize">{item.product.name}</p>
                                <p className="text-[10px] text-muted uppercase tracking-widest font-mono">₱{Number(item.product.price).toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)} className="w-6 h-6 rounded bg-brand-surface border border-border flex items-center justify-center text-muted hover:text-main">-</button>
                                <span className="w-6 text-center text-xs font-mono font-bold text-main">{item.quantity}</span>
                                <button type="button" onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)} className="w-6 h-6 rounded bg-brand-surface border border-border flex items-center justify-center text-muted hover:text-main">+</button>
                              </div>
                              <button type="button" onClick={() => removeItemFromBundle(item.product.id)} className="w-8 h-8 rounded-lg border border-brand-crimson/20 bg-brand-crimson/10 flex items-center justify-center text-brand-crimson hover:bg-brand-crimson hover:text-white transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                {/* Right Side: Inventory Selection */}
                <div className="w-full md:w-1/2 flex flex-col bg-brand-bgbase/50">
                  <div className="p-6 border-b border-border">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search inventory to add..."
                        className="w-full bg-brand-surface border border-border rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-main focus:outline-none focus:border-brand-neonpurple/30 transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="space-y-2">
                      {availableItems.map(product => {
                        const isSelected = selectedItems.find(i => i.product.id === product.id);
                        return (
                          <div key={product.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                            isSelected ? 'bg-brand-neonpurple/5 border-brand-neonpurple/30' : 'bg-brand-surface border-border hover:border-brand-neonpurple/20'
                          }`}>
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-xs font-bold text-main truncate capitalize">{product.name}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[9px] text-muted font-mono uppercase tracking-widest">{product.sku}</span>
                                <span className="text-[9px] text-brand-neonblue font-bold uppercase tracking-widest">₱{Number(product.price).toLocaleString()}</span>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => isSelected ? removeItemFromBundle(product.id) : addItemToBundle(product)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                isSelected 
                                  ? 'bg-brand-crimson/10 text-brand-crimson hover:bg-brand-crimson hover:text-white' 
                                  : 'bg-brand-neonpurple/10 text-brand-neonpurple hover:bg-brand-neonpurple hover:text-white'
                              }`}
                            >
                              {isSelected ? <X size={14} /> : <Plus size={14} />}
                            </button>
                          </div>
                        );
                      })}
                      {availableItems.length === 0 && (
                        <p className="text-center text-xs text-muted py-10">No items match your search.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 md:p-8 border-t border-border bg-brand-surface flex justify-end gap-4 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] text-muted hover:text-main hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  form="bundle-form"
                  className="btn-premium px-10 py-3.5 rounded-full"
                >
                  Create Bundle
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
