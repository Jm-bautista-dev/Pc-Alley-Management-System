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

  const fetchPnlData = async () => {
    setLoading(true);
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
      } else {
        showError("Failed to load profit & loss analytics.");
      }
    } catch (err) {
      console.error("Error fetching P&L data:", err);
      showError("Connection error while loading financial report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPnlData();
  }, [selectedBranch, periodFilter]);

  const { summary, trends, monthly } = pnlData;

  const trendData = {
    labels: trends.map(t => t.label || t.date),
    datasets: [
      {
        label: 'Daily Revenue',
        data: trends.map(t => t.revenue),
        borderColor: '#00F2FF',
        backgroundColor: 'rgba(0, 242, 255, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#00F2FF',
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        label: 'Daily Expenses',
        data: trends.map(t => t.expenses),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#EF4444',
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
          color: 'rgba(255, 255, 255, 0.7)',
          font: { family: 'DM Sans', size: 11, weight: 'bold' }
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

  const handleExport = () => {
    const exportSummary = [
      { Metric: 'Total Revenue', Amount: summary.revenue, Notes: `Gross sales from ${summary.totalSalesCount} transactions` },
      { Metric: 'Cost of Goods Sold (COGS)', Amount: summary.cogs, Notes: 'Total product acquisition costs' },
      { Metric: 'Gross Profit', Amount: summary.grossProfit, Notes: `Gross Margin: ${summary.grossMargin}%` },
      { Metric: 'Operating Expenses', Amount: summary.operatingExpenses, Notes: 'Operating expenditures & overhead' },
      { Metric: 'Net Income', Amount: summary.netIncome, Notes: `Net Margin: ${summary.netMargin}%` }
    ];

    const exportMonthly = monthly.map(m => ({
      Month: m.month,
      Year: m.year,
      Revenue: m.revenue,
      COGS: m.cogs,
      'Gross Profit': m.grossProfit,
      Expenses: m.expenses,
      'Net Profit': m.profit,
      'Margin %': `${m.margin}%`,
      Status: m.status
    }));

    try {
      exportToExcel(exportMonthly, 'PCA_Profit_Loss_Report', 'Monthly Breakdown', {
        title: 'PC ALLEY - PROFIT & LOSS STATEMENT',
        subtitle: `Branch: ${selectedBranch ? `Branch #${selectedBranch}` : 'All Branches'} | Range: ${periodFilter === 'all' ? 'All Time' : `${periodFilter} Days`}`
      });
      showSuccess("Excel Financial Intelligence Report Exported");
    } catch (e) {
      showError("Export Error");
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="PROFIT & LOSS REPORT" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main p-4">
          <div className="responsive-container">
          
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
              <div>
                <h1 className="text-2xl font-rajdhani font-black uppercase mb-0">
                  FINANCIAL <span className="text-brand-neonblue">STATUS</span>
                </h1>
                <p className="text-[10px] text-muted font-black tracking-[2px] uppercase mt-1">
                  Real-time Sales, COGS & Operating Expense Analysis
                </p>
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
                  onClick={fetchPnlData}
                  className="h-9 px-3 bg-brand-surface border border-border rounded-lg flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest hover:bg-brand-hover text-muted hover:text-main transition-all"
                  title="Refresh Data"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
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
            <div className="responsive-grid mb-6">
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
              <StatCard 
                title="Net Income" 
                value={`₱${Number(summary.netIncome).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                trend={`${summary.netMargin}% Margin`} 
                subtext={`After ₱${Number(summary.operatingExpenses).toLocaleString()} Expenses`} 
                icon={Activity} 
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
                    <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">REVENUE & EXPENSE FLOW (30-DAY DAILY TELEMETRY)</h3>
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
              <div className="p-6 border-b border-border flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                  <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">Monthly Financial Breakdown</h3>
                </div>
                <span className="text-[10px] font-black text-muted uppercase tracking-widest">
                  Live Monthly Ledger (Past 12 Months)
                </span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-brand-bgbase/50 text-[9px] font-black text-main/40 uppercase tracking-[2px] border-b border-border">
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
                    ) : monthly.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-muted text-xs font-bold">
                          No financial transactions recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      monthly.map((row, i) => (
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
                          <td className={`px-6 py-4 text-right font-rajdhani font-black ${row.profit >= 0 ? 'text-brand-neonblue' : 'text-brand-crimson'}`}>
                            ₱{Number(row.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center text-xs font-bold">
                            {row.margin}%
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              row.status === 'positive' 
                                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                            }`}>
                              {row.status === 'positive' ? 'Profitable' : 'Deficit'}
                            </span>
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
