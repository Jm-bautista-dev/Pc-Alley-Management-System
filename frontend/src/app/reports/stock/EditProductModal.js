// src/app/reports/stock/EditProductModal.js
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { apiUrl } from "@/lib/api";

export default function EditProductModal({ product, isOpen, onClose, onUpdate, branches }) {
  const [formData, setFormData] = useState({});
  const [stockData, setStockData] = useState({ branch_id: "", quantity: "" });
  const [updating, setUpdating] = useState(false);
  const [currentStock, setCurrentStock] = useState(0);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
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

  useEffect(() => {
    if (isOpen && product) {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      setUser(storedUser);
      setFormData({
        name: product.name || "",
        sku: product.sku || "",
        price: product.price || "",
        description: product.description || "",
        category_id: product.category_id || "",
      });
      setStockData({ 
        branch_id: storedUser?.role === "branch_admin" ? String(storedUser.branch_id) : (product.branch_id || ""), 
        quantity: product.stock ?? "" 
      });
      setCurrentStock(product.stock ?? 0);
    }
  }, [isOpen, product]);

  const handleSaveProduct = async () => {
    setUpdating(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/products/${product.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showSuccess("Product updated");
        onUpdate(await res.json());
      } else {
        showError("Failed to update product");
      }
    } catch (e) {
      showError("Error updating product");
    } finally {
      setUpdating(false);
      onClose();
    }
  };

  const handleAdjustStock = async () => {
    if (!stockData.branch_id || stockData.quantity === "") {
      showError("Select a branch and enter quantity");
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
          quantity: parseInt(stockData.quantity),
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
              <label className="block text-[10px] uppercase font-black text-muted mb-1">New Quantity</label>
              <input
                type="number"
                value={stockData.quantity}
                onChange={e => setStockData({ ...stockData, quantity: e.target.value })}
                min="0"
                className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2 text-sm font-bold"
              />
            </div>
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
