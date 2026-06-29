"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";
import { useTheme } from "@/context/ThemeContext";
import {
  Tag, Plus, Search, Edit3, Trash2, X, UploadCloud, Image as ImageIcon,
  Loader2, Archive, RotateCcw, Package, CheckCircle2
} from "lucide-react";

export default function BrandsPage() {
  const { theme } = useTheme();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({ name: "", description: "", status: "active" });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoInputRef = useRef(null);

  useEffect(() => { fetchBrands(); }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/api/brands"), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setBrands(await res.json());
    } catch (err) {
      showError("Failed to load brands.");
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditingBrand(null);
    setFormData({ name: "", description: "", status: "active" });
    setLogoFile(null);
    setLogoPreview(null);
    setShowModal(true);
  };

  const openEditModal = (brand) => {
    setEditingBrand(brand);
    setFormData({ name: brand.name, description: brand.description || "", status: brand.status });
    setLogoFile(null);
    setLogoPreview(brand.logo ? apiUrl(brand.logo) : null);
    setShowModal(true);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showError("Logo must be under 5MB."); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { showError("Brand name is required."); return; }
    setSaving(true);
    const token = localStorage.getItem("token");
    const fd = new FormData();
    fd.append("name", formData.name.trim());
    fd.append("description", formData.description);
    fd.append("status", formData.status);
    if (logoFile) fd.append("logo", logoFile);
    if (editingBrand && !logoFile && !logoPreview) fd.append("remove_logo", "true");

    try {
      const url = editingBrand ? apiUrl(`/api/brands/${editingBrand.id}`) : apiUrl("/api/brands");
      const method = editingBrand ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });

      if (res.ok) {
        showSuccess(editingBrand ? "Brand updated!" : "Brand created!");
        setShowModal(false);
        fetchBrands();
      } else {
        const data = await res.json();
        showError(data.error || "Save failed.");
      }
    } catch {
      showError("Network error.");
    }
    setSaving(false);
  };

  const handleDelete = async (brand) => {
    showConfirm(
      `Delete "${brand.name}"?`,
      `This will permanently remove the brand. Products linked to this brand will NOT be deleted, but their brand association will be lost.`,
      async () => {
        const token = localStorage.getItem("token");
        try {
          const res = await fetch(apiUrl(`/api/brands/${brand.id}`), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            showSuccess("Brand deleted.");
            fetchBrands();
          } else {
            const data = await res.json();
            showError(data.error || "Delete failed.");
          }
        } catch {
          showError("Network error.");
        }
      }
    );
  };

  const handleToggleStatus = async (brand) => {
    const newStatus = brand.status === "active" ? "archived" : "active";
    const token = localStorage.getItem("token");
    const fd = new FormData();
    fd.append("status", newStatus);
    try {
      const res = await fetch(apiUrl(`/api/brands/${brand.id}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      if (res.ok) {
        showSuccess(`Brand ${newStatus === "active" ? "activated" : "archived"}.`);
        fetchBrands();
      }
    } catch {
      showError("Failed to update status.");
    }
  };

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );
  const activeBrands = filteredBrands.filter(b => b.status === "active");
  const archivedBrands = filteredBrands.filter(b => b.status !== "active");

  return (
    <div className={`flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="BRAND MANAGEMENT" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">

          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">Inventory</motion.h2>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-rajdhani font-black tracking-tight text-main uppercase">
                Brand <span className="text-brand-neonblue">Directory</span>
              </motion.h1>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search brands..."
                  className="w-full bg-brand-surface border border-border/50 rounded-full pl-9 pr-4 py-2.5 text-xs text-main font-bold outline-none focus:border-brand-neonblue transition-colors"
                />
              </div>
              <button
                onClick={openCreateModal}
                className="bg-brand-neonblue text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-brand-neonblue/20 transition-all flex items-center gap-2 shrink-0"
              >
                <Plus size={14} /> Add Brand
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Brands", value: brands.length, color: "brand-neonblue" },
              { label: "Active", value: brands.filter(b => b.status === "active").length, color: "green-500" },
              { label: "Archived", value: brands.filter(b => b.status !== "active").length, color: "amber-500" },
              { label: "With Products", value: brands.filter(b => parseInt(b.dataValues?.productCount || b.productCount || 0) > 0).length, color: "brand-neonpurple" },
            ].map((stat) => (
              <div key={stat.label} className="bg-brand-surface border border-border/50 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-black text-muted uppercase tracking-[2px] mb-1">{stat.label}</p>
                <p className={`text-2xl font-rajdhani font-black text-${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-brand-neonblue" />
            </div>
          ) : (
            <>
              {/* Active Brands */}
              {activeBrands.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-black uppercase tracking-[3px] text-main/50 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-500" /> Active Brands ({activeBrands.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeBrands.map((brand, i) => (
                      <BrandCard key={brand.id} brand={brand} index={i} onEdit={openEditModal} onDelete={handleDelete} onToggle={handleToggleStatus} />
                    ))}
                  </div>
                </div>
              )}

              {/* Archived Brands */}
              {archivedBrands.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-black uppercase tracking-[3px] text-main/50 mb-4 flex items-center gap-2">
                    <Archive size={14} className="text-amber-500" /> Archived Brands ({archivedBrands.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {archivedBrands.map((brand, i) => (
                      <BrandCard key={brand.id} brand={brand} index={i} onEdit={openEditModal} onDelete={handleDelete} onToggle={handleToggleStatus} archived />
                    ))}
                  </div>
                </div>
              )}

              {filteredBrands.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Tag size={48} className="text-muted/30 mb-4" />
                  <p className="text-sm font-bold text-muted">No brands found.</p>
                  <p className="text-xs text-muted/60 mt-1">Create your first brand to get started.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-brand-surface border border-border/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <h3 className="text-sm font-black uppercase tracking-widest text-main flex items-center gap-2">
                  <Tag size={16} className="text-brand-neonblue" />
                  {editingBrand ? "Edit Brand" : "New Brand"}
                </h3>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full hover:bg-brand-bgbase flex items-center justify-center text-muted hover:text-main transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Logo Upload */}
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="w-20 h-20 rounded-2xl bg-brand-bgbase border-2 border-dashed border-border/50 hover:border-brand-neonblue flex items-center justify-center cursor-pointer transition-all overflow-hidden shrink-0 group"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <UploadCloud size={20} className="text-muted group-hover:text-brand-neonblue transition-colors" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-main mb-1">Brand Logo</p>
                    <p className="text-[10px] text-muted">JPG, PNG, or WEBP. Max 5MB.</p>
                    {logoPreview && (
                      <button
                        onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                        className="text-[10px] font-bold text-brand-crimson mt-1 hover:underline"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                  <input type="file" ref={logoInputRef} onChange={handleLogoChange} accept="image/jpeg,image/png,image/webp" className="hidden" />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Brand Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. NVIDIA, AMD, Corsair"
                    className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-sm text-main font-bold outline-none focus:border-brand-neonblue transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this brand..."
                    rows={3}
                    className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-sm text-main font-bold outline-none focus:border-brand-neonblue transition-colors resize-none"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-sm text-main font-bold outline-none focus:border-brand-neonblue transition-colors appearance-none cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/50 bg-brand-bgbase/50">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-muted hover:text-main border border-border/50 hover:border-brand-neonblue/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-brand-neonblue text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-brand-neonblue/20 transition-all flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {saving ? "Saving..." : (editingBrand ? "Update" : "Create")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BrandCard({ brand, index, onEdit, onDelete, onToggle, archived }) {
  const productCount = parseInt(brand.dataValues?.productCount || brand.productCount || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`bg-brand-surface border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-brand-neonblue/30 transition-all group ${archived ? 'opacity-60' : ''}`}
    >
      {/* Logo Area */}
      <div className="h-28 bg-brand-bgbase flex items-center justify-center relative overflow-hidden">
        {brand.logo ? (
          <img src={apiUrl(brand.logo)} alt={brand.name} className="w-full h-full object-contain p-4" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-brand-surface border border-border/50 flex items-center justify-center">
            <Tag size={24} className="text-muted/40" />
          </div>
        )}
        {/* Status badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
          brand.status === 'active' ? 'bg-green-500/15 text-green-500' : 'bg-amber-500/15 text-amber-500'
        }`}>
          {brand.status}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h4 className="text-sm font-black text-main uppercase tracking-wide truncate mb-1">{brand.name}</h4>
        <p className="text-[10px] text-muted truncate mb-3">{brand.description || "No description"}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted flex items-center gap-1">
            <Package size={10} /> {productCount} Products
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onToggle(brand)} title={archived ? "Activate" : "Archive"} className="w-7 h-7 rounded-lg bg-brand-bgbase hover:bg-amber-500/20 flex items-center justify-center text-muted hover:text-amber-500 transition-colors">
              {archived ? <RotateCcw size={12} /> : <Archive size={12} />}
            </button>
            <button onClick={() => onEdit(brand)} title="Edit" className="w-7 h-7 rounded-lg bg-brand-bgbase hover:bg-brand-neonblue/20 flex items-center justify-center text-muted hover:text-brand-neonblue transition-colors">
              <Edit3 size={12} />
            </button>
            <button onClick={() => onDelete(brand)} title="Delete" className="w-7 h-7 rounded-lg bg-brand-bgbase hover:bg-brand-crimson/20 flex items-center justify-center text-muted hover:text-brand-crimson transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
