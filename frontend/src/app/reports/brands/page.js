"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError } from "@/context/ModalContext";
import { useTheme } from "@/context/ThemeContext";
import {
  Tag, Download, Calendar, ArrowUpRight, Percent, Package,
  Layers, CircleDollarSign, Loader2, RefreshCw, BarChart3, Star
} from "lucide-react";

export default function BrandReportsPage() {
  const { theme } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState("30");
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("user"));
    setUser(loggedInUser);
    if (loggedInUser?.role === "super_admin") {
      fetchBranches();
    } else if (loggedInUser?.branch_id) {
      setSelectedBranchId(String(loggedInUser.branch_id));
    }
  }, []);

  useEffect(() => {
    fetchBrandAnalytics();
  }, [filterDays, selectedBranchId, user]);

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setBranches(await res.json());
    } catch { /* silent */ }
  };

  const fetchBrandAnalytics = async () => {
    if (!user) return;
    setLoading(true);
    const token = localStorage.getItem("token");
    let query = `?days=${filterDays}`;
    if (selectedBranchId) {
      query += `&branchId=${selectedBranchId}`;
    }
    try {
      const res = await fetch(apiUrl(`/api/analytics/brands${query}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        showError("Failed to fetch brand report metrics.");
      }
    } catch (err) {
      showError("Network error. Please check connections.");
    }
    setLoading(false);
  };

  const handleExport = () => {
    try {
      let csv = "Brand Name,Units Sold,Revenue (PHP),Available Stock,Stock Asset Value (PHP),Linked Products\n";
      data.forEach(item => {
        csv += `"${item.brandName}",${item.unitsSold},${item.revenue},${item.totalStock},${item.stockValue},${item.productCount}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brand_performance_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showSuccess("Exported brand report successfully!");
    } catch {
      showError("Export failed.");
    }
  };

  // Calculations
  const totalRevenue = data.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalUnits = data.reduce((acc, curr) => acc + curr.unitsSold, 0);
  const totalStock = data.reduce((acc, curr) => acc + curr.totalStock, 0);
  const totalStockValue = data.reduce((acc, curr) => acc + curr.stockValue, 0);

  // Sorting to find leaders
  const topRevenueBrand = [...data].sort((a, b) => b.revenue - a.revenue)[0];
  const topStockBrand = [...data].sort((a, b) => b.stockValue - a.stockValue)[0];

  return (
    <div className={`flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="BRAND REPORTS" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10">

          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">Analytics Dashboard</h2>
              <h1 className="text-2xl md:text-3xl font-rajdhani font-black tracking-tight text-main uppercase">
                Brand <span className="text-brand-neonblue">Analytics</span>
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Branch Selector (Super Admin only) */}
              {user?.role === "super_admin" && (
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-brand-surface border border-border/50 rounded-full px-4 py-2 text-xs font-bold outline-none focus:border-brand-neonblue cursor-pointer appearance-none min-w-[150px]"
                >
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}

              {/* Days filter */}
              <div className="flex bg-brand-surface p-1 rounded-full border border-border/50">
                {["7", "30", "90"].map(days => (
                  <button
                    key={days}
                    onClick={() => setFilterDays(days)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                      filterDays === days ? "bg-brand-neonblue text-white shadow-md shadow-brand-neonblue/20" : "text-muted hover:text-main"
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>

              {/* Actions */}
              <button onClick={fetchBrandAnalytics} className="w-10 h-10 rounded-full bg-brand-surface border border-border/50 hover:border-brand-neonblue/40 flex items-center justify-center text-muted hover:text-main transition-all">
                <RefreshCw size={14} />
              </button>
              <button onClick={handleExport} className="bg-brand-neonblue text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-brand-neonblue/20 transition-all flex items-center gap-2">
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-40">
              <Loader2 size={24} className="animate-spin text-brand-neonblue" />
            </div>
          ) : data.length === 0 ? (
            <div className="bg-brand-surface border border-border/50 rounded-2xl p-12 text-center">
              <Tag size={48} className="text-muted/30 mx-auto mb-4" />
              <p className="text-sm font-bold text-muted">No sales or stock data matches your filter parameters.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 shadow-sm">
                  <p className="text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Total Sales Revenue</p>
                  <p className="text-2xl font-rajdhani font-black text-brand-neonblue">₱{totalRevenue.toLocaleString()}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted font-bold">
                    <CircleDollarSign size={12} className="text-brand-neonblue" />
                    <span>From {totalUnits.toLocaleString()} units sold</span>
                  </div>
                </div>

                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 shadow-sm">
                  <p className="text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Inventory Asset Value</p>
                  <p className="text-2xl font-rajdhani font-black text-brand-neonpurple">₱{totalStockValue.toLocaleString()}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted font-bold">
                    <Package size={12} className="text-brand-neonpurple" />
                    <span>In {totalStock.toLocaleString()} stock units</span>
                  </div>
                </div>

                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 shadow-sm">
                  <p className="text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Top Performer (Sales)</p>
                  <p className="text-xl font-rajdhani font-black text-green-500 truncate uppercase mt-1">
                    {topRevenueBrand ? topRevenueBrand.brandName : "N/A"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted font-bold">
                    <ArrowUpRight size={12} className="text-green-500" />
                    <span>₱{topRevenueBrand ? topRevenueBrand.revenue.toLocaleString() : "0"} revenue</span>
                  </div>
                </div>

                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 shadow-sm">
                  <p className="text-[10px] font-black text-muted uppercase tracking-[2px] mb-2">Top Inventory Value</p>
                  <p className="text-xl font-rajdhani font-black text-amber-500 truncate uppercase mt-1">
                    {topStockBrand ? topStockBrand.brandName : "N/A"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted font-bold">
                    <Layers size={12} className="text-amber-500" />
                    <span>₱{topStockBrand ? topStockBrand.stockValue.toLocaleString() : "0"} value</span>
                  </div>
                </div>
              </div>

              {/* Distribution Shares Charts/Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Share */}
                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-main mb-6 flex items-center gap-2">
                    <BarChart3 size={16} className="text-brand-neonblue" /> Brand Revenue Share (%)
                  </h3>
                  <div className="space-y-4">
                    {data.sort((a, b) => b.revenue - a.revenue).map((item) => {
                      const share = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
                      return (
                        <div key={item.brandId}>
                          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                            <span className="text-main uppercase tracking-wide">{item.brandName}</span>
                            <span className="text-muted">₱{item.revenue.toLocaleString()} ({share.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full h-2 bg-brand-bgbase rounded-full overflow-hidden">
                            <div className="h-full bg-brand-neonblue rounded-full" style={{ width: `${share}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Inventory Asset Share */}
                <div className="bg-brand-surface border border-border/50 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-main mb-6 flex items-center gap-2">
                    <Layers size={16} className="text-brand-neonpurple" /> Brand Inventory Value Share (%)
                  </h3>
                  <div className="space-y-4">
                    {data.sort((a, b) => b.stockValue - a.stockValue).map((item) => {
                      const share = totalStockValue > 0 ? (item.stockValue / totalStockValue) * 100 : 0;
                      return (
                        <div key={item.brandId}>
                          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                            <span className="text-main uppercase tracking-wide">{item.brandName}</span>
                            <span className="text-muted">₱{item.stockValue.toLocaleString()} ({share.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full h-2 bg-brand-bgbase rounded-full overflow-hidden">
                            <div className="h-full bg-brand-neonpurple rounded-full" style={{ width: `${share}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Full Details Table */}
              <div className="bg-brand-surface border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border/50 bg-brand-bgbase/10">
                  <h3 className="text-sm font-black uppercase tracking-widest text-main">Brand Performance Directory</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-brand-bgbase">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-muted uppercase tracking-wider">Brand Name</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-muted uppercase tracking-wider">Units Sold</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-muted uppercase tracking-wider">Revenue</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-muted uppercase tracking-wider">Available Stock</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-muted uppercase tracking-wider">Stock Asset Value</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-muted uppercase tracking-wider">Linked Products</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((item) => (
                        <tr key={item.brandId} className="border-t border-border/30 hover:bg-brand-bgbase/30">
                          <td className="px-6 py-4 flex items-center gap-3">
                            {item.logo ? (
                              <img src={apiUrl(item.logo)} alt={item.brandName} className="w-8 h-8 rounded-lg bg-brand-bgbase object-contain p-1 border border-border/30" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-brand-bgbase border border-border/30 flex items-center justify-center text-muted">
                                <Tag size={12} />
                              </div>
                            )}
                            <span className="font-bold text-main uppercase tracking-wide">{item.brandName}</span>
                          </td>
                          <td className="px-6 py-4 text-right text-muted font-bold">{item.unitsSold.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-main font-black">₱{item.revenue.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-muted font-bold">{item.totalStock.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-brand-neonpurple font-black">₱{item.stockValue.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-muted font-bold">{item.productCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
