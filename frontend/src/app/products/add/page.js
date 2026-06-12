"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Package, UploadCloud, Save, Image as ImageIcon, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

export default function AddPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [user, setUser] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    category_id: "",
    supplier_id: "",
    branch_id: "",
    initial_stock: "0"
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchCategoriesSuppliersAndBranches();
    // Get user info and pre-select branch if branch_admin
    const loggedInUser = JSON.parse(localStorage.getItem("user"));
    setUser(loggedInUser);
    if (loggedInUser && loggedInUser.role === 'branch_admin') {
      setFormData(prev => ({ ...prev, branch_id: String(loggedInUser.branch_id) }));
    }
  }, []);

  const fetchCategoriesSuppliersAndBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const [catRes, branchRes] = await Promise.all([
        fetch(apiUrl("/api/categories"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/branches"), { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (branchRes.ok) setBranches(await branchRes.json());
    } catch (err) {
      showError("Failed to fetch classification options.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [isDragging, setIsDragging] = useState(false);

  const processImageFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showError("File size exceeds 5MB limit."); return; }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) { showError("Unsupported format. Use JPG, PNG, or WEBP."); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e) => processImageFile(e.target.files[0]);
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); processImageFile(e.dataTransfer.files[0]); };
  const handleRemoveImage = (e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const triggerFileInput = () => fileInputRef.current?.click();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      showError("Please fill in Product Name and Price.");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("token");
    const submitData = new FormData();
    submitData.append("name", formData.name);
    submitData.append("description", formData.description);
    submitData.append("price", formData.price);
    if (formData.category_id) submitData.append("category_id", formData.category_id);
    if (formData.supplier_id) submitData.append("supplier_id", formData.supplier_id);
    if (formData.branch_id) submitData.append("branch_id", formData.branch_id);
    if (formData.initial_stock) submitData.append("initial_stock", formData.initial_stock);
    if (imageFile) submitData.append("image", imageFile);

    try {
      const res = await fetch(apiUrl("/api/products"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: submitData
      });

      if (res.ok) {
        showSuccess("Product created successfully!");
        setTimeout(() => router.push("/products"), 1500);
      } else {
        const errorData = await res.json();
        // Handle both express-validator error arrays and plain error strings
        if (errorData.errors && Array.isArray(errorData.errors)) {
          showError(errorData.errors.map(e => e.msg).join(", "));
        } else {
          showError(errorData.error || errorData.message || "Failed to create product.");
        }
        setLoading(false);
      }
    } catch (err) {
      showError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={`flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="ADD NEW PRODUCT" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 w-full max-w-6xl mx-auto">
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Link href="/products" className="w-10 h-10 rounded-full bg-brand-surface border border-border/50 flex items-center justify-center text-muted hover:text-main hover:border-brand-neonblue/50 transition-colors">
                <ArrowLeft size={18} />
              </Link>
              <div>
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">Inventory Management</motion.h2>
                <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-rajdhani font-black tracking-tight text-main uppercase">
                  Add <span className="text-brand-neonblue">Product</span>
                </motion.h1>
              </div>
            </div>
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="bg-brand-neonblue text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-brand-neonblue/20 transition-all flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? "Saving..." : "Save Product"}
            </button>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-main mb-6 flex items-center gap-2 border-b border-border/50 pb-4">
                  <Package size={16} className="text-brand-neonblue" /> Basic Information
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Product Name *</label>
                    <input 
                      type="text" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. NVIDIA RTX 4090 Founders Edition" 
                      className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-sm text-main font-bold outline-none focus:border-brand-neonblue transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Selling Price (₱) *</label>
                    <input 
                      type="number" 
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0.00" 
                      step="0.01"
                      min="0"
                      className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-sm text-main font-bold outline-none focus:border-brand-neonblue transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Product Description</label>
                    <textarea 
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Write a detailed description..." 
                      rows={5}
                      className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-sm text-main font-bold outline-none focus:border-brand-neonblue transition-colors resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Media & Classification */}
            <div className="space-y-6">
              {/* Product Image */}
              <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-main mb-6 flex items-center gap-2 border-b border-border/50 pb-4">
                  <ImageIcon size={16} className="text-brand-neonpurple" /> Product Image
                </h3>
                <div 
                  onClick={triggerFileInput}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full aspect-square bg-brand-bgbase border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${
                    isDragging ? 'border-brand-neonblue bg-brand-neonblue/10 scale-[1.02]' : 'border-border/50 hover:border-brand-neonblue hover:bg-brand-neonblue/5'
                  }`}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-3">
                        <span className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 bg-brand-surface/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                          <UploadCloud size={14} /> Change Image
                        </span>
                        <button onClick={handleRemoveImage} className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 bg-brand-crimson/80 hover:bg-brand-crimson px-4 py-2 rounded-full shadow-lg transition-colors border border-brand-crimson/20">
                          <Trash2 size={14} /> Remove Image
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6 pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-brand-surface shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform text-muted group-hover:text-brand-neonblue">
                        <UploadCloud size={24} />
                      </div>
                      <p className="text-xs font-bold text-main mb-1">Drag &amp; Drop or Click to upload</p>
                      <p className="text-[10px] text-muted uppercase tracking-widest">JPG, JPEG, PNG, or WEBP (max. 5MB)</p>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/jpeg,image/png,image/webp" className="hidden" />
                </div>
              </div>

              {/* Classification */}
              <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-main mb-6 flex items-center gap-2 border-b border-border/50 pb-4">
                  <Package size={16} className="text-green-500" /> Classification
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Category</label>
                    <select 
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-sm text-main font-bold outline-none focus:border-brand-neonblue transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Target Branch</label>
                    <select 
                      name="branch_id"
                      value={formData.branch_id}
                      onChange={handleChange}
                      disabled={user?.role === 'branch_admin'}
                      className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-sm text-main font-bold outline-none focus:border-brand-neonblue transition-colors appearance-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      <option value="">All Branches</option>
                      {branches.map(br => (
                        <option key={br.id} value={br.id}>{br.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Initial Stock Quantity</label>
                    <input 
                      type="number"
                      name="initial_stock"
                      value={formData.initial_stock}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      className="w-full bg-brand-bgbase border border-border/50 rounded-xl px-4 py-3 text-sm text-main font-bold outline-none focus:border-brand-neonblue transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
