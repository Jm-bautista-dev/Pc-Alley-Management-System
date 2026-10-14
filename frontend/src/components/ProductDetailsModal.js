"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Package, Tag, Layers, Barcode, Hash, Copy, Check,
  Cpu, HardDrive, Database, Monitor, Zap, Sliders, ExternalLink,
  Store, Building2
} from "lucide-react";
import { resolveProductImageUrl, handleProductImageError } from "@/lib/imageHelper";
import { parseProductSpecs, formatSpecsForExport } from "@/lib/hardwareSpecs";
import { apiUrl } from "@/lib/api";

export default function ProductDetailsModal({
  product = null,
  isOpen = false,
  onClose = () => {},
  onEdit = null
}) {
  const [copied, setCopied] = useState(false);
  const [branchStocks, setBranchStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(false);

  useEffect(() => {
    if (!isOpen || !product?.id) {
      setBranchStocks([]);
      return;
    }

    let isMounted = true;
    const fetchBranchStock = async () => {
      setLoadingStocks(true);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const res = await fetch(apiUrl(`/api/products/${product.id}/stock`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setBranchStocks(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Failed to load branch stocks:", e);
      } finally {
        if (isMounted) setLoadingStocks(false);
      }
    };

    fetchBranchStock();
    return () => { isMounted = false; };
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  const parsedSpecs = parseProductSpecs(product.specifications);
  const isObjectSpecs = typeof parsedSpecs === "object" && parsedSpecs !== null;

  const totalStockCount = branchStocks.length > 0
    ? branchStocks.reduce((sum, b) => sum + (Number(b.stock) || 0), 0)
    : (product.stockSummary?.totalStock ?? product.available_quantity ?? 0);

  const handleCopySpecs = () => {
    const formatted = formatSpecsForExport(product.specifications);
    if (!formatted) return;
    navigator.clipboard.writeText(`${product.name}\n${formatted}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSpecCategoryIcon = (key) => {
    const k = key.toLowerCase();
    if (k.includes("socket") || k.includes("core") || k.includes("clock") || k.includes("cpu")) return <Cpu size={14} className="text-brand-neonblue" />;
    if (k.includes("vram") || k.includes("gpu") || k.includes("graphics")) return <Zap size={14} className="text-amber-500" />;
    if (k.includes("capacity") || k.includes("speed") || k.includes("ram") || k.includes("memory")) return <Database size={14} className="text-emerald-500" />;
    if (k.includes("ssd") || k.includes("storage") || k.includes("read") || k.includes("write")) return <HardDrive size={14} className="text-purple-500" />;
    if (k.includes("resolution") || k.includes("screen") || k.includes("hz") || k.includes("panel")) return <Monitor size={14} className="text-cyan-500" />;
    return <Sliders size={14} className="text-muted" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-brand-surface border border-border rounded-3xl max-w-3xl w-full shadow-2xl relative overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="relative p-6 md:p-8 border-b border-border/40 bg-brand-bgbase/40">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl bg-brand-surface/80 hover:bg-brand-surface border border-border/40 text-muted hover:text-main transition-colors shadow-sm"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Image Preview */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-border/60 bg-brand-bgbase flex-shrink-0 flex items-center justify-center relative shadow-sm">
              <Package size={32} className="text-muted/40" />
              {resolveProductImageUrl(product, "medium") && (
                <img
                  src={resolveProductImageUrl(product, "medium")}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={handleProductImageError}
                />
              )}
            </div>

            {/* Product Title & Identifiers */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {product.Brand && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-brand-neonblue bg-brand-neonblue/10 px-2.5 py-0.5 rounded-full border border-brand-neonblue/20">
                    <Tag size={10} /> {product.Brand.name}
                  </span>
                )}
                {product.Category && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted bg-brand-bgbase px-2.5 py-0.5 rounded-full border border-border/40">
                    <Layers size={10} /> {product.Category.name}
                  </span>
                )}
                <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  product.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted/10 text-muted'
                }`}>
                  {product.status || 'Active'}
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-rajdhani font-black text-main tracking-tight uppercase leading-tight">
                {product.name}
              </h2>

              <div className="flex items-center gap-4 mt-2 text-xs text-muted font-mono flex-wrap">
                <span className="flex items-center gap-1">
                  <Hash size={12} /> {product.sku}
                </span>
                {product.barcode && (
                  <span className="flex items-center gap-1 bg-brand-bgbase px-2 py-0.5 rounded border border-border/40 text-[11px] text-brand-neonblue">
                    <Barcode size={12} /> {product.barcode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Quick Metrics: Unit Price, Selling Price & Available Stock Aligned */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-brand-bgbase/40 border border-border/40 flex flex-col justify-between">
              <span className="text-[10px] font-black text-muted uppercase tracking-[2px] block mb-1">Unit Price</span>
              <span className="text-xl font-rajdhani font-black text-main">
                ₱{(Number(product.last_purchase_price ?? product.unit_price ?? 0) > 0
                  ? Number(product.last_purchase_price ?? product.unit_price)
                  : ((Number(product.price ?? 0) > 0 ? Number(product.price) : (Number(branchStocks.find(b => Number(b.price) > 0)?.price) || 0)) * 0.75)
                ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-brand-bgbase/40 border border-border/40 flex flex-col justify-between">
              <span className="text-[10px] font-black text-muted uppercase tracking-[2px] block mb-1">Selling Price</span>
              <span className="text-xl font-rajdhani font-black text-brand-crimson">
                ₱{(Number(product.price ?? 0) > 0 
                  ? Number(product.price) 
                  : (Number(branchStocks.find(b => Number(b.price) > 0)?.price) || 0)
                ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-brand-bgbase/40 border border-border/40 flex flex-col justify-between">
              <span className="text-[10px] font-black text-muted uppercase tracking-[2px] block mb-1">Available Stock</span>
              <span className="text-xl font-rajdhani font-black text-main">
                {totalStockCount.toLocaleString()} units
              </span>
            </div>
          </div>

          {/* Description if present */}
          {product.description && (
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[2px] text-muted mb-2">Description</h4>
              <p className="text-xs text-main/80 leading-relaxed bg-brand-bgbase/30 p-4 rounded-2xl border border-border/30 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Branch Stock Breakdown Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase tracking-[2px] text-main flex items-center gap-2">
                <Store size={14} className="text-brand-neonblue" /> Branch Stock Availability
              </h4>
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                {branchStocks.length > 0 ? `${branchStocks.length} Branches Tracked` : "Branch Breakdown"}
              </span>
            </div>

            {loadingStocks ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-2xl bg-brand-bgbase/40 border border-border/40 animate-pulse h-20" />
                ))}
              </div>
            ) : branchStocks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {branchStocks.map(b => {
                  const stockNum = Number(b.stock) || 0;
                  const threshold = Number(b.low_stock_threshold) || 5;
                  const isLow = stockNum > 0 && stockNum <= threshold;
                  const isOut = stockNum === 0;
                  const statusLabel = isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock";
                  const badgeStyle = isOut
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : isLow
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

                  return (
                    <div
                      key={b.branch_id}
                      className="p-3.5 rounded-2xl bg-brand-bgbase/60 border border-border/40 flex flex-col justify-between hover:border-brand-neonblue/30 transition-all shadow-sm group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-black font-rajdhani text-main uppercase tracking-wider group-hover:text-brand-neonblue transition-colors truncate">
                          {b.branch_name}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${badgeStyle}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-rajdhani font-black text-main">
                          {stockNum.toLocaleString()}{" "}
                          <span className="text-[11px] font-bold text-muted uppercase">units</span>
                        </span>
                        {b.price && (
                          <span className="text-[11px] font-mono text-muted/80 font-bold" title="Branch Custom Price">
                            ₱{Number(b.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-border/40 text-center text-xs text-muted">
                No branch inventory recorded for this product.
              </div>
            )}
          </div>

          {/* Technical Specifications Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase tracking-[2px] text-main flex items-center gap-2">
                <Sliders size={14} className="text-brand-neonblue" /> Technical Specifications
              </h4>

              {parsedSpecs && (
                <button
                  type="button"
                  onClick={handleCopySpecs}
                  className="text-xs font-bold text-brand-neonblue hover:text-blue-500 transition-colors flex items-center gap-1.5 uppercase tracking-wider"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy Specs"}
                </button>
              )}
            </div>

            {isObjectSpecs && Object.keys(parsedSpecs).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(parsedSpecs).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-3.5 rounded-2xl bg-brand-bgbase/60 border border-border/40 hover:border-brand-neonblue/30 transition-colors flex items-start justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-brand-surface border border-border/40 flex items-center justify-center shrink-0">
                        {getSpecCategoryIcon(key)}
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-muted">
                        {key}
                      </span>
                    </div>
                    <span className="text-xs font-bold font-mono text-main text-right break-words max-w-[60%]">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            ) : typeof parsedSpecs === "string" && parsedSpecs.trim() ? (
              <div className="p-4 rounded-2xl bg-brand-bgbase/40 border border-border/40 text-xs font-mono text-main whitespace-pre-line leading-relaxed">
                {parsedSpecs}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-border/50 text-center bg-brand-bgbase/20">
                <Sliders size={28} className="text-muted/40 mx-auto mb-2" />
                <p className="text-xs font-bold text-muted uppercase">No Technical Specifications Recorded</p>
                <p className="text-[10px] text-muted/60 mt-1">
                  Add component details via the Edit Product screen.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 md:px-8 py-4 border-t border-border/40 bg-brand-bgbase/30 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="btn-ghost px-5 py-2.5 text-xs font-bold uppercase tracking-wider border border-border/50 rounded-xl"
          >
            Close
          </button>

          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="bg-brand-neonblue text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md shadow-brand-neonblue/20"
            >
              Edit Product & Specs
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
