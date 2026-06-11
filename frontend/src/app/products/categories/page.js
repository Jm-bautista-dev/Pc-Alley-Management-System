"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Layers, Plus, Trash2, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { useTheme } from "@/context/ThemeContext";

export default function CategoriesPage() {
  const { theme } = useTheme();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [role, setRole] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchCategories();
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setRole(userData.role || "");
    } catch {}
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [categories.length, pageSize]);

  const fetchCategories = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/categories"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
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
    if (!newCategoryName.trim()) {
      showError("Category name cannot be empty.");
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
        body: JSON.stringify({ name: newCategoryName.trim() })
      });

      if (res.ok) {
        const created = await res.json();
        setCategories(prev => [...prev, created]);
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

  const handleDeleteCategory = async (id, name) => {
    if (role !== "super_admin") {
      showError("Only Super Admins can delete categories.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) {
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/categories/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== id));
        showSuccess("Category deleted successfully.");
      } else {
        const data = await res.json();
        showError(data.error || "Failed to delete category.");
      }
    } catch (err) {
      showError("Network error. Please try again.");
    }
  };

  const isSuperAdmin = role === "super_admin";
  const totalPages = Math.ceil(categories.length / pageSize);
  const paginatedCategories = categories.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className={`flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="CATEGORIES" />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 text-main p-4">
          <div className="responsive-container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">Hardware Classification</motion.h2>
                <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-rajdhani font-black tracking-tight text-main uppercase">
                  Manage <span className="text-brand-neonblue">Categories</span>
                </motion.h1>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create Category Column */}
              <div className="space-y-6">
                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-main mb-6 flex items-center gap-2 border-b border-border/50 pb-4">
                    <Plus size={16} className="text-brand-neonblue" /> Create Category
                  </h3>
                  
                  {isSuperAdmin ? (
                    <form onSubmit={handleCreateCategory} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Category Name *</label>
                        <input 
                          type="text" 
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          placeholder="e.g. Graphics Cards" 
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
                        {createLoading ? "Creating..." : "Add Category"}
                      </button>
                    </form>
                  ) : (
                    <div className="text-center p-4 border border-border/30 rounded-xl bg-brand-bgbase/50">
                      <AlertCircle size={24} className="text-brand-crimson mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-bold text-main uppercase">Access Restricted</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Only super administrators can create new categories.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Categories List Column */}
              <div className="lg:col-span-2">
                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-main mb-6 flex items-center gap-2 border-b border-border/50 pb-4">
                    <Layers size={16} className="text-brand-neonblue" /> Category Directory ({categories.length})
                  </h3>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px]">
                      <Loader2 size={32} className="text-brand-neonblue animate-spin mb-4" />
                      <p className="text-xs font-bold text-muted uppercase tracking-widest">Loading taxonomy configuration...</p>
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px] text-center border border-dashed border-border/50 rounded-xl p-8 bg-brand-bgbase/20">
                      <Layers size={40} className="text-muted/40 mb-4" />
                      <p className="text-sm font-bold text-muted uppercase">No Categories Found</p>
                      <p className="text-[10px] text-muted/60 max-w-xs mt-2 uppercase tracking-wider leading-relaxed">
                        Your inventory taxonomy directory is currently empty. Add a new classification on the left.
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
                              <th className="py-3 font-black">Created At</th>
                              {isSuperAdmin && <th className="py-3 font-black text-right">Actions</th>}
                            </tr>
                          </thead>
                          <tbody>
                            <AnimatePresence mode="popLayout">
                              {paginatedCategories.map((category) => (
                                <motion.tr 
                                  key={category.id}
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  className="border-b border-border/20 text-sm font-bold text-main/90 hover:bg-brand-bgbase/30 transition-colors"
                                >
                                  <td className="py-4 text-xs font-mono text-muted">#{category.id}</td>
                                  <td className="py-4">
                                    <span className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-brand-neonblue"></span>
                                      {category.name}
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
                                      <button
                                        onClick={() => handleDeleteCategory(category.id, category.name)}
                                        className="p-2 rounded-lg bg-brand-crimson/10 hover:bg-brand-crimson text-brand-crimson hover:text-white transition-all flex items-center justify-center ml-auto"
                                        title="Delete Category"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  )}
                                </motion.tr>
                              ))}
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
                            Showing {categories.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, categories.length)} of {categories.length} entries
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
      </main>
    </div>
  );
}
