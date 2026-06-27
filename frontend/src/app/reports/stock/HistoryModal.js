// src/app/reports/stock/HistoryModal.js
"use client";

import { X } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Placeholder modal to display product history.
 * Props:
 *   - product: object (used to show basic info)
 *   - isOpen: boolean
 *   - onClose: function
 */
export default function HistoryModal({ product, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-brand-surface border border-brand-neonblue/30 rounded-2xl p-6 lg:p-8 max-w-lg w-full shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-rajdhani font-black uppercase text-main">Product History</h2>
          <button onClick={onClose} className="text-muted hover:text-main">
            <X size={20} />
          </button>
        </div>
        {/* Simple placeholder content */}
        <div className="space-y-2">
          <p><strong>Name:</strong> {product?.name}</p>
          <p><strong>SKU:</strong> {product?.sku}</p>
          <p><strong>Category:</strong> {product?.category}</p>
          <p className="text-sm text-muted">(History details would be loaded here.)</p>
        </div>
        <button onClick={onClose} className="mt-6 w-full py-2 rounded bg-brand-neonblue text-white font-black">
          Close
        </button>
      </motion.div>
    </div>
  );
}
