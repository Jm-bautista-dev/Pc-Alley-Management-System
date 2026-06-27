"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import RestockRequestModal from "@/components/restock/RestockRequestModal";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Search, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  ChevronDown,
  Activity,
  ArrowRight
} from "lucide-react";

const PesoSign = ({ size }) => <span style={{ fontSize: size }} className="font-bold">₱</span>;
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { apiUrl, getApiErrorMessage } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { getChartTheme } from "@/lib/chartTheme";
import { exportToExcel } from "@/lib/excelExport";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [adjustValue, setAdjustValue] = useState(0);
  const [adjustThreshold, setAdjustThreshold] = useState(5);
  const [restockItem, setRestockItem] = useState(null);
  const { theme } = useTheme();
  const chartTheme = getChartTheme(theme);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
    if (userData?.role === 'super_admin') {
      fetchBranches();
    }
    fetchInventory();
  }, [selectedBranch]);

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setBranches(data);
      } else {
        showError(data.message || "Branch Connection Failed");
      }
    } catch (err) {
      console.error("Branch Link Failure:", err);
      showError(getApiErrorMessage(err, "Assigned branches could not be synced."));
    }
  };

  const fetchInventory = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      let url = apiUrl("/api/inventory");
      if (selectedBranch) url += `?branch_id=${selectedBranch}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      const raw = await res.json();
        // API returns an envelope with a 'data' array; fallback to empty array if missing
        const items = raw.data ?? [];
        if (res.ok) {
          setInventory(items);
        } else {
          showError(raw.message || "Access Denied");
        }
    } catch (err) {
      console.error("Matrix Sync Failure:", err);
      showError(getApiErrorMessage(err, "Cannot load inventory list."));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/inventory/stock"), {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: editingItem.Product.id,
          branch_id: editingItem.branch_id,
          quantity: parseInt(adjustValue),
          low_stock_threshold: parseInt(adjustThreshold)
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        showSuccess("Stock levels updated.");
        fetchInventory();
      } else {
        const data = await res.json();
        showError(data.errors?.[0]?.quantity || data.message || "Matrix Sync Conflict.");
      }
    } catch (err) {
      showError(getApiErrorMessage(err, "System error: cannot reach server."));
      console.error("Pulse Modulation Error:", err);
    }
  };

  const handleExport = () => {
    const exportData = displayData.map(item => {
      const data = {
        'SKU': item.Product?.sku,
        'Product Name': item.Product?.name,
        'Category': item.Product?.Category?.name,
        'Total Quantity': isConsolidated ? item.totalStock : item.quantity,
      };

      if (isConsolidated) {
        branches.forEach(b => {
          data[b.name] = item.branchStocks[b.id] || 0;
        });
      } else {
        data['Store'] = item.Branch?.name;
      }

      return data;
    });

    const exportOptions = {
      title: 'PC ALLEY - CONSOLIDATED INVENTORY MATRIX',
      subtitle: `Context: ${selectedBranch ? branches.find(b => b.id == selectedBranch)?.name : 'Global Network'} | Generated by: ${user?.name}`,
      summary: {
        'Total Inventory Items': stats.totalItems,
        'Active Categories': stats.categories,
        'Stock Alert Nodes': stats.criticalNodes,
        'Network Valuation': `₱${(stats.valuation / 1000000).toFixed(2)}M`
      }
    };

    try {
      exportToExcel(exportData, `PCA_Inventory_${isConsolidated ? 'Global' : 'Sector'}_Matrix`, 'Stock', exportOptions);
      showSuccess("Excel Matrix Exported");
    } catch (e) {
      showError("Export Protocol Failure");
    }
  };

  const openAdjustModal = (item) => {
    setEditingItem(item);
    setAdjustValue(item.quantity);
    setAdjustThreshold(item.low_stock_threshold || 5);
    setIsModalOpen(true);
  };

  const filteredInventory = inventory.filter(item => {
    const productName = item.Product?.name || "";
    const productSku = item.Product?.sku || "";
    const query = searchQuery.trim().toLowerCase();
    
    return productName.toLowerCase().includes(query) ||
           productSku.toLowerCase().includes(query);
  });

  // Consolidated Matrix View Logic (Super Admin + All Sectors)
  const isConsolidated = !selectedBranch && user?.role === 'super_admin';
  const canEditStock = user?.role === 'super_admin' || user?.role === 'branch_admin';
  
  const consolidatedMap = filteredInventory.reduce((acc, item) => {
    const pid = item.Product?.id;
    if (!pid) return acc;
    if (!acc[pid]) {
      acc[pid] = {
        ...item,
        branchStocks: branches.reduce((bAcc, b) => ({ ...bAcc, [b.id]: 0 }), {}),
        totalStock: 0
      };
    }
    acc[pid].branchStocks[item.branch_id] = item.quantity;
    acc[pid].totalStock += item.quantity;
    return acc;
  }, {});

  const displayData = isConsolidated ? Object.values(consolidatedMap) : filteredInventory;

  const stats = {
    totalItems: inventory.reduce((acc, curr) => acc + curr.quantity, 0),
    criticalNodes: inventory.filter(p => p.quantity <= p.low_stock_threshold).length,
    valuation: inventory.reduce((acc, curr) => acc + (curr.quantity * (curr.Product?.price || 0)), 0),
    categories: [...new Set(inventory.map(p => p.Product?.Category?.name).filter(Boolean))].length
  };

  const barData = {
    labels: [...new Set(inventory.map(p => p.Product?.Category?.name).filter(Boolean))],
    datasets: [
      {
        label: 'Stock Level',
        data: [...new Set(inventory.map(p => p.Product?.Category?.name).filter(Boolean))].map(cat => 
           inventory.filter(p => p.Product?.Category?.name === cat).reduce((a, b) => a + b.quantity, 0)
        ),
        backgroundColor: 'rgba(0, 242, 255, 0.2)',
        borderColor: '#00F2FF',
        borderWidth: 1,
        borderRadius: 8,
        hoverBackgroundColor: 'rgba(0, 242, 255, 0.4)',
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { grid: { color: chartTheme.gridColor }, ticks: { color: chartTheme.tickColor } },
      x: { grid: { display: false }, ticks: { color: chartTheme.tickColor } }
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="INVENTORY" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container">
            
            {/* Sector Identity Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-[10px] font-black tracking-[4px] uppercase text-muted/60 mb-1">Stock Protocol</h2>
                <div className="flex items-center gap-3">
                  <h1 className="text-h1 mb-0">
                    {user?.role === 'super_admin' ? (selectedBranch ? branches.find(b => b.id == selectedBranch)?.name : 'GLOBAL') : user?.branch_name}
                  </h1>
                  <div className="px-3 py-1 bg-brand-neonblue/10 border border-brand-neonblue/20 rounded-full">
                    <span className="text-[9px] font-black text-brand-neonblue uppercase tracking-widest">Active Store</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => window.location.href = "/products"} 
                className="btn-premium h-12 px-8"
              >
                 Manage Products
              </button>
            </div>
          
          {/* Header Stats */}
          <div className="responsive-grid mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-surface/80 border border-border rounded-2xl p-4 md:p-6 relative overflow-hidden group">
               <h3 className="text-[9px] md:text-[10px] font-black tracking-[2px] uppercase text-muted mb-2 md:mb-3">Stock Count</h3>
               <div className="text-2xl md:text-3xl font-rajdhani font-bold text-main tracking-tight mb-1 md:mb-2">{stats.totalItems.toLocaleString()}</div>
               <p className="text-[9px] md:text-[10px] text-muted/40 uppercase font-bold tracking-widest">Total items in stock</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-brand-surface/80 border border-border rounded-2xl p-5 md:p-6 relative overflow-hidden group">
               <h3 className="text-[9px] md:text-[10px] font-black tracking-[2px] uppercase text-brand-crimson/60 mb-2 md:mb-3">Low Stock Alerts</h3>
               <div className="text-2xl md:text-3xl font-rajdhani font-bold text-main tracking-tight mb-1 md:mb-2">{stats.criticalNodes}</div>
               <p className="text-[9px] md:text-[10px] text-muted/40 uppercase font-bold tracking-widest">Need restock</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-brand-surface/80 border border-border rounded-2xl p-5 md:p-6 relative overflow-hidden group">
               <h3 className="text-[9px] md:text-[10px] font-black tracking-[2px] uppercase text-brand-neonpurple/60 mb-2 md:mb-3">Categories</h3>
               <div className="text-2xl md:text-3xl font-rajdhani font-bold text-main tracking-tight mb-1 md:mb-2">{stats.categories}</div>
               <p className="text-[9px] md:text-[10px] text-muted/40 uppercase font-bold tracking-widest">Active category list</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-brand-surface/80 border border-border rounded-2xl p-5 md:p-6 relative overflow-hidden group">
               <h3 className="text-[9px] md:text-[10px] font-black tracking-[2px] uppercase text-muted mb-2 md:mb-3">Total Value</h3>
               <div className="text-2xl md:text-3xl font-rajdhani font-bold text-main tracking-tight mb-1 md:mb-2">₱{(stats.valuation / 1000000).toFixed(1)}M</div>
               <p className="text-[9px] md:text-[10px] text-muted/40 uppercase font-bold tracking-widest">Total inventory value</p>
            </motion.div>
          </div>

          {/* Admin Controls & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-brand-surface p-1.5 rounded-2xl border border-border/50 shadow-sm"
            >
               {user?.role === 'super_admin' && (
                 <div className="flex items-center">
                    <div className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-muted border-r border-border/50 hidden md:block">
                      Context
                    </div>
                    <div className="relative group min-w-[180px]">
                        <select 
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          className="w-full appearance-none bg-transparent py-2.5 pl-5 pr-10 text-[11px] text-main focus:outline-none transition-all font-black cursor-pointer"
                        >
                          <option value="" className="bg-brand-surface">Global Network</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id} className="bg-brand-surface">{b.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/40 pointer-events-none group-hover:text-brand-neonblue transition-colors" />
                    </div>
                 </div>
               )}
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex items-center gap-3"
            >
               <button onClick={() => fetchInventory()} className="btn-neon">
                  <Activity size={14} className="group-hover:text-brand-neonblue transition-colors" />
                  <span>Refresh List</span>
               </button>
               <button 
                 onClick={handleExport}
                 className="bg-brand-bgbase border border-border text-muted hover:text-main px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-brand-surface"
               >
                  <ArrowRight size={14} className="rotate-[-90deg] text-brand-neonblue" />
                  <span>Export Excel</span>
               </button>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Sector Matrix Chart */}
            <motion.div 
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               className="lg:col-span-2 bg-brand-surface border border-border rounded-2xl p-8 lg:p-10 flex flex-col shadow-sm"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-brand-neonblue/20 rounded-full" />
                  <h3 className="text-sm font-rajdhani font-bold uppercase text-main tracking-wider">Inventory Overview</h3>
                </div>
              </div>
              <div className="h-64 w-full">
                {stats.categories > 0 ? (
                  <Bar data={barData} options={barOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-[10px] font-black uppercase text-muted/20 tracking-[4px]">No Data Stream</div>
                )}
              </div>
            </motion.div>

            {/* Restock Priority */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-brand-surface/80 border-border rounded-2xl p-8 lg:p-10 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-brand-crimson/50 rounded-full" />
                  <h3 className="text-sm font-rajdhani font-bold uppercase text-main tracking-wider">Restock List</h3>
                </div>
              </div>
              <div className="space-y-4 overflow-y-auto no-scrollbar flex-1">
                {inventory.filter(i => i.quantity <= i.low_stock_threshold).slice(0, 4).map((item, i) => (
                  <div key={i} onClick={() => openAdjustModal(item)} className="p-4 bg-brand-bgbase border border-border rounded-2xl group hover:border-brand-crimson/30 transition-all cursor-pointer shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="text-[11px] font-bold text-muted group-hover:text-main transition-colors capitalize">{item.Product?.name}</h4>
                       <span className="text-[8px] font-black uppercase tracking-widest text-brand-crimson">LOW PULSE</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <p className="text-[13px] font-black text-main">{item.quantity} Units</p>
                        <div className="w-16 h-1 bg-brand-surface rounded-full overflow-hidden">
                          <div className="h-full bg-brand-crimson" style={{ width: `${(item.quantity / (item.low_stock_threshold || 5)) * 100}%` }} />
                       </div>
                    </div>
                  </div>
                ))}
                 {stats.criticalNodes === 0 && (
                    <div className="h-full flex items-center justify-center text-center opacity-40">
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-muted">All sectors stable</p>
                    </div>
                 )}
              </div>
            </motion.div>
          </div>

          {/* Matrix Registry */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-brand-surface border border-border/50 rounded-[40px] p-8 lg:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10">
               <div className="flex items-center gap-4">
                 <div className="w-1.5 h-6 bg-brand-neonblue rounded-full shadow-[0_0_12px_rgba(0,242,255,0.4)]" />
                 <div>
                   <h3 className="text-lg font-rajdhani font-black uppercase text-main tracking-[2px]">Inventory Items</h3>
                <p className="text-[10px] text-main/40 font-black uppercase tracking-widest">List of all items in stock</p>
                 </div>
               </div>
               <div className="relative group w-full md:max-w-md">
                 <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within:text-brand-neonblue transition-colors" />
                 <input
                   type="text"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Filter by Product Name or SKU Code..."
                   className="w-full bg-brand-bgbase/50 border border-border/50 rounded-[24px] py-4 pl-14 pr-6 text-xs text-main font-bold placeholder:text-muted/20 focus:outline-none focus:border-brand-neonblue/20 transition-all shadow-inner"
                 />
               </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
               {loading ? (
                 <div className="py-20 flex flex-col items-center gap-4 opacity-40">
                   <Activity size={32} className="animate-pulse text-muted" />
                   <p className="text-[10px] font-black uppercase tracking-[4px] text-muted">Syncing Matrix...</p>
                 </div>
               ) : displayData.length > 0 ? (
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-main/40 border-b border-border">
                      <th className="pb-4 pr-4">SKU Code</th>
                      <th className="pb-4 px-4">Product Name</th>
                      {!isConsolidated ? (
                        <th className="pb-4 px-4">Store</th>
                      ) : (
                        branches.map(b => (
                          <th key={b.id} className="pb-4 px-4 text-center">{b.name}</th>
                        ))
                      )}
                      <th className="pb-4 px-4">Category</th>
                      <th className="pb-4 px-4">Quantity</th>
                      <th className="pb-4 pl-4 text-right">Ops</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {displayData.map((item, i) => (
                      <motion.tr 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * (i % 10) }}
                        className="border-b border-main/5 hover:bg-main/[0.01] transition-colors group"
                      >
                        <td className="py-6 pr-4 font-mono text-[10px] text-muted/40 group-hover:text-brand-neonblue transition-colors uppercase tracking-wider">{item.Product?.sku}</td>
                        <td className="py-6 px-4">
                          <h4 className="text-[14px] font-black text-main group-hover:text-brand-neonblue transition-colors capitalize tracking-tight">{item.Product?.name}</h4>
                        </td>
                        
                        {!isConsolidated ? (
                          <td className="py-6 px-4 border-l border-main/5">
                             <div className="flex items-center gap-2">
                               <div className="w-1 h-3 bg-brand-neonblue/20 rounded-full" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-muted">{item.Branch?.name}</span>
                             </div>
                          </td>
                        ) : (
                          branches.map(b => (
                            <td key={b.id} className="py-6 px-4 text-center border-l border-main/5">
                               <span className={`text-[12px] font-black ${item.branchStocks[b.id] <= (item.low_stock_threshold || 5) ? 'text-brand-crimson' : 'text-main/40'}`}>
                                 {item.branchStocks[b.id]}
                               </span>
                            </td>
                          ))
                        )}

                        <td className="py-6 px-4">
                           <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border border-border/50 bg-brand-bgbase text-muted/60">{item.Product?.Category?.name || 'GENERIC'}</span>
                        </td>
                        <td className="py-6 px-4">
                           <div className="flex items-center gap-3">
                             <span className={`text-base font-black ${(isConsolidated ? item.totalStock : item.quantity) <= (item.low_stock_threshold || 5) ? 'text-brand-crimson' : 'text-main'}`}>
                               {isConsolidated ? item.totalStock : item.quantity}
                             </span>
                             {(isConsolidated ? item.totalStock : item.quantity) <= (item.low_stock_threshold || 5) && (
                               <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                                 <AlertTriangle size={14} className="text-brand-crimson" />
                               </motion.div>
                             )}
                           </div>
                        </td>
                        <td className="py-6 pl-4 text-right">
                          {!isConsolidated && canEditStock ? (
                            <div className="flex flex-col gap-2 items-end">
                              {user?.role === 'super_admin' && (
                                <button
                                  onClick={() => openAdjustModal(item)}
                                  className="btn-premium px-4 py-2 w-full"
                                >
                                  Adjust Stock
                                </button>
                              )}
                              {(user?.role === 'branch_admin' || user?.role === 'employee') && (
                                <button
                                  onClick={() => setRestockItem(item)}
                                  className="px-4 py-2 bg-brand-neonblue/10 border border-brand-neonblue/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-neonblue hover:bg-brand-neonblue/20 transition-all w-full"
                                >
                                  Request Stock
                                </button>
                              )}
                            </div>
                          ) : isConsolidated && canEditStock ? (
                            <div className="flex flex-col gap-1.5 items-end">
                              {branches.map(b => {
                                const branchItem = inventory.find(i => i.product_id === item.Product?.id && i.branch_id === b.id);
                                return branchItem ? (
                                  <button
                                    key={b.id}
                                    onClick={() => openAdjustModal(branchItem)}
                                    className="btn-ghost px-3 py-1.5 text-[8px]"
                                  >
                                    Edit {b.name}
                                  </button>
                                ) : null;
                              })}
                            </div>
                          ) : null}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-brand-surface rounded-[32px] border border-dashed border-border">
                  <Package size={48} className="text-muted/20 mb-4" />
                  <h3 className="text-sm font-black uppercase tracking-[4px] text-muted">Registry Empty</h3>
                  <p className="text-[10px] text-muted/40 font-bold uppercase mt-1">
                    {searchQuery ? "No records match your query protocol" : "No inventory data detected in this sector"}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </main>

      {/* Stock Modulation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-brand-surface border border-border rounded-[32px] p-10 relative z-10 overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-32 h-32 bg-brand-neonblue/10 blur-[60px] pointer-events-none" />
               <div className="mb-10">
                 <h3 className="text-xl font-rajdhani font-black tracking-[4px] uppercase text-main mb-2">Adjust Stock</h3>
                 <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Change stock levels for {editingItem?.Product.name}</p>
               </div>
               <form onSubmit={handleUpdateStock} className="space-y-8">
                  <div className="space-y-4">
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">New Quantity</label>
                        <div className="flex items-center gap-4 mt-2">
                           <input 
                             type="number" 
                             required
                             value={adjustValue}
                             onChange={(e) => setAdjustValue(e.target.value)}
                             className="flex-1 bg-brand-bgbase border border-border rounded-2xl py-4 px-6 text-xl font-rajdhani font-bold text-brand-neonblue focus:outline-none focus:border-brand-neonblue transition-all"
                           />
                           <div className="px-5 py-4 bg-brand-surface border border-border rounded-2xl flex flex-col items-center">
                              <span className="text-[8px] font-black text-muted uppercase tracking-widest mb-1">Current</span>
                              <span className="text-sm font-black text-main">{editingItem?.quantity}</span>
                           </div>
                        </div>
                     </div>
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">Low Stock Alert at</label>
                        <input 
                          type="number" 
                          min="0"
                          required
                          value={adjustThreshold}
                          onChange={(e) => setAdjustThreshold(e.target.value)}
                          className="w-full mt-2 bg-brand-bgbase border border-border rounded-2xl py-4 px-6 text-sm text-main focus:outline-none focus:border-brand-crimson/50 transition-all font-bold"
                        />
                     </div>
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main transition-all">Cancel</button>
                    <button type="submit" className="flex-[2] py-4 bg-brand-neonblue rounded-2xl text-[10px] font-black tracking-[3px] text-brand-navy shadow-lg shadow-brand-neonblue/20 transition-all active:scale-95">Save Changes</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {restockItem && (
          <RestockRequestModal 
            key={restockItem.id}
            inventoryItem={restockItem} 
            onClose={() => setRestockItem(null)} 
            onSuccess={fetchInventory}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
