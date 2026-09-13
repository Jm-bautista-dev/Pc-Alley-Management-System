"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  Layers, Plus, Trash2, Loader2, Edit3, Archive,
  RotateCcw, Package, ArrowRightLeft, Search, X, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";
import { useTheme } from "@/context/ThemeContext";

export default function CategoriesPage() {
  const { theme } = useTheme();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [role, setRole] = useState("");

  // Create / Edit state
  const [createLoading, setCreateLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Reassignment modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignSource, setReassignSource] = useState(null);
  const [reassignTargetId, setReassignTargetId] = useState("");
  const [reassignLoading, setReassignLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchCategories();
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setRole(userData.role || "");
    } catch {}
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/categories"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } else {
        showError("Failed to load categories.");
      }
    } catch (err) {
      showError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      showError("Category name cannot be empty.");
      return;
    }
    if (name.length < 2 || name.length > 50) {
      showError("Category name must be between 2 and 50 characters.");
      return;
    }

    setCreateLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/categories"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      if (res.ok) {
        const created = await res.json();
        setCategories(prev => [...prev, { ...created, productCount: 0 }]);
        setNewCategoryName("");
        showSuccess("Category created successfully!");
      } else {
        const data = await res.json();
        showError(data.error || "Failed to create category.");
      }
    } catch (err) {
      showError("Network error. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    const name = editName.trim();
    if (!name) {
      showError("Category name cannot be empty.");
      return;
    }
    if (name.length < 2 || name.length > 50) {
      showError("Category name must be between 2 and 50 characters.");
      return;
    }

    setEditLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/categories/${editingCategory.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      if (res.ok) {
        const updated = await res.json();
        setCategories(prev => prev.map(c => c.id === updated.id ? { ...c, name: updated.name, slug: updated.slug } : c));
        setEditingCategory(null);
        showSuccess("Category updated successfully!");
      } else {
        const data = await res.json();
        showError(data.error || "Failed to update category.");
      }
    } catch (err) {
      showError("Network error. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (category) => {
    const newStatus = category.status === "active" ? "archived" : "active";
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/categories/${category.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setCategories(prev => prev.map(c => c.id === category.id ? { ...c, status: newStatus } : c));
        showSuccess(`Category ${newStatus === "active" ? "activated" : "archived"} successfully.`);
      } else {
        const data = await res.json();
        showError(data.error || "Failed to update status.");
      }
    } catch (err) {
      showError("Network error. Please try again.");
    }
  };

  const handleDeleteCategory = async (category) => {
    if (role !== "super_admin") {
      showError("Only Super Admins can delete categories.");
      return;
    }

    const count = Number(category.productCount || 0);
    if (count > 0) {
      // Category has linked products - trigger reassignment modal
      setReassignSource(category);
      setReassignTargetId("");
      setShowReassignModal(true);
      return;
    }

    const confirmed = await showConfirm(
      "Delete Category",
      `Are you sure you want to delete category "${category.name}"? This will permanently remove the record.`,
      { danger: true, confirmLabel: "Delete" }
    );
    if (!confirmed) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/categories/${category.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== category.id));
        showSuccess("Category deleted successfully.");
      } else {
        const data = await res.json();
        showError(data.error || "Failed to delete category.");
      }
    } catch (err) {
      showError("Network error. Please try again.");
    }
  };

  const handleExecuteReassign = async () => {
    if (!reassignTargetId) {
      showError("Please select a target category.");
      return;
    }

    setReassignLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/categories/${reassignSource.id}/reassign`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetCategoryId: reassignTargetId })
      });

      if (res.ok) {
        const data = await res.json();
        showSuccess(data.message || "Products reassigned successfully.");
        setShowReassignModal(false);
        setReassignSource(null);
        fetchCategories();
      } else {
        const data = await res.json();
        showError(data.error || "Failed to reassign products.");
      }
    } catch (err) {
      showError("Network error. Please try again.");
    } finally {
      setReassignLoading(false);
    }
  };

  const isSuperAdmin = role === "super_admin";

  // Filtering
  const filteredCategories = categories.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ? true :
      statusFilter === "active" ? (c.status === "active" || !c.status) :
      c.status === "archived";
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCategories.length / pageSize);
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalProductsAcrossCategories = categories.reduce((sum, c) => sum + Number(c.productCount || 0), 0);
  const activeCount = categories.filter(c => c.status === "active" || !c.status).length;
  const archivedCount = categories.filter(c => c.status === "archived").length;

  return (
    <div className={`flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="PRODUCT CATEGORIES" />

        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 text-main p-4 md:p-8">
          <div className="responsive-container max-w-7xl mx-auto">
            
            {/* Header with Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
                  Taxonomy & Classification
                </motion.h2>
                <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-rajdhani font-black tracking-tight text-main uppercase">
                  Product <span className="text-brand-neonblue">Categories</span>
                </motion.h1>
              </div>

              {/* Quick Stat Badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-brand-surface border border-border/50 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
                  <Layers size={14} className="text-brand-neonblue" />
                  <span className="text-xs font-bold text-muted uppercase">Total:</span>
                  <span className="text-sm font-black font-rajdhani text-main">{categories.length}</span>
                </div>
                <div className="bg-brand-surface border border-border/50 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-xs font-bold text-muted uppercase">Active:</span>
                  <span className="text-sm font-black font-rajdhani text-emerald-500">{activeCount}</span>
                </div>
                <div className="bg-brand-surface border border-border/50 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
                  <Package size={14} className="text-brand-neonblue" />
                  <span className="text-xs font-bold text-muted uppercase">Linked Products:</span>
                  <span className="text-sm font-black font-rajdhani text-brand-neonblue">{totalProductsAcrossCategories}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Create Category Column (Only visible to Super Admin) */}
              {isSuperAdmin && (
                <div className="space-y-6">
                  <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-widest text-main mb-6 flex items-center gap-2 border-b border-border/50 pb-4">
                      <Plus size={16} className="text-brand-neonblue" /> Add Category
                    </h3>

                    <form onSubmit={handleCreateCategory} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Category Name *</label>
                        <input
                          type="text"
                          maxLength={50}
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          placeholder="e.g. Processors, Monitors..."
                          className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-sm text-main font-bold outline-none focus:border-brand-neonblue transition-colors"
                          required
                          disabled={createLoading}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={createLoading}
                        className="w-full bg-brand-neonblue text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-brand-neonblue/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {createLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {createLoading ? "Adding..." : "Add Category"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Categories Directory Column */}
              <div className={isSuperAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
                  
                  {/* Toolbar: Search & Status Filter */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 border-b border-border/50 pb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-main flex items-center gap-2">
                      <Layers size={16} className="text-brand-neonblue" /> Category Directory ({filteredCategories.length})
                    </h3>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="relative flex-1 sm:w-48">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="w-full bg-brand-bgbase border border-border/50 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-main outline-none focus:border-brand-neonblue transition-colors"
                        />
                      </div>

                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-brand-bgbase border border-border/50 rounded-xl px-3 py-2 text-xs font-bold text-main outline-none focus:border-brand-neonblue transition-colors cursor-pointer"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="archived">Archived Only</option>
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px]">
                      <Loader2 size={32} className="text-brand-neonblue animate-spin mb-4" />
                      <p className="text-xs font-bold text-muted uppercase tracking-widest">Loading categories...</p>
                    </div>
                  ) : filteredCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px] text-center border border-dashed border-border/50 rounded-xl p-8 bg-brand-bgbase/20">
                      <Layers size={40} className="text-muted/40 mb-4" />
                      <p className="text-sm font-bold text-muted uppercase">No Categories Found</p>
                      <p className="text-[10px] text-muted/60 max-w-xs mt-2 uppercase tracking-wider leading-relaxed">
                        {search ? "No categories match your search criteria." : "Your inventory category directory is currently empty."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border/40 text-[9px] uppercase tracking-[2px] text-muted">
                              <th className="py-3 font-black">ID</th>
                              <th className="py-3 font-black">Category Name</th>
                              <th className="py-3 font-black">Products</th>
                              <th className="py-3 font-black">Status</th>
                              <th className="py-3 font-black">Created At</th>
                              {isSuperAdmin && <th className="py-3 font-black text-right">Actions</th>}
                            </tr>
                          </thead>
                          <tbody>
                            <AnimatePresence mode="popLayout">
                              {paginatedCategories.map((category) => {
                                const productCount = Number(category.productCount || 0);
                                const isArchived = category.status === "archived";

                                return (
                                  <motion.tr
                                    key={category.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="border-b border-border/20 text-sm font-bold text-main/90 hover:bg-brand-bgbase/30 transition-colors"
                                  >
                                    <td className="py-4 text-xs font-mono text-muted">#{category.id}</td>
                                    <td className="py-4 max-w-xs">
                                      <div className="flex items-center gap-2 truncate">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${isArchived ? 'bg-muted/40' : 'bg-brand-neonblue'}`}></span>
                                        <span className={`truncate ${isArchived ? 'text-muted line-through' : 'text-main'}`} title={category.name}>
                                          {category.name}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                                        productCount > 0
                                          ? 'bg-brand-neonblue/10 text-brand-neonblue border border-brand-neonblue/20'
                                          : 'bg-muted/10 text-muted border border-border/40'
                                      }`}>
                                        <Package size={11} />
                                        {productCount}
                                      </span>
                                    </td>
                                    <td className="py-4">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        isArchived
                                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                          : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                      }`}>
                                        {isArchived ? 'Archived' : 'Active'}
                                      </span>
                                    </td>
                                    <td className="py-4 text-xs text-muted font-normal">
                                      {new Date(category.createdAt || Date.now()).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </td>
                                    {isSuperAdmin && (
                                      <td className="py-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          {/* Edit Name */}
                                          <button
                                            onClick={() => {
                                              setEditingCategory(category);
                                              setEditName(category.name);
                                            }}
                                            className="p-2 rounded-lg bg-brand-bgbase hover:bg-brand-neonblue/10 text-muted hover:text-brand-neonblue border border-border/40 transition-all"
                                            title="Edit Category Name"
                                          >
                                            <Edit3 size={13} />
                                          </button>

                                          {/* Reassign Products (if has products) */}
                                          {productCount > 0 && (
                                            <button
                                              onClick={() => {
                                                setReassignSource(category);
                                                setReassignTargetId("");
                                                setShowReassignModal(true);
                                              }}
                                              className="p-2 rounded-lg bg-brand-bgbase hover:bg-amber-500/10 text-muted hover:text-amber-500 border border-border/40 transition-all"
                                              title="Reassign Linked Products"
                                            >
                                              <ArrowRightLeft size={13} />
                                            </button>
                                          )}

                                          {/* Archive / Activate toggle */}
                                          <button
                                            onClick={() => handleToggleStatus(category)}
                                            className={`p-2 rounded-lg border transition-all ${
                                              isArchived
                                                ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border-emerald-500/30'
                                                : 'bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border-amber-500/30'
                                            }`}
                                            title={isArchived ? "Activate Category" : "Archive Category"}
                                          >
                                            {isArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
                                          </button>

                                          {/* Delete (safe check) */}
                                          <button
                                            onClick={() => handleDeleteCategory(category)}
                                            className="p-2 rounded-lg bg-brand-crimson/10 hover:bg-brand-crimson text-brand-crimson hover:text-white border border-brand-crimson/20 transition-all"
                                            title={productCount > 0 ? "Reassign & Delete" : "Delete Category"}
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </motion.tr>
                                );
                              })}
                            </AnimatePresence>
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/30">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black tracking-widest text-muted">Show</span>
                          <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="bg-brand-bgbase border border-border/50 text-main rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-brand-neonblue cursor-pointer h-8"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={30}>30</option>
                          </select>
                          <span className="text-xs text-muted font-bold ml-2">
                            Showing {filteredCategories.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredCategories.length)} of {filteredCategories.length} entries
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className={`px-3 py-1.5 rounded-lg border border-border/50 text-xs font-bold transition-all uppercase tracking-wider ${
                              currentPage === 1
                                ? "text-muted/40 cursor-not-allowed border-border/20"
                                : "text-muted hover:text-main hover:bg-brand-bgbase"
                            }`}
                          >
                            Previous
                          </button>
                          <span className="text-xs text-muted font-bold px-2">
                            Page {currentPage} of {totalPages || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className={`px-3 py-1.5 rounded-lg border border-border/50 text-xs font-bold transition-all uppercase tracking-wider ${
                              currentPage === totalPages || totalPages === 0
                                ? "text-muted/40 cursor-not-allowed border-border/20"
                                : "text-muted hover:text-main hover:bg-brand-bgbase"
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Edit Category Modal */}
        <AnimatePresence>
          {editingCategory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-brand-surface border border-border rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
              >
                <button
                  onClick={() => setEditingCategory(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-brand-bgbase text-muted hover:text-main transition-colors"
                >
                  <X size={16} />
                </button>

                <h3 className="text-base font-black uppercase tracking-wider text-main mb-4 flex items-center gap-2">
                  <Edit3 size={18} className="text-brand-neonblue" /> Edit Category
                </h3>

                <form onSubmit={handleEditCategory} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Category Name *</label>
                    <input
                      type="text"
                      maxLength={50}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-sm text-main font-bold outline-none focus:border-brand-neonblue transition-colors"
                      required
                      disabled={editLoading}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      disabled={editLoading}
                      className="flex-1 btn-ghost py-3 rounded-xl text-xs font-bold uppercase tracking-wider border border-border/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="flex-1 bg-brand-neonblue text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {editLoading ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reassign Products Modal */}
        <AnimatePresence>
          {showReassignModal && reassignSource && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-brand-surface border border-border rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
              >
                <button
                  onClick={() => {
                    setShowReassignModal(false);
                    setReassignSource(null);
                  }}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-brand-bgbase text-muted hover:text-main transition-colors"
                >
                  <X size={16} />
                </button>

                <h3 className="text-base font-black uppercase tracking-wider text-main mb-2 flex items-center gap-2">
                  <ArrowRightLeft size={18} className="text-amber-500" /> Reassign Category Products
                </h3>

                <p className="text-xs text-muted mb-6 leading-relaxed">
                  Category <strong className="text-main">"{reassignSource.name}"</strong> is currently linked with{" "}
                  <strong className="text-brand-neonblue font-mono">{reassignSource.productCount || 0}</strong> products.
                  To preserve relational integrity, choose another active category to transfer these products to.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">
                      Target Destination Category *
                    </label>
                    <select
                      value={reassignTargetId}
                      onChange={e => setReassignTargetId(e.target.value)}
                      className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-xs font-bold text-main outline-none focus:border-brand-neonblue transition-colors cursor-pointer"
                    >
                      <option value="">Select target category...</option>
                      {categories
                        .filter(c => c.id !== reassignSource.id && c.status !== "archived")
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.productCount || 0} products currently)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="p-4 rounded-xl bg-brand-bgbase/50 border border-border/40 text-xs text-muted space-y-1">
                    <p className="font-bold text-main">What will happen:</p>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5">
                      <li>All {reassignSource.productCount || 0} linked products will be updated in an atomic transaction.</li>
                      <li>Foreign key constraints will be respected without orphan records.</li>
                      <li>After reassignment, you can safely archive or delete "{reassignSource.name}".</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReassignModal(false);
                        setReassignSource(null);
                      }}
                      disabled={reassignLoading}
                      className="flex-1 btn-ghost py-3 rounded-xl text-xs font-bold uppercase tracking-wider border border-border/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteReassign}
                      disabled={reassignLoading || !reassignTargetId}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {reassignLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                      {reassignLoading ? "Reassigning..." : "Reassign Products"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
