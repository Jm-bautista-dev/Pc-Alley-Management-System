"use client";

import { useState, useEffect } from 'react';
import { apiUrl } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, AlertCircle, ShoppingCart, Truck, Calculator } from 'lucide-react';

export default function RestockRequestModal({ inventoryItem, product: legacyProduct, onClose, onSuccess }) {
  // Polymorphic data resolution
  const product = inventoryItem?.Product || legacyProduct;
  const currentStock = inventoryItem ? (inventoryItem.quantity || 0) : (legacyProduct?.stock || 0);
  
  const [quantity, setQuantity] = useState(1);
  const [costPrice, setCostPrice] = useState(0);
  const [supplierId, setSupplierId] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unitPrice = parseFloat(product?.last_purchase_price || product?.price || 0);
    setCostPrice(unitPrice * parseInt(quantity || 0));
  }, [product, quantity]);

  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [user, setUser] = useState(null);
  
  const [analytics, setAnalytics] = useState({
    dailySales: 0,
    daysLeft: 0,
    suggestedQuantity: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    const branchId = targetBranchId || userData?.branch_id;
    if (userData?.role !== 'super_admin' && !targetBranchId) {
      setTargetBranchId(userData?.branch_id);
    }

    try {
      const [branchesRes, analyticsRes] = await Promise.all([
        fetch(apiUrl('/api/branches'), { headers: { Authorization: `Bearer ${token}` } }),
        branchId ? fetch(apiUrl(`/api/inventory/restock-analytics?product_id=${product.id}&branch_id=${branchId}`), {
          headers: { Authorization: `Bearer ${token}` }
        }) : Promise.resolve({ ok: false })
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
    
    if (user?.role === 'employee' || user?.role === 'staff') {
      toast.error('Access Denied: Staff members are not authorized to submit restock requests.');
      onClose();
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(apiUrl('/api/restock-requests'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: product.id,
          branch_id: targetBranchId,
          quantity: parseInt(quantity),
          cost_price: costPrice ? (parseFloat(costPrice) / parseInt(quantity)) : null,
          supplier_id: supplierId ? parseInt(supplierId) : null,
          notes
        })
      });

      if (res.ok) {
        toast.success('Restock request submitted successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to submit request');
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const estCover = analytics.dailySales > 0 
    ? Math.floor((currentStock + parseInt(quantity || 0)) / analytics.dailySales) 
    : '---';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-main/20 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-brand-bgbase border border-brand-border/20 rounded-[32px] w-full max-w-xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.5)] relative"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-neonblue/10 blur-[100px] pointer-events-none" />
        
        {/* Header */}
        <div className="p-8 border-b border-brand-border/10 relative bg-gradient-to-r from-brand-surface/30 to-transparent">
          <h3 className="text-2xl font-bebas tracking-[0.1em] text-brand-neonblue leading-none mb-2">RESTOCK PRODUCT</h3>
          <p className="text-xs text-brand-muted font-rajdhani font-black uppercase tracking-[0.2em]">{product.name}</p>
        </div>

        {/* Analytics Section */}
        <div className="p-8 pb-0 grid grid-cols-3 gap-4">
          <div className="bg-brand-surface/20 border border-brand-border/10 p-4 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Current Stock</p>
            <p className="text-xl font-rajdhani font-black text-main">{currentStock}</p>
          </div>
          <div className="bg-brand-surface/20 border border-brand-border/10 p-4 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Daily Sales</p>
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-brand-neonblue" />
              <p className="text-xl font-rajdhani font-black text-main">{analytics.dailySales}/d</p>
            </div>
          </div>
          <div className="bg-brand-surface/20 border border-brand-border/10 p-4 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-1">Days Left</p>
            <p className={`text-xl font-rajdhani font-black ${analytics.daysLeft < 7 ? 'text-brand-crimson' : 'text-emerald-400'}`}>
              {analytics.daysLeft === Infinity ? '---' : `${analytics.daysLeft} days`}
            </p>
          </div>
        </div>

        {/* Suggestion Box */}
        {analytics.suggestedQuantity > 0 && (
          <div className="px-8 mt-6">
            <div className="bg-brand-neonblue/10 border border-brand-neonblue/20 p-4 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Calculator size={48} />
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-neonblue/20 flex items-center justify-center text-brand-neonblue">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-brand-neonblue mb-0.5">SMART SUGGESTION</p>
                <p className="text-xs text-main font-medium">
                  SUGGESTED AMOUNT: <span className="font-black">{analytics.suggestedQuantity} UNITS</span>
                  <span className="text-brand-muted block text-[10px] uppercase tracking-wider mt-0.5">Based on your recent sales performance</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-rajdhani font-bold text-brand-muted mb-2 ml-1">
                Quantity to Add
              </label>
              <div className="relative group">
                <ShoppingCart size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-neonblue transition-colors" />
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-brand-surface/20 border border-brand-border/30 rounded-xl pl-12 pr-4 py-4 text-lg font-rajdhani font-black text-main focus:outline-none focus:border-brand-neonblue/50 transition-all placeholder:text-brand-muted/50"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-rajdhani font-bold text-brand-muted mb-2 ml-1">
                Total Estimated Cost
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-neonblue transition-colors font-bold text-lg">₱</span>
                <input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full bg-brand-surface/20 border border-brand-border/30 rounded-xl pl-12 pr-4 py-4 text-lg font-rajdhani font-black text-main focus:outline-none focus:border-brand-neonblue/50 transition-all placeholder:text-brand-muted/50"
                  placeholder="0.00"
                />
              </div>
              <div className="mt-2 ml-4 flex justify-between items-center">
                <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Unit Price:</span>
                <span className="text-[10px] font-black text-brand-muted font-rajdhani">₱{parseFloat(product.last_purchase_price || product.price || 0).toLocaleString()} / unit</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-rajdhani font-bold text-brand-muted mb-2 ml-1">
                Target Branch
              </label>
              <select
                disabled={user?.role !== 'super_admin'}
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full bg-brand-surface/20 border border-brand-border/30 rounded-xl px-4 py-4 text-sm font-bold text-main focus:outline-none focus:border-brand-neonblue/50 transition-all appearance-none"
              >
                <option value="" className="bg-brand-bgbase text-main">Select Branch...</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="bg-brand-bgbase text-main">{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* After Restock Summary */}
          <div className="bg-emerald-400/5 border border-emerald-400/10 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center text-emerald-400">
                <AlertCircle size={16} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">After Restock</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-main font-rajdhani">New Stock: {currentStock + parseInt(quantity || 0)}</p>
              <p className="text-[9px] font-bold text-brand-muted uppercase tracking-wider mb-0.5">EST COVER: {estCover} DAYS</p>
              <p className="text-[10px] font-black text-brand-neonblue uppercase tracking-widest">Total Value: ₱{parseFloat(costPrice || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-4 rounded-2xl border border-brand-border/20 text-[10px] font-black uppercase tracking-[0.3em] font-rajdhani text-main hover:bg-brand-surface/20 transition-all"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[1.5] px-8 py-4 bg-brand-neonblue text-white dark:text-brand-navy rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] font-rajdhani hover:opacity-90 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(10,65,116,0.2)]"
            >
              {loading ? 'PROCESSING...' : 'CONFIRM RESTOCK'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
