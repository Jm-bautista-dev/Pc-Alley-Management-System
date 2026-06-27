// src/app/reports/stock/DeleteActionModal.js
"use client";

import { X, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { apiUrl } from "@/lib/api";

/**
 * Placeholder modal for confirming deletion of a product.
 * Props:
 *   - product: object to be deleted
 *   - isOpen: boolean
 *   - onClose: function
 *   - onSuccess: function called after successful deletion
 *   - user: current user (optional, for permission checks)
 */
export default function DeleteActionModal({ product, isOpen, onClose, onSuccess, user }) {
  const handleConfirm = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/products/${product.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess("Product deleted");
        onSuccess && onSuccess();
        onClose();
      } else {
        const err = await res.json();
        showError(err.error || "Delete failed");
      }
    } catch (e) {
      showError("Error deleting product");
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
          <h2 className="text-2xl font-rajdhani font-black uppercase text-main">Delete Product</h2>
          <button onClick={onClose} className="text-muted hover:text-main">
            <X size={20} />
          </button>
        </div>
        <p className="mb-6 text-sm">
          Are you sure you want to permanently delete <strong>{product?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded border border-border text-main">
            Cancel
          </button>
          <button onClick={handleConfirm} className="px-4 py-2 rounded bg-brand-crimson text-white">
            <Trash2 size={16} className="inline-block mr-1" /> Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
