// src/app/reports/stock/EditProductModal.js
"use client";

import { useState, useEffect, useRef } from "react";
import { X, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { apiUrl } from "@/lib/api";

/**
 * Simple placeholder modal for editing a product.
 * Props:
 *   - product: object with existing product data
 *   - isOpen: boolean
 *   - onClose: function
 *   - onUpdate: function(updatedProduct)
 */
export default function EditProductModal({ product, isOpen, onClose, onUpdate }) {
  const [formData, setFormData] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        name: product.name || "",
        sku: product.sku || "",
        price: product.price || "",
        description: product.description || "",
        category_id: product.category_id || "",
      });
    }
  }, [isOpen, product]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/api/products/${product.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const updated = await res.json();
        toast.success("Product updated");
        onUpdate(updated);
        onClose();
      } else {
        toast.error("Failed to update product");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error updating product");
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
        {/* Simple form – only a few fields for demo */}
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-black text-muted mb-1">Name</label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-black text-muted mb-1">Price</label>
            <input
              type="number"
              value={formData.price || ""}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              className="w-full bg-brand-bgbase border border-border text-main rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded border border-border text-main">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-brand-neonblue text-white">
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
