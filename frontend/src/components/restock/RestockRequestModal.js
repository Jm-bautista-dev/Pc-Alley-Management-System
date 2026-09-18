"use client";

import { useState, useEffect } from 'react';
import { apiUrl } from '../../lib/api';
import { showSuccess, showError } from "@/context/ModalContext";
import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle, ShoppingCart, Calculator, X } from 'lucide-react';

export default function RestockRequestModal({ inventoryItem, product: legacyProduct, onClose, onSuccess }) {
  // Polymorphic data resolution
  const product = inventoryItem?.Product || legacyProduct;
  const currentStock = inventoryItem
    ? (inventoryItem.quantity ?? 0)
    : (legacyProduct?.stock ?? 0);

  // The branch the item belongs to
  const itemBranchId = inventoryItem?.branch_id ?? legacyProduct?.branch_id;

  // Read user immediately
  const userData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })()
    : null;

  const isSuperAdmin = userData?.role === 'super_admin';

  const initialBranch = isSuperAdmin
    ? (itemBranchId ? String(itemBranchId) : '')
    : String(itemBranchId || userData?.branch_id || '');

  const [quantity, setQuantity]         = useState(1);
  const [costPrice, setCostPrice]       = useState(0);
  const [targetBranchId, setTargetBranchId] = useState(initialBranch);
  const [notes, setNotes]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [branches, setBranches]         = useState([]);
  const [user, setUser]                 = useState(userData);

  const [analytics, setAnalytics] = useState({
    dailySales: 0,
    daysLeft: 0,
    suggestedQuantity: 0
  });

  // Update cost price whenever quantity changes
  useEffect(() => {
    const unitPrice = parseFloat(product?.last_purchase_price || product?.price || 0);
    setCostPrice(unitPrice * parseInt(quantity || 0));
  }, [product, quantity]);

  // Fetch branches + restock analytics
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const u = typeof window !== 'undefined'
      ? (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })()
      : null;
    setUser(u);

    const resolvedBranch = initialBranch || u?.branch_id;

    try {
      const [branchesRes, analyticsRes] = await Promise.all([
        fetch(apiUrl('/api/branches'), { headers: { Authorization: `Bearer ${token}` } }),
        resolvedBranch && product?.id
          ? fetch(apiUrl(`/api/inventory/restock-analytics?product_id=${product.id}&branch_id=${resolvedBranch}`), {
              headers: { Authorization: `Bearer ${token}` }
            })
          : Promise.resolve({ ok: false })
      ]);

      if (branchesRes.ok) setBranches(await branchesRes.json());
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics({
          ...data,
          daysLeft: data.dailySales > 0 ? Math.floor(currentStock / data.dailySales) : Infinity
        });
        setQuantity(data.suggestedQuantity || 1);
      }
    } catch (err) {
      console.error("Failed to fetch restock data", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 1000000) {
      showError("Please enter a valid restock quantity between 1 and 1,000,000.");
      return;
    }

    const effectiveBranch = targetBranchId || (isSuperAdmin ? '' : String(user?.branch_id || ''));
    const branchId = parseInt(effectiveBranch);
    if (isNaN(branchId) || branchId < 1) {
      showError("No branch assigned. Please contact your administrator.");
      return;
    }

    if (!product?.id) {
      showError("Product information is missing. Please close and try again.");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(apiUrl('/api/product-requests'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: branchId,
          items: [
            {
              product_id: product.id,
              quantity_requested: qty
            }
          ],
          notes: (notes || "").trim().slice(0, 500),
          priority: 'normal'
        })
      });

      if (res.ok) {
        showSuccess('Restock request submitted successfully! Super Admin will review it on the Restock Desk.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const error = await res.json();
        showError(error.message || 'Failed to submit restock request');
      }
    } catch (err) {
      showError('An error occurred while submitting restock request.');
    } finally {
      setLoading(false);
    }
  };

  const estCover = analytics.dailySales > 0
    ? Math.floor((currentStock + parseInt(quantity || 0)) / analytics.dailySales)
    : '---';

  const assignedBranchName = branches.find(b => String(b.id) === String(targetBranchId))?.name || 'Your Branch';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-brand-surface border border-border rounded-2xl md:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-main max-h-[92vh] flex flex-col"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-neonblue/10 blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-border relative bg-brand-bgbase/30 flex items-start justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bebas tracking-[0.1em] text-brand-neonblue leading-none mb-1">REQUEST STOCK</h3>
            <p className="text-[11px] text-muted font-rajdhani font-bold uppercase tracking-[0.15em] line-clamp-1">{product?.name || 'Unknown Product'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted hover:text-main hover:bg-brand-hover transition-all"
          >
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1">
          {/* Top Analytics KPIs */}
          <div className="px-5 pt-3.5 sm:px-6 grid grid-cols-3 gap-2.5">
            <div className="bg-brand-bgbase/60 border border-border/80 p-2.5 sm:p-3 rounded-xl text-center sm:text-left">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5">Current Stock</p>
              <p className="text-base sm:text-lg font-rajdhani font-black text-main">{currentStock}</p>
            </div>
            <div className="bg-brand-bgbase/60 border border-border/80 p-2.5 sm:p-3 rounded-xl text-center sm:text-left">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5">Daily Sales</p>
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <TrendingUp size={13} className="text-brand-neonblue" />
                <p className="text-base sm:text-lg font-rajdhani font-black text-main">{analytics.dailySales}/d</p>
              </div>
            </div>
            <div className="bg-brand-bgbase/60 border border-border/80 p-2.5 sm:p-3 rounded-xl text-center sm:text-left">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-0.5">Days Left</p>
              <p className={`text-base sm:text-lg font-rajdhani font-black ${analytics.daysLeft < 7 ? 'text-rose-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
                {analytics.daysLeft === Infinity ? '---' : `${analytics.daysLeft} days`}
              </p>
            </div>
          </div>

          {/* Smart Suggestion Box */}
          {analytics.suggestedQuantity > 0 && (
            <div className="px-5 mt-3 sm:px-6">
              <div className="bg-brand-neonblue/10 border border-brand-neonblue/25 p-3 rounded-xl flex items-center gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-10 pointer-events-none">
                  <Calculator size={36} />
                </div>
                <div className="w-8 h-8 rounded-lg bg-brand-neonblue/20 flex items-center justify-center text-brand-neonblue shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8.5px] font-black uppercase tracking-[0.15em] text-brand-neonblue mb-0.5">SMART SUGGESTION</p>
                  <p className="text-xs text-main font-semibold leading-tight">
                    SUGGESTED AMOUNT: <span className="font-black text-brand-neonblue">{analytics.suggestedQuantity} UNITS</span>
                  </p>
                  <span className="text-muted block text-[9.5px] uppercase tracking-wider mt-0.5">Based on recent sales velocity</span>
                </div>
              </div>
            </div>
          )}

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="px-5 py-3.5 sm:px-6 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9.5px] uppercase tracking-wider font-bold text-muted mb-1.5 ml-0.5">
                  Quantity to Request
                </label>
                <div className="relative">
                  <ShoppingCart size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="number"
                    min="1"
                    max="1000000"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border rounded-xl pl-9 pr-3 py-2 text-sm font-rajdhani font-black text-main focus:outline-none focus:border-brand-neonblue transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] uppercase tracking-wider font-bold text-muted mb-1.5 ml-0.5">
                  Total Estimated Cost
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border rounded-xl pl-7 pr-3 py-2 text-sm font-rajdhani font-black text-main focus:outline-none focus:border-brand-neonblue transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div className="mt-1 flex justify-between items-center text-[9px] text-muted">
                  <span>Unit Price:</span>
                  <span className="font-semibold text-main">₱{parseFloat(product?.last_purchase_price || product?.price || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Branch Selection */}
            <div>
              <label className="block text-[9.5px] uppercase tracking-wider font-bold text-muted mb-1.5 ml-0.5">
                Target Branch
              </label>
              {isSuperAdmin ? (
                <select
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="w-full bg-brand-bgbase border border-border rounded-xl px-3 py-2 text-xs font-semibold text-main focus:outline-none focus:border-brand-neonblue transition-all"
                >
                  <option value="">Select Branch...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full bg-brand-bgbase border border-border rounded-xl px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-main">{assignedBranchName}</span>
                  </div>
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-muted px-2 py-0.5 bg-brand-surface rounded border border-border">YOUR BRANCH</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[9.5px] uppercase tracking-wider font-bold text-muted mb-1.5 ml-0.5">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={255}
                placeholder="Additional context for this request..."
                className="w-full bg-brand-bgbase border border-border rounded-xl px-3 py-2 text-xs font-medium text-main focus:outline-none focus:border-brand-neonblue transition-all resize-none placeholder:text-muted/60"
              />
            </div>

            {/* After Restock Summary */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <AlertCircle size={15} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">After Restock</p>
                  <p className="text-[9px] text-muted uppercase tracking-wide">EST COVER: {estCover} DAYS</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-main font-rajdhani">New Stock: {currentStock + parseInt(quantity || 0)}</p>
                <p className="text-[9.5px] font-black text-brand-neonblue uppercase tracking-wider">Total: ₱{parseFloat(costPrice || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-border text-[10px] font-black uppercase tracking-wider font-rajdhani text-main hover:bg-brand-hover transition-all"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[1.5] py-2.5 px-4 bg-brand-neonblue hover:bg-brand-neonblue/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider font-rajdhani transition-all disabled:opacity-50 shadow-md shadow-brand-neonblue/20"
              >
                {loading ? 'PROCESSING...' : 'REQUEST STOCK'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
