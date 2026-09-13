"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  PackagePlus,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  Eye,
  Building2,
  Package,
  ShoppingBag,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  Info
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";

export default function BundlesPage() {
  const { user } = useAuthGuard();
  const [bundles, setBundles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [viewingBundle, setViewingBundle] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formSelectedBranches, setFormSelectedBranches] = useState([]);
  const [formSelectedItems, setFormSelectedItems] = useState([]); // [{ product, quantity }]

  // Product Selection / Search inside modal
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";
  const isBranchAdmin = user?.role === "branch_admin";

  useEffect(() => {
    fetchBundles();
    fetchBranches();
    fetchProducts();
  }, []);

  const fetchBundles = async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const res = await fetch(apiUrl("/api/bundles"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBundles(data);
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.message || "Failed to load bundles");
      }
    } catch (err) {
      console.error("Error fetching bundles:", err);
      showError("Network error while loading bundles");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  };

  const fetchProducts = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/products"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllProducts(Array.isArray(data) ? data : data.products || []);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingBundle(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    // Default to selecting all branches if super admin
    setFormSelectedBranches(branches.map(b => b.id));
    setFormSelectedItems([]);
    setProductSearchQuery("");
    setIsProductPickerOpen(false);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal (Super Admin only)
  const handleOpenEditModal = (bundle) => {
    setEditingBundle(bundle);
    setFormName(bundle.name || "");
    setFormDescription(bundle.description || "");
    setFormPrice(bundle.price ? String(bundle.price) : "");
    setFormSelectedBranches(bundle.branches ? bundle.branches.map(b => b.id) : []);
    setFormSelectedItems(
      (bundle.items || []).map(item => ({
        product: item.Product || { id: item.product_id, name: `Product #${item.product_id}`, price: 0 },
        quantity: item.quantity || 1
      }))
    );
    setProductSearchQuery("");
    setIsProductPickerOpen(false);
    setIsFormModalOpen(true);
  };

  // Open View Modal (Branch Admin & Super Admin)
  const handleOpenViewModal = (bundle) => {
    setViewingBundle(bundle);
    setIsViewModalOpen(true);
  };

  // Delete Bundle (Super Admin only)
  const handleDeleteBundle = async (bundle) => {
    const confirmed = await showConfirm(
      "Delete Bundle",
      `Are you sure you want to permanently delete bundle "${bundle.name}"? This action cannot be undone.`,
      { warning: true, confirmLabel: "Delete Bundle" }
    );
    if (!confirmed) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/bundles/${bundle.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showSuccess(`Bundle "${bundle.name}" deleted successfully.`);
        fetchBundles();
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.message || "Failed to delete bundle");
      }
    } catch (err) {
      console.error("Error deleting bundle:", err);
      showError("Network error while deleting bundle");
    }
  };

  // Save Bundle Form (Create or Edit)
  const handleSaveBundle = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const trimmedName = formName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      showError("Bundle name must be at least 2 characters long.");
      return;
    }

    if (formSelectedItems.length === 0) {
      showError("Please select at least one product for this bundle.");
      return;
    }

    if (formSelectedBranches.length === 0) {
      showError("Please select at least one branch where this bundle will be available.");
      return;
    }

    // Determine final price
    let parsedPrice = parseFloat(formPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      // Auto-calculate sum from selected items
      parsedPrice = formSelectedItems.reduce((acc, item) => {
        return acc + (parseFloat(item.product.price || 0) * item.quantity);
      }, 0);
    }

    const payload = {
      name: trimmedName,
      description: formDescription.trim() || undefined,
      price: parsedPrice,
      items: formSelectedItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      })),
      branch_ids: formSelectedBranches
    };

    setSubmitting(true);
    try {
      const url = editingBundle
        ? apiUrl(`/api/bundles/${editingBundle.id}`)
        : apiUrl("/api/bundles");
      const method = editingBundle ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showSuccess(editingBundle ? "Bundle updated successfully!" : "Bundle created successfully!");
        setIsFormModalOpen(false);
        fetchBundles();
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.message || "Failed to save bundle");
      }
    } catch (err) {
      console.error("Error saving bundle:", err);
      showError("Network connection error");
    } finally {
      setSubmitting(false);
    }
  };

  // Product Selection Handlers
  const handleAddProductToBundle = (product) => {
    const existing = formSelectedItems.find(i => i.product.id === product.id);
    if (existing) {
      setFormSelectedItems(
        formSelectedItems.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setFormSelectedItems([...formSelectedItems, { product, quantity: 1 }]);
    }
  };

  const handleUpdateItemQuantity = (productId, delta) => {
    setFormSelectedItems(
      formSelectedItems
        .map(i => {
          if (i.product.id === productId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveItemFromBundle = (productId) => {
    setFormSelectedItems(formSelectedItems.filter(i => i.product.id !== productId));
  };

  // Branch Selection Handlers
  const handleToggleBranch = (branchId) => {
    if (formSelectedBranches.includes(branchId)) {
      setFormSelectedBranches(formSelectedBranches.filter(id => id !== branchId));
    } else {
      setFormSelectedBranches([...formSelectedBranches, branchId]);
    }
  };

  const handleToggleSelectAllBranches = () => {
    if (formSelectedBranches.length === branches.length) {
      setFormSelectedBranches([]);
    } else {
      setFormSelectedBranches(branches.map(b => b.id));
    }
  };

  // Filtered Products for Picker (Search by Name AND Price)
  const filteredProductsForPicker = useMemo(() => {
    if (!productSearchQuery.trim()) return allProducts;
    const query = productSearchQuery.toLowerCase().trim();

    return allProducts.filter(p => {
      const matchName = (p.name || "").toLowerCase().includes(query);
      const matchSku = (p.sku || "").toLowerCase().includes(query);
      const priceStr = String(p.price || "");
      const matchPrice = priceStr.includes(query);

      // Support numeric comparison like "<1000" or ">500"
      if (query.startsWith("<")) {
        const val = parseFloat(query.slice(1));
        if (!isNaN(val)) return parseFloat(p.price) <= val;
      }
      if (query.startsWith(">")) {
        const val = parseFloat(query.slice(1));
        if (!isNaN(val)) return parseFloat(p.price) >= val;
      }

      return matchName || matchSku || matchPrice;
    });
  }, [allProducts, productSearchQuery]);

  // Selected items total value
  const itemsTotalRetailPrice = useMemo(() => {
    return formSelectedItems.reduce((acc, i) => acc + (parseFloat(i.product.price || 0) * i.quantity), 0);
  }, [formSelectedItems]);

  // Filtered Bundles for Main List
  const filteredBundles = useMemo(() => {
    return bundles.filter(bundle => {
      const matchSearch =
        !searchQuery.trim() ||
        bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bundle.description && bundle.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (bundle.items && bundle.items.some(i => i.Product?.name?.toLowerCase().includes(searchQuery.toLowerCase())));

      let matchBranch = true;
      if (selectedBranchFilter !== "all") {
        matchBranch = bundle.branches && bundle.branches.some(b => String(b.id) === String(selectedBranchFilter));
      }

      return matchSearch && matchBranch;
    });
  }, [bundles, searchQuery, selectedBranchFilter]);

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="PRODUCT BUNDLES" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          {/* Top Header Banner */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-1.5 h-6 bg-brand-neonpurple rounded-full" />
                <h1 className="text-2xl font-rajdhani font-black tracking-wider uppercase text-main">
                  Bundle Packages
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-neonpurple/10 text-brand-neonpurple border border-brand-neonpurple/20">
                  {isSuperAdmin ? "Super Admin Access" : "Branch View Only"}
                </span>
              </div>
              <p className="text-xs text-brand-muted font-bold">
                {isSuperAdmin
                  ? "Create, configure, and manage promotional bundles and packages across branches."
                  : "View curated bundle packages and promotional offerings available for your branch."}
              </p>
            </div>

            {/* Actions for Super Admin */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="btn-premium h-11 px-6 rounded-full flex items-center gap-2 shadow-lg hover:shadow-brand-neonpurple/20 text-xs font-black uppercase tracking-wider transition-all"
              >
                <PackagePlus size={18} />
                <span>Add Bundle</span>
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search bundles or included items..."
                className="w-full bg-brand-bgbase border border-brand-border rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-main placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-neonpurple/50 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-main"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {isSuperAdmin && branches.length > 0 && (
                <div className="flex items-center gap-2 bg-brand-bgbase px-3 py-1.5 rounded-xl border border-brand-border">
                  <Building2 size={14} className="text-brand-neonblue" />
                  <span className="text-[10px] font-black uppercase text-brand-muted">Filter Branch:</span>
                  <select
                    value={selectedBranchFilter}
                    onChange={e => setSelectedBranchFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-main outline-none cursor-pointer pr-1"
                  >
                    <option value="all" className="bg-brand-surface text-main">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id} className="bg-brand-surface text-main">{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="text-xs font-mono font-bold text-brand-muted flex items-center gap-1.5 bg-brand-bgbase px-3.5 py-2 rounded-xl border border-brand-border">
                <Layers size={14} className="text-brand-neonpurple" />
                <span>Total Bundles:</span>
                <span className="text-main font-black">{filteredBundles.length}</span>
              </div>
            </div>
          </div>

          {/* Bundles Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-28">
              <div className="w-12 h-12 border-2 border-brand-border border-t-brand-neonpurple rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[4px] text-brand-muted">Loading Bundles...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredBundles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 bg-brand-surface border border-dashed border-brand-border rounded-3xl text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-neonpurple/10 border border-brand-neonpurple/20 flex items-center justify-center text-brand-neonpurple mb-4">
                <Layers size={32} />
              </div>
              <h3 className="text-base font-rajdhani font-black uppercase tracking-wider text-main mb-1">
                No Bundles Available
              </h3>
              <p className="text-xs text-brand-muted max-w-sm">
                {isSuperAdmin
                  ? "Click the 'Add Bundle' button above to configure your first package offering."
                  : "No bundle packages are currently active or assigned to your branch."}
              </p>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="mt-5 btn-premium h-10 px-5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2"
                >
                  <Plus size={16} /> Create First Bundle
                </button>
              )}
            </div>
          )}

          {/* Bundles Grid */}
          {!loading && filteredBundles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
              {filteredBundles.map((bundle, idx) => {
                const totalItemCount = (bundle.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
                const retailSum = (bundle.items || []).reduce((sum, i) => {
                  const p = parseFloat(i.Product?.price || 0);
                  return sum + (p * (i.quantity || 1));
                }, 0);
                const bundlePrice = parseFloat(bundle.price || 0);
                const savings = retailSum > bundlePrice ? retailSum - bundlePrice : 0;

                return (
                  <motion.div
                    key={bundle.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-brand-surface rounded-3xl border border-brand-border hover:border-brand-neonpurple/40 p-5 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all relative overflow-hidden group"
                  >
                    <div>
                      {/* Top Header info */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-neonpurple/10 text-brand-neonpurple border border-brand-neonpurple/20">
                          <ShoppingBag size={11} />
                          <span>{totalItemCount} {totalItemCount === 1 ? "Item" : "Items"}</span>
                        </div>
                        {savings > 0 && (
                          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span>Save ₱{savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-base font-rajdhani font-black text-main uppercase tracking-wide leading-tight line-clamp-1 group-hover:text-brand-neonpurple transition-colors mb-1">
                        {bundle.name}
                      </h3>
                      <p className="text-[11px] text-brand-muted leading-relaxed line-clamp-2 mb-4">
                        {bundle.description || "Package bundle with bundled components and exclusive branch pricing."}
                      </p>

                      {/* Included Products List Preview */}
                      <div className="bg-brand-bgbase rounded-2xl p-3 border border-brand-border/60 mb-4 space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted block">
                          Included Products
                        </span>
                        {(bundle.items || []).slice(0, 3).map((item, itemIdx) => (
                          <div key={itemIdx} className="flex justify-between items-center text-xs">
                            <span className="text-main font-bold truncate pr-2">
                              {item.Product?.name || `Product #${item.product_id}`}
                            </span>
                            <span className="font-mono text-brand-neonpurple font-black shrink-0">
                              x{item.quantity || 1}
                            </span>
                          </div>
                        ))}
                        {(bundle.items || []).length > 3 && (
                          <p className="text-[10px] font-bold text-brand-neonblue pt-1">
                            +{(bundle.items || []).length - 3} more items...
                          </p>
                        )}
                        {(!bundle.items || bundle.items.length === 0) && (
                          <p className="text-[11px] text-brand-muted italic">No products attached</p>
                        )}
                      </div>

                      {/* Branch availability tags */}
                      <div className="mb-4">
                        <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted block mb-1.5">
                          Available At
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(bundle.branches || []).map(b => (
                            <span
                              key={b.id}
                              className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase bg-brand-surface border border-brand-border text-brand-muted"
                            >
                              {b.name}
                            </span>
                          ))}
                          {(!bundle.branches || bundle.branches.length === 0) && (
                            <span className="text-[10px] text-brand-crimson font-bold">No branches assigned</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Pricing & Actions */}
                    <div className="border-t border-brand-border/60 pt-3 mt-2 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-brand-muted block">
                          Bundle Price
                        </span>
                        <span className="text-lg font-rajdhani font-black text-brand-neonpurple">
                          ₱{bundlePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenViewModal(bundle)}
                          className="px-3 py-1.5 bg-brand-bgbase hover:bg-brand-neonblue/10 text-brand-muted hover:text-brand-neonblue border border-brand-border hover:border-brand-neonblue/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                          title="View Bundle Details"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {/* Super Admin Manage Buttons */}
                        {isSuperAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(bundle)}
                              className="p-1.5 bg-brand-bgbase hover:bg-brand-neonpurple/10 text-brand-muted hover:text-brand-neonpurple border border-brand-border hover:border-brand-neonpurple/30 rounded-xl transition-all"
                              title="Edit Bundle"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBundle(bundle)}
                              className="p-1.5 bg-brand-bgbase hover:bg-brand-crimson/10 text-brand-muted hover:text-brand-crimson border border-brand-border hover:border-brand-crimson/30 rounded-xl transition-all"
                              title="Delete Bundle"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          VIEW BUNDLE DETAILS MODAL (ACCESSIBLE TO BRANCH ADMIN & SUPER ADMIN)
          ========================================================================= */}
      <AnimatePresence>
        {isViewModalOpen && viewingBundle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsViewModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-brand-surface border border-brand-border rounded-[32px] overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-surface shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-neonpurple/10 border border-brand-neonpurple/20 flex items-center justify-center text-brand-neonpurple">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-rajdhani font-black text-main uppercase tracking-wider">
                      {viewingBundle.name}
                    </h2>
                    <p className="text-[10px] text-brand-muted uppercase tracking-widest">
                      Bundle Package Details (Read-Only)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="p-2 text-brand-muted hover:text-brand-crimson rounded-full hover:bg-brand-crimson/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                {/* Pricing & Description Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-bgbase p-4 rounded-2xl border border-brand-border">
                    <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted block mb-1">
                      Package Price
                    </span>
                    <span className="text-2xl font-rajdhani font-black text-brand-neonpurple">
                      ₱{parseFloat(viewingBundle.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-brand-bgbase p-4 rounded-2xl border border-brand-border">
                    <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted block mb-1">
                      Included Items Count
                    </span>
                    <span className="text-2xl font-rajdhani font-black text-main">
                      {(viewingBundle.items || []).reduce((s, i) => s + (i.quantity || 1), 0)} Units
                    </span>
                  </div>
                </div>

                {viewingBundle.description && (
                  <div className="bg-brand-bgbase p-4 rounded-2xl border border-brand-border">
                    <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted block mb-1">
                      Description
                    </span>
                    <p className="text-xs text-main leading-relaxed">{viewingBundle.description}</p>
                  </div>
                )}

                {/* Available Branches */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block mb-2">
                    Available Branches
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(viewingBundle.branches || []).map(b => (
                      <span
                        key={b.id}
                        className="px-3 py-1 rounded-xl text-xs font-bold uppercase bg-brand-bgbase border border-brand-border text-main flex items-center gap-1.5"
                      >
                        <Building2 size={13} className="text-brand-neonblue" />
                        <span>{b.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Included Products Table */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block mb-2">
                    Included Products in Bundle
                  </span>
                  <div className="border border-brand-border rounded-2xl overflow-hidden bg-brand-bgbase">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-brand-surface border-b border-brand-border text-[9px] font-black uppercase text-brand-muted tracking-wider">
                        <tr>
                          <th className="p-3">Product Name</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-right">Unit Price</th>
                          <th className="p-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border">
                        {(viewingBundle.items || []).map((item, idx) => {
                          const unitPrice = parseFloat(item.Product?.price || 0);
                          const subtotal = unitPrice * (item.quantity || 1);
                          return (
                            <tr key={idx} className="hover:bg-brand-surface/50">
                              <td className="p-3 font-bold text-main">
                                {item.Product?.name || `Product #${item.product_id}`}
                                {item.Product?.sku && (
                                  <span className="block text-[9px] font-mono text-brand-muted uppercase">
                                    SKU: {item.Product.sku}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-brand-neonpurple">
                                {item.quantity || 1}
                              </td>
                              <td className="p-3 text-right font-mono text-brand-muted">
                                ₱{unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-main">
                                ₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-brand-border bg-brand-surface flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs bg-brand-bgbase hover:bg-brand-surface border border-brand-border text-main transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          CREATE / EDIT BUNDLE MODAL (SUPER ADMIN ONLY)
          ========================================================================= */}
      <AnimatePresence>
        {isFormModalOpen && isSuperAdmin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-5xl bg-brand-surface border border-brand-border rounded-[32px] overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-surface shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-neonpurple/10 border border-brand-neonpurple/20 flex items-center justify-center text-brand-neonpurple">
                    <PackagePlus size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-rajdhani font-black text-main uppercase tracking-wider">
                      {editingBundle ? "Edit Bundle Package" : "Create New Bundle"}
                    </h2>
                    <p className="text-[10px] text-brand-muted uppercase tracking-widest">
                      Configure bundle name, products, prices, and branch availability
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-2 text-brand-muted hover:text-brand-crimson rounded-full hover:bg-brand-crimson/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body Form */}
              <form id="bundle-form" onSubmit={handleSaveBundle} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bundle Name Field */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[2px] text-brand-muted mb-2">
                      Bundle Name <span className="text-brand-crimson">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="e.g. Creator Rig Starter Package"
                      className="w-full bg-brand-bgbase border border-brand-border rounded-xl py-3 px-4 text-sm font-bold text-main focus:outline-none focus:border-brand-neonpurple/50 transition-colors"
                    />
                  </div>

                  {/* Bundle Price Field */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] font-black uppercase tracking-[2px] text-brand-muted">
                        Bundle Price (₱) <span className="text-brand-crimson">*</span>
                      </label>
                      {itemsTotalRetailPrice > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormPrice(String(itemsTotalRetailPrice))}
                          className="text-[9px] font-bold text-brand-neonblue hover:underline uppercase"
                        >
                          Auto-sum (₱{itemsTotalRetailPrice.toLocaleString()})
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formPrice}
                      onChange={e => setFormPrice(e.target.value)}
                      placeholder={itemsTotalRetailPrice > 0 ? String(itemsTotalRetailPrice) : "0.00"}
                      className="w-full bg-brand-bgbase border border-brand-border rounded-xl py-3 px-4 text-sm font-bold text-brand-neonpurple focus:outline-none focus:border-brand-neonpurple/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Description Field */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[2px] text-brand-muted mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Provide a brief summary of what this bundle includes or warranty details..."
                    className="w-full bg-brand-bgbase border border-brand-border rounded-xl py-2.5 px-4 text-xs font-medium text-main focus:outline-none focus:border-brand-neonpurple/50 transition-colors"
                  />
                </div>

                {/* Branch Availability Selection Field */}
                <div className="bg-brand-bgbase p-5 rounded-2xl border border-brand-border">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[2px] text-main">
                        Branch Availability <span className="text-brand-crimson">*</span>
                      </label>
                      <p className="text-[10px] text-brand-muted">
                        Select which branch or branches will have access to offer this bundle
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleSelectAllBranches}
                      className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-brand-surface border border-brand-border text-brand-neonblue hover:border-brand-neonblue/40 transition-colors"
                    >
                      {formSelectedBranches.length === branches.length ? "Deselect All" : "Select All Branches"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {branches.map(branch => {
                      const isSelected = formSelectedBranches.includes(branch.id);
                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => handleToggleBranch(branch.id)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? "bg-brand-neonblue/10 border-brand-neonblue/40 text-brand-neonblue"
                              : "bg-brand-surface border-brand-border text-brand-muted hover:border-brand-border/80"
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="text-xs font-bold block truncate text-main">{branch.name}</span>
                            <span className="text-[9px] text-brand-muted uppercase block">{branch.location || "Branch"}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border ${
                            isSelected ? "bg-brand-neonblue text-white border-brand-neonblue" : "border-brand-border"
                          }`}>
                            {isSelected && <Check size={12} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Product Selection Field with Search & Multi-select */}
                <div className="bg-brand-bgbase p-5 rounded-2xl border border-brand-border">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[2px] text-main">
                        Product Selection <span className="text-brand-crimson">*</span>
                      </label>
                      <p className="text-[10px] text-brand-muted">
                        Click the search box below to display the complete product list, search by name and price, and select multiple products
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-brand-neonpurple uppercase">
                      {formSelectedItems.length} Products Added
                    </span>
                  </div>

                  {/* Product Search Box (Clicking displays product list) */}
                  <div className="relative mb-4">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onFocus={() => setIsProductPickerOpen(true)}
                      onChange={e => {
                        setProductSearchQuery(e.target.value);
                        setIsProductPickerOpen(true);
                      }}
                      placeholder="Click to browse products, or search by product name or price (e.g. 'Keyboard' or '1500')..."
                      className="w-full bg-brand-surface border border-brand-border rounded-xl py-3 pl-10 pr-10 text-xs font-bold text-main placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-neonpurple/50 transition-colors"
                    />
                    {isProductPickerOpen && (
                      <button
                        type="button"
                        onClick={() => setIsProductPickerOpen(false)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-main text-[10px] font-black uppercase tracking-wider bg-brand-bgbase px-2 py-0.5 rounded-md border border-brand-border"
                      >
                        Hide List
                      </button>
                    )}
                  </div>

                  {/* Dropdown / Expandable Complete Product List */}
                  {isProductPickerOpen && (
                    <div className="border border-brand-border rounded-2xl bg-brand-surface p-3 mb-4 shadow-xl max-h-64 overflow-y-auto custom-scrollbar">
                      <div className="flex justify-between items-center px-2 py-1 mb-2 border-b border-brand-border/60">
                        <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted">
                          Product Catalog ({filteredProductsForPicker.length} items found)
                        </span>
                        <span className="text-[9px] text-brand-neonpurple font-bold">
                          Click "+" to add to bundle
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {filteredProductsForPicker.map(product => {
                          const isAlreadySelected = formSelectedItems.some(i => i.product.id === product.id);
                          return (
                            <div
                              key={product.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                                isAlreadySelected
                                  ? "bg-brand-neonpurple/5 border-brand-neonpurple/30"
                                  : "bg-brand-bgbase border-brand-border hover:border-brand-neonpurple/20"
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="text-xs font-bold text-main truncate capitalize">{product.name}</p>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-[9px] text-brand-muted font-mono uppercase tracking-wider">
                                    SKU: {product.sku || "N/A"}
                                  </span>
                                  <span className="text-[9px] text-brand-neonblue font-black uppercase">
                                    ₱{parseFloat(product.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddProductToBundle(product)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                                  isAlreadySelected
                                    ? "bg-brand-neonpurple/20 text-brand-neonpurple hover:bg-brand-neonpurple hover:text-white"
                                    : "bg-brand-neonpurple text-white hover:bg-brand-neonpurple/80"
                                }`}
                              >
                                <Plus size={13} />
                                <span>{isAlreadySelected ? "Add Another" : "Add"}</span>
                              </button>
                            </div>
                          );
                        })}

                        {filteredProductsForPicker.length === 0 && (
                          <div className="py-8 text-center text-xs text-brand-muted">
                            No products match "{productSearchQuery}". Try another name or price.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selected Products in this bundle */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block mb-2">
                      Selected Bundle Components ({formSelectedItems.length})
                    </span>

                    {formSelectedItems.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-brand-border rounded-xl bg-brand-surface/40">
                        <Package size={28} className="mx-auto text-brand-muted/40 mb-2" />
                        <p className="text-xs font-bold text-brand-muted">No products added yet</p>
                        <p className="text-[10px] text-brand-muted/60 mt-0.5">
                          Click the product selection field above to choose products for this bundle.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {formSelectedItems.map(item => {
                          const itemPrice = parseFloat(item.product.price || 0);
                          const itemSubtotal = itemPrice * item.quantity;
                          return (
                            <div
                              key={item.product.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-brand-surface border border-brand-border"
                            >
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="text-xs font-bold text-main truncate capitalize">{item.product.name}</p>
                                <p className="text-[10px] font-mono text-brand-muted">
                                  ₱{itemPrice.toLocaleString()} each • Subtotal:{" "}
                                  <span className="text-main font-bold">₱{itemSubtotal.toLocaleString()}</span>
                                </p>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-1.5 bg-brand-bgbase p-1 rounded-lg border border-brand-border">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQuantity(item.product.id, -1)}
                                    className="w-6 h-6 rounded bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted hover:text-main text-xs font-black"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center text-xs font-mono font-black text-main">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQuantity(item.product.id, 1)}
                                    className="w-6 h-6 rounded bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted hover:text-main text-xs font-black"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromBundle(item.product.id)}
                                  className="p-1.5 text-brand-muted hover:text-brand-crimson hover:bg-brand-crimson/10 rounded-lg transition-colors"
                                  title="Remove from bundle"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </form>

              {/* Footer Buttons */}
              <div className="p-6 border-t border-brand-border bg-brand-surface flex justify-between items-center shrink-0">
                <div className="text-xs">
                  <span className="text-brand-muted">Constituent Retail Sum: </span>
                  <span className="font-mono font-bold text-main">₱{itemsTotalRetailPrice.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs text-brand-muted hover:text-main hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="bundle-form"
                    disabled={submitting}
                    className="btn-premium h-11 px-8 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg"
                  >
                    {submitting ? "Saving..." : editingBundle ? "Update Bundle" : "Save Bundle"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
