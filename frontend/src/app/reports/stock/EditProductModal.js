// src/app/reports/stock/EditProductModal.js
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Upload, ImageIcon, Trash2, RefreshCw, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { apiUrl } from "@/lib/api";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function EditProductModal({ product, isOpen, onClose, onUpdate, branches }) {
  const [formData, setFormData] = useState({});
  const [stockData, setStockData] = useState({ branch_id: "", quantity: "", price: "", enabled: true, low_stock_threshold: 5 });
  const [updating, setUpdating] = useState(false);
  const [currentStock, setCurrentStock] = useState(0);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [user, setUser] = useState(null);

  // Image management state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageChanged, setImageChanged] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchBrands();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/categories"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error("Failed to load categories:", e);
    }
  };

  const fetchBrands = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/brands/active"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setBrands(await res.json());
    } catch (e) {
      console.error("Failed to load brands:", e);
    }
  };

  useEffect(() => {
    if (isOpen && product) {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      setUser(storedUser);
      setFormData({
        name: product.name || "",
        sku: product.sku || "",
        price: product.global_price || product.price || "",
        description: product.description || "",
        category_id: product.category_id || "",
        brand_id: product.brand_id || "",
        barcode: product.barcode || "",
        specifications: product.specifications || "",
      });
      setStockData({ 
        branch_id: storedUser?.role === "branch_admin" ? String(storedUser.branch_id) : (product.branch_id || ""), 
        quantity: product.stock ?? "",
        price: product.branch_price !== null && product.branch_price !== undefined ? product.branch_price : "",
        enabled: product.enabled !== false,
        low_stock_threshold: product.low_stock_threshold ?? 5
      });
      setCurrentStock(product.stock ?? 0);

      // Reset image state
      setImageFile(null);
      setImagePreview(null);
      setRemoveImage(false);
      setImageChanged(false);
    }
  }, [isOpen, product]);

  // Derive the current display image URL
  const currentImageUrl = product?.image_url || product?.product_image || null;

  // Validate and set image file
  const handleImageSelect = useCallback((file) => {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      showError("Invalid file type. Only JPG, PNG, and WEBP images are supported.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    setImageChanged(true);

    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageSelect(file);
  }, [handleImageSelect]);

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
    setImageChanged(true);
  };

  const handleCancelImageChange = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setImageChanged(false);
  };

  // Build FormData for product save (supports image upload)
  const buildFormData = (includeFields = true) => {
    const fd = new FormData();

    if (includeFields) {
      if (formData.name) fd.append("name", formData.name);
      if (formData.sku) fd.append("sku", formData.sku);
      if (formData.price !== undefined && formData.price !== "") fd.append("price", formData.price);
      if (formData.description !== undefined) fd.append("description", formData.description);
      if (formData.category_id) fd.append("category_id", formData.category_id);
      if (formData.brand_id) fd.append("brand_id", formData.brand_id);
      if (formData.barcode !== undefined) fd.append("barcode", formData.barcode);
      if (formData.specifications !== undefined) fd.append("specifications", formData.specifications);
    }

    // Image handling
    if (imageFile) {
      fd.append("image", imageFile);
    } else if (removeImage) {
      fd.append("remove_image", "true");
    }

    return fd;
  };

  const handleSaveProduct = async () => {
    setUpdating(true);
    const token = localStorage.getItem("token");
    try {
      const fd = buildFormData(true);
      const res = await fetch(apiUrl(`/api/products/${product.id}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        showSuccess("Product updated");
        onUpdate(await res.json());
      } else {
        const err = await res.json();
        showError(err.error || "Failed to update product");
      }
    } catch (e) {
      showError("Error updating product");
    } finally {
      setUpdating(false);
      onClose();
    }
  };

  const handleUpdateImageOnly = async () => {
    if (!imageChanged) {
      showInfo("No image changes to save.");
      return;
    }
    setUpdating(true);
    const token = localStorage.getItem("token");
    try {
      const fd = buildFormData(false);
      const res = await fetch(apiUrl(`/api/products/${product.id}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        showSuccess(removeImage ? "Image removed" : "Image updated");
        onUpdate(await res.json());
        setImageChanged(false);
      } else {
        const err = await res.json();
        showError(err.error || "Failed to update image");
      }
    } catch (e) {
      showError("Error updating image");
    } finally {
      setUpdating(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!stockData.branch_id) {
      showError("Select a branch first");
      return;
    }
    setUpdating(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/inventory/stock"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          product_id: product.id,
          branch_id: stockData.branch_id,
          quantity: stockData.quantity !== "" ? parseInt(stockData.quantity) : undefined,
          price: stockData.price === "" ? null : parseFloat(stockData.price),
          enabled: stockData.enabled,
          low_stock_threshold: parseInt(stockData.low_stock_threshold)
        }),
      });
      if (res.ok) {
        showSuccess("Stock updated");
        onUpdate(product);
      } else {
        const err = await res.json();
        showError(err.error || "Failed to update stock");
      }
    } catch (e) {
      showError("Error updating stock");
    } finally {
      setUpdating(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Determine what image to display
  const displayImage = imagePreview || (!removeImage && currentImageUrl ? apiUrl(currentImageUrl) : null);
  const hasExistingImage = !!currentImageUrl && !removeImage && !imageFile;
  const hasNewImage = !!imageFile;
  const noImage = !displayImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-brand-surface border border-brand-neonblue/30 rounded-2xl p-6 lg:p-8 max-w-lg w-full shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-rajdhani font-black uppercase text-main">Edit Product</h2>
          <button onClick={onClose} className="text-muted hover:text-main">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* ─── Product Image Section ─── */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase font-black text-muted tracking-widest flex items-center gap-1.5">
                <Camera size={12} />
                Product Image
              </label>
              {imageChanged && (
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20 animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>

            <div
              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden ${
                isDragging
                  ? "border-brand-neonblue bg-brand-neonblue/5 scale-[1.01]"
                  : noImage
                  ? "border-border/50 hover:border-border bg-brand-bgbase/50"
                  : "border-border/30 bg-brand-bgbase/30"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {displayImage ? (
                /* ─── Image Preview ─── */
                <div className="relative group">
                  <div className="aspect-[16/10] w-full flex items-center justify-center bg-brand-bgbase/50 p-2">
                    <img
                      src={displayImage}
                      alt={formData.name || "Product"}
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  </div>

                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 rounded-xl">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-brand-neonblue text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-lg"
                    >
                      <RefreshCw size={12} />
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-700 transition-colors shadow-lg"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>

                  {/* New image badge */}
                  {hasNewImage && (
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/90 text-white shadow">
                        New Upload
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelImageChange}
                        className="w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                        title="Cancel image change"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ─── No Image Placeholder ─── */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[16/10] flex flex-col items-center justify-center gap-3 cursor-pointer group/upload"
                >
                  {/* First-letter avatar */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-neonblue/20 to-purple-500/20 border border-border/30 flex items-center justify-center text-2xl font-rajdhani font-black text-brand-neonblue/60 group-hover/upload:scale-110 transition-transform">
                    {(formData.name || "P").charAt(0).toUpperCase()}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-muted group-hover/upload:text-main transition-colors">
                      {isDragging ? "Drop image here" : "No product image"}
                    </p>
                    <p className="text-[9px] text-muted/60 mt-0.5">
                      Click or drag & drop • JPG, PNG, WEBP • Max 10MB
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-neonblue/10 border border-brand-neonblue/20 text-brand-neonblue text-[10px] font-black uppercase tracking-wider group-hover/upload:bg-brand-neonblue/20 transition-colors">
                    <Upload size={12} />
                    Upload Image
                  </div>
                </button>
              )}
            </div>

            {/* Quick action buttons below image when image changed */}
            {imageChanged && (
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={handleCancelImageChange}
                  className="text-[9px] font-bold text-muted hover:text-main transition-colors uppercase tracking-wider"
                >
                  Cancel Image Change
                </button>
                <button
                  type="button"
                  onClick={handleUpdateImageOnly}
                  disabled={updating}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600/90 text-white text-[9px] font-black uppercase tracking-wider hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  <Upload size={10} />
                  {updating ? "Saving..." : "Update Image Only"}
                </button>
              </div>
            )}
          </div>

          {/* ─── Product Details ─── */}
          <div>
            <label className="block text-[10px] uppercase font-black text-muted mb-1">Product Name</label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2 text-sm font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-black text-muted mb-1">Price (₱)</label>
              <input
                type="number"
                value={formData.price || ""}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-muted mb-1">Category</label>
              <select
                value={formData.category_id || ""}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2.5 text-sm font-bold appearance-none cursor-pointer"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-black text-muted mb-1">Brand</label>
              <select
                value={formData.brand_id || ""}
                onChange={e => setFormData({ ...formData, brand_id: e.target.value })}
                className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2 text-sm font-bold appearance-none cursor-pointer"
              >
                <option value="">Select Brand</option>
                {brands.map(br => (
                  <option key={br.id} value={br.id}>{br.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-muted mb-1">Barcode / UPC</label>
              <input
                type="text"
                value={formData.barcode || ""}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Barcode"
                className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-black text-muted mb-1">SKU</label>
            <input
              type="text"
              value={formData.sku || ""}
              readOnly
              className="w-full bg-brand-bgbase border border-border text-muted rounded-lg px-3 py-2 text-sm font-bold cursor-not-allowed opacity-75 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-black text-muted mb-1">Description</label>
            <textarea
              value={formData.description || ""}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2 text-sm font-bold resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-black text-muted mb-1">Specifications</label>
            <textarea
              value={formData.specifications || ""}
              onChange={e => setFormData({ ...formData, specifications: e.target.value })}
              placeholder="e.g. Dimensions, weight, socket types..."
              rows={2}
              className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2 text-sm font-bold resize-none"
            />
          </div>

          <hr className="border-border/50" />
          <h3 className="text-xs font-black uppercase tracking-widest text-brand-neonblue">Adjust Stock</h3>

          <div className="bg-brand-bgbase/50 border border-border/30 rounded-lg p-3 mb-3 text-xs">
            <span className="text-muted uppercase font-black tracking-wider">Current Stock: </span>
            <span className="text-main font-black text-lg ml-1">{currentStock}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-black text-muted mb-1">Branch</label>
              <select
                value={stockData.branch_id}
                onChange={e => setStockData({ ...stockData, branch_id: e.target.value })}
                disabled={user?.role === "branch_admin"}
                className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2 text-sm font-bold appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Select Branch</option>
                {(branches || []).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-muted mb-1">Set/Adjust Stock Quantity</label>
              <input
                type="number"
                value={stockData.quantity}
                onChange={e => setStockData({ ...stockData, quantity: e.target.value })}
                placeholder="Current: product.stock"
                className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-[10px] uppercase font-black text-muted mb-1">Branch Price Override (₱)</label>
              <input
                type="number"
                value={stockData.price}
                onChange={e => setStockData({ ...stockData, price: e.target.value })}
                placeholder={`Global: ₱${Number(product.global_price || product.price || 0).toLocaleString()}`}
                className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-muted mb-1">Low Stock Alert Threshold</label>
              <input
                type="number"
                value={stockData.low_stock_threshold}
                onChange={e => setStockData({ ...stockData, low_stock_threshold: e.target.value })}
                className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="flex items-center gap-2 cursor-pointer p-3 bg-brand-bgbase border border-border/50 rounded-lg">
              <input
                type="checkbox"
                checked={stockData.enabled}
                onChange={e => setStockData({ ...stockData, enabled: e.target.checked })}
                className="accent-brand-neonblue w-4 h-4"
              />
              <div>
                <span className="text-xs font-bold text-main">Visible & Enabled in POS</span>
                <p className="text-[9px] text-muted">If unchecked, this product will be hidden from staff and self-service order kiosks in this branch.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-muted hover:text-main text-xs font-bold uppercase tracking-wider">
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleAdjustStock}
              disabled={updating}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-black uppercase tracking-wider hover:bg-green-700 disabled:opacity-50"
            >
              Update Stock
            </button>
            <button
              onClick={handleSaveProduct}
              disabled={updating}
              className="px-4 py-2 rounded-lg bg-brand-neonblue text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 disabled:opacity-50"
            >
              Save Product
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
