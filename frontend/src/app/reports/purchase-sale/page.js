"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { Repeat, ArrowUpRight, ArrowDownRight, Activity, TrendingUp, Download } from "lucide-react";
import { motion } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { useTheme } from "@/context/ThemeContext";

export default function PurchaseSalePage() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [dataSynced, setDataSynced] = useState(false);
  
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const handleSync = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const [salesRes, purchaseRes] = await Promise.all([
        fetch(apiUrl("/api/sales/history"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/restock-requests"), { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (salesRes.ok && purchaseRes.ok) {
        const salesData = await salesRes.json();
        setSales(Array.isArray(salesData) ? salesData : (salesData.data || []));
        setPurchases(await purchaseRes.json());
        setDataSynced(true);
        showSuccess("Synchronization Complete");
      } else {
        showError("Failed to sync matrix data");
      }
    } catch (err) {
      showError("Network Link Offline");
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount || sale.total_amount || 0), 0);
  
  // Purchases (Approved restocks cost)
  const totalPurchaseCost = purchases
    .filter(p => p.status === 'Approved')
    .reduce((sum, p) => sum + (Number(p.cost_price) * p.quantity), 0);

  const grossProfit = totalRevenue - totalPurchaseCost;
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : 0;

  return (
    <div className={`flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="PURCHASE & SALE" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 max-w-6xl mx-auto w-full">
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl md:text-3xl font-rajdhani font-black flex items-center gap-3 uppercase">
              <Repeat size={28} className="text-brand-neonblue" /> 
              Purchase & Sale <span className="text-brand-neonblue">Matrix</span>
            </h2>
            <button 
              onClick={handleSync} 
              disabled={loading}
              className="btn-premium px-6 py-2 flex items-center gap-2 text-xs"
            >
              <Activity size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Syncing..." : "Initialize Sync"}
            </button>
          </div>

          {!dataSynced ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="bg-brand-surface border border-border/50 rounded-3xl p-10 lg:p-20 shadow-sm flex flex-col items-center justify-center min-h-[500px]"
            >
              <Repeat size={64} className="text-brand-neonblue/20 mb-6" />
              <p className="text-main font-black text-sm md:text-lg text-center uppercase tracking-[4px]">Data Synchronization Required</p>
              <p className="text-muted text-[10px] md:text-xs mt-4 uppercase tracking-[2px] text-center max-w-md leading-relaxed">
                Analytical comparison between procurement costs and sales revenue requires an active matrix sync to fetch the latest telemetries.
              </p>
              <button onClick={handleSync} className="mt-8 px-8 py-3 bg-brand-bgbase border border-border rounded-full text-xs font-black uppercase tracking-widest hover:border-brand-neonblue/50 hover:text-brand-neonblue transition-colors">
                Pull Data Now
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Financial Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                
                {/* Total Revenue */}
                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ArrowUpRight size={64} className="text-green-500" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[2px] text-muted mb-2">Total Sales Revenue</h3>
                  <p className="text-3xl font-rajdhani font-black text-main tracking-tight">₱{totalRevenue.toLocaleString()}</p>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-3 flex items-center gap-1">
                    <TrendingUp size={12} /> {sales.length} Completed Orders
                  </p>
                </div>

                {/* Total Purchase Cost */}
                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ArrowDownRight size={64} className="text-brand-crimson" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[2px] text-muted mb-2">Total Procurement Cost</h3>
                  <p className="text-3xl font-rajdhani font-black text-main tracking-tight">₱{totalPurchaseCost.toLocaleString()}</p>
                  <p className="text-[10px] text-brand-crimson font-bold uppercase tracking-widest mt-3 flex items-center gap-1">
                    <TrendingUp size={12} /> Approved Restocks Only
                  </p>
                </div>

                {/* Gross Profit */}
                <div className="bg-brand-surface border border-brand-neonblue/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,242,255,0.05)] relative overflow-hidden">
                  <h3 className="text-[10px] font-black uppercase tracking-[2px] text-brand-neonblue mb-2">Gross Profit</h3>
                  <p className={`text-3xl font-rajdhani font-black tracking-tight ${grossProfit >= 0 ? 'text-main' : 'text-brand-crimson'}`}>
                    ₱{grossProfit.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-3">
                    Revenue Minus Procurement Cost
                  </p>
                </div>

                {/* Profit Margin */}
                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                  <h3 className="text-[10px] font-black uppercase tracking-[2px] text-muted mb-2">Overall Profit Margin</h3>
                  <p className={`text-3xl font-rajdhani font-black tracking-tight ${profitMargin >= 0 ? 'text-green-500' : 'text-brand-crimson'}`}>
                    {profitMargin}%
                  </p>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-3">
                    Return on Sales (ROS)
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6">
                   <h3 className="text-xs font-black uppercase tracking-[2px] text-main mb-6 border-b border-border/50 pb-4">Recent Sales Transactions</h3>
                   <div className="space-y-4">
                     {sales.slice(0, 5).map((sale) => (
                       <div key={sale.id} className="flex justify-between items-center bg-brand-bgbase/50 p-4 rounded-xl border border-border/30">
                         <div>
                           <p className="text-sm font-bold text-main">{sale.customer_name || 'Walk-in Customer'}</p>
                           <p className="text-[10px] font-black uppercase tracking-widest text-muted">{new Date(sale.createdAt).toLocaleDateString()} • {sale.SaleItems?.length || sale.OrderItems?.length || 0} items</p>
                         </div>
                         <p className="text-sm font-rajdhani font-black text-green-500">+₱{Number(sale.totalAmount || sale.total_amount || 0).toLocaleString()}</p>
                       </div>
                     ))}
                     {sales.length === 0 && <p className="text-xs text-muted uppercase tracking-widest text-center py-4 font-bold">No sales data found</p>}
                   </div>
                </div>

                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6">
                   <h3 className="text-xs font-black uppercase tracking-[2px] text-main mb-6 border-b border-border/50 pb-4">Recent Procurement (Restocks)</h3>
                   <div className="space-y-4">
                     {purchases.slice(0, 5).map((req) => (
                       <div key={req.id} className="flex justify-between items-center bg-brand-bgbase/50 p-4 rounded-xl border border-border/30">
                         <div>
                           <p className="text-sm font-bold text-main">{req.Product?.name}</p>
                           <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                             {req.quantity} Units • <span className={req.status === 'Approved' ? 'text-green-500' : 'text-yellow-500'}>{req.status}</span>
                           </p>
                         </div>
                         <p className={`text-sm font-rajdhani font-black ${req.status === 'Approved' ? 'text-brand-crimson' : 'text-muted'}`}>
                           -₱{(Number(req.cost_price) * req.quantity).toLocaleString()}
                         </p>
                       </div>
                     ))}
                     {purchases.length === 0 && <p className="text-xs text-muted uppercase tracking-widest text-center py-4 font-bold">No restock requests found</p>}
                   </div>
                </div>

              </div>

            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
