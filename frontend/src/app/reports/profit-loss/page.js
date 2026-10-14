"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart, 
  Calendar,
  Download,
  Activity,
  History,
  TrendingDown,
  Briefcase,
  Layers,
  FileDown,
  RefreshCw,
  Building2
} from "lucide-react";

const PesoSign = ({ size }) => <span style={{ fontSize: size }} className="font-bold">₱</span>;
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { apiUrl } from "@/lib/api";
import { getChartTheme } from "@/lib/chartTheme";
import { exportToExcel } from "@/lib/excelExport";
import { showSuccess, showError } from "@/context/ModalContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

export default function ProfitLossPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hideInactiveMonths, setHideInactiveMonths] = useState(false);

  const [pnlData, setPnlData] = useState({
    summary: {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netIncome: 0,
      grossMargin: 0,
      netMargin: 0,
      totalSalesCount: 0
    },
    trends: [],
    monthly: []
  });

  const chartTheme = getChartTheme();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed.role === 'super_admin') {
        fetchBranches();
      }
    }
  }, []);

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBranches(await res.json());
      }
    } catch (e) {
      console.error("Error fetching branches:", e);
    }
  };

  const fetchPnlData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    const token = localStorage.getItem("token");
    try {
      let query = `?`;
      if (selectedBranch) query += `branch_id=${selectedBranch}&`;
      if (periodFilter !== 'all') query += `days=${periodFilter}&`;

      const res = await fetch(apiUrl(`/api/analytics/profit-loss${query}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setPnlData(data);
        setLastUpdated(new Date());
      } else if (!isBackground) {
        showError("Failed to load profit & loss analytics.");
      }
    } catch (err) {
      console.error("Error fetching P&L data:", err);
      if (!isBackground) {
        showError("Connection error while loading financial report.");
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPnlData();
    // Realtime background polling every 30 seconds
    const interval = setInterval(() => {
      fetchPnlData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedBranch, periodFilter]);

  const { summary, trends, monthly } = pnlData;

  const trendData = {
    labels: trends.map(t => t.label || t.date),
    datasets: [
      {
        label: 'Total Revenue',
        data: trends.map(t => Number(t.revenue || 0)),
        borderColor: '#00F2FF',
        backgroundColor: 'rgba(0, 242, 255, 0.08)',
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#00F2FF',
        pointRadius: 2.5,
        pointHoverRadius: 6,
      },
      {
        label: 'Cost of Goods (COGS)',
        data: trends.map(t => Number(t.cogs || 0)),
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        pointBackgroundColor: '#F59E0B',
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        label: 'Gross Profit',
        data: trends.map(t => Number(t.grossProfit !== undefined ? t.grossProfit : ((t.revenue || 0) - (t.cogs || 0)))),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        pointBackgroundColor: '#10B981',
        pointRadius: 2,
        pointHoverRadius: 5,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.75)',
          font: { family: 'DM Sans', size: 11, weight: 'bold' },
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        titleFont: { family: 'Rajdhani', size: 12, weight: 'bold' },
        bodyFont: { family: 'DM Sans', size: 11 },
        padding: 12,
        borderRadius: 8,
        callbacks: {
          label: (c) => ` ${c.dataset.label}: ₱${Number(c.parsed.y || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
        ticks: { 
          color: 'rgba(255, 255, 255, 0.4)', 
          font: { size: 10, family: 'DM Sans' },
          callback: (value) => `₱${(value / 1000).toFixed(0)}k`
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 10, family: 'DM Sans' } }
      }
    }
  };

  const displayedMonthly = hideInactiveMonths ? monthly.filter(m => m.hasActivity) : monthly;

  const getChartTitle = () => {
    switch (periodFilter) {
      case '30': return 'REVENUE, COGS & GROSS PROFIT FLOW (30-DAY TELEMETRY)';
      case '90': return 'REVENUE, COGS & GROSS PROFIT FLOW (90-DAY TELEMETRY)';
      case '365': return 'REVENUE, COGS & GROSS PROFIT FLOW (365-DAY ANNUAL TELEMETRY)';
      default: return 'REVENUE, COGS & GROSS PROFIT FLOW (ALL-TIME TELEMETRY)';
    }
  };

  const handleExport = () => {
    const exportSummary = [
      { Metric: 'Total Revenue', Amount: summary.revenue, Notes: `Gross sales from ${summary.totalSalesCount} transactions` },
      { Metric: 'Cost of Goods Sold (COGS)', Amount: summary.cogs, Notes: 'Total product acquisition costs' },
      { Metric: 'Gross Profit', Amount: summary.grossProfit, Notes: `Gross Margin: ${summary.grossMargin}%` }
    ];

    const exportMonthly = displayedMonthly.map(m => ({
      Month: m.month,
      Year: m.year,
      Revenue: m.revenue,
      COGS: m.cogs,
      'Gross Profit': m.grossProfit,
      Expenses: m.expenses,
      'Net Profit': m.profit,
      'Margin %': m.revenue > 0 ? `${m.margin}%` : 'N/A',
      Status: m.status === 'positive' ? 'Profitable' : m.status === 'negative' ? 'Deficit' : m.status === 'breakeven' ? 'Break-Even' : 'No Activity'
    }));

    try {
      exportToExcel(exportMonthly, 'PCA_Sales_Gross_Report', 'Monthly Breakdown', {
        title: 'PC ALLEY - SALES & GROSS REPORT',
        subtitle: `Branch: ${selectedBranch ? `Branch #${selectedBranch}` : 'All Branches'} | Range: ${periodFilter === 'all' ? 'All Time' : `${periodFilter} Days`}`
      });
      showSuccess("Excel Sales & Gross Report Exported");
    } catch (e) {
      showError("Export Error");
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SALES & GROSS REPORT" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main p-4">
          <div className="responsive-container">
          
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
              <div>
                <h1 className="text-2xl font-rajdhani font-black uppercase mb-0">
                  SALES & GROSS <span className="text-brand-neonblue">REPORT</span>
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    LIVE REAL-TIME SYNC
                  </span>
                  <span className="text-[10px] text-muted font-bold">
                    {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Synchronizing...'}
                  </span>
                </div>
              </div>

              {/* Filters & Actions */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {user?.role === 'super_admin' && (
                  <div className="flex items-center gap-2 bg-brand-surface border border-border rounded-lg px-3 py-1.5 text-xs font-bold">
                    <Building2 size={14} className="text-brand-neonblue" />
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="bg-transparent text-main text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="" className="bg-brand-surface text-main">All Branches</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id} className="bg-brand-surface text-main">{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-1 bg-brand-surface border border-border rounded-lg p-1">
                  {[
                    { label: '30D', value: '30' },
                    { label: '90D', value: '90' },
                    { label: '365D', value: '365' },
                    { label: 'ALL', value: 'all' }
                  ].map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => setPeriodFilter(tab.value)}
                      className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                        periodFilter === tab.value 
                          ? 'bg-brand-neonblue text-white shadow-sm' 
                          : 'text-muted hover:text-main'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => fetchPnlData(false)}
                  className="h-9 px-3 bg-brand-surface border border-border rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-brand-hover text-muted hover:text-main transition-all"
                  title="Refresh Financial Data"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin text-brand-neonblue" : ""} />
                  <span className="hidden sm:inline">Sync</span>
                </button>

                <button 
                  onClick={handleExport}
                  className="h-9 px-4 bg-brand-surface border border-border rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-brand-hover transition-all text-muted hover:text-main"
                >
                  <FileDown size={14} className="text-brand-neonblue" /> Export Excel
                </button>
              </div>
            </div>

            {/* Key Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <StatCard 
                title="Total Revenue" 
                value={`₱${Number(summary.revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                trend={`${summary.totalSalesCount} Sales`} 
                subtext="Gross Money In" 
                icon={PesoSign} 
              />
              <StatCard 
                title="Cost of Goods (COGS)" 
                value={`₱${Number(summary.cogs).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                trend={summary.revenue > 0 ? `${((summary.cogs / summary.revenue) * 100).toFixed(1)}% of sales` : '0%'} 
                subtext="Product Acquisition Cost" 
                icon={Briefcase} 
              />
              <StatCard 
                title="Gross Profit" 
                value={`₱${Number(summary.grossProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                trend={`${summary.grossMargin}% Margin`} 
                subtext="Revenue - COGS" 
                icon={Layers} 
              />
            </div>

            {/* Revenue & Expense Flow Chart */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-surface border border-border rounded-2xl p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-brand-neonblue rounded-full" />
                    <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">{getChartTitle()}</h3>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                    {trends.length} Active Days
                  </span>
                </div>
                <div className="h-64 w-full">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-border border-t-brand-neonblue rounded-full animate-spin" />
                    </div>
                  ) : (
                    <Line data={trendData} options={chartOptions} />
                  )}
                </div>
              </motion.div>
            </div>

            {/* Monthly / Quarterly P&L Activity */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm mb-6"
            >
              <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                  <div>
                    <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">Monthly Financial Breakdown</h3>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                      Live Ledger (Past 12 Months)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHideInactiveMonths(!hideInactiveMonths)}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                      hideInactiveMonths 
                        ? 'bg-brand-neonblue/10 border-brand-neonblue/30 text-brand-neonblue shadow-sm' 
                        : 'bg-brand-surface border-border text-muted hover:text-main'
                    }`}
                  >
                    {hideInactiveMonths ? 'Showing Active Months' : 'Hide Inactive Months'}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-brand-bgbase/50 text-[10px] font-bold text-muted uppercase tracking-wider border-b border-border">
                      <th className="px-6 py-4">Month / Year</th>
                      <th className="px-6 py-4 text-right">Revenue</th>
                      <th className="px-6 py-4 text-right">COGS</th>
                      <th className="px-6 py-4 text-right">Operating Expenses</th>
                      <th className="px-6 py-4 text-right">Net Profit</th>
                      <th className="px-6 py-4 text-center">Net Margin</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-muted text-xs font-bold">
                          Loading monthly financial records...
                        </td>
                      </tr>
                    ) : displayedMonthly.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-muted text-xs font-bold">
                          No financial transactions recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      displayedMonthly.map((row, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors text-xs font-bold">
                          <td className="px-6 py-4 font-black text-main">{row.month} {row.year}</td>
                          <td className="px-6 py-4 text-right font-rajdhani font-black text-main">
                            ₱{Number(row.revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right font-rajdhani font-bold text-muted">
                            ₱{Number(row.cogs).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right font-rajdhani font-bold text-muted">
                            ₱{Number(row.expenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`px-6 py-4 text-right font-rajdhani font-black ${row.profit > 0 ? 'text-brand-neonblue' : row.profit < 0 ? 'text-brand-crimson' : 'text-muted'}`}>
                            ₱{Number(row.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center text-xs font-bold">
                            {row.revenue > 0 ? `${row.margin}%` : '—'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {row.status === 'positive' && (
                              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                Profitable
                              </span>
                            )}
                            {row.status === 'negative' && (
                              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-rose-500/10 text-rose-400 border-rose-500/20">
                                Deficit
                              </span>
                            )}
                            {row.status === 'breakeven' && (
                              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/20">
                                Break-Even
                              </span>
                            )}
                            {row.status === 'neutral' && (
                              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-slate-500/10 text-slate-400 border-slate-500/20">
                                No Activity
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
}
