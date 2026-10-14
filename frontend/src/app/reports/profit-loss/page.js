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
  Building2,
  Scale,
  BarChart3
} from "lucide-react";

const PesoSign = ({ size }) => <span style={{ fontSize: size }} className="font-bold">₱</span>;
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { apiUrl } from "@/lib/api";
import { getChartTheme } from "@/lib/chartTheme";
import { exportToExcel } from "@/lib/excelExport";
import { showSuccess, showError } from "@/context/ModalContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
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
  const [viewGranularity, setViewGranularity] = useState("daily"); // "daily" | "monthly"
  const [scaleType, setScaleType] = useState("linear"); // "linear" | "logarithmic"
  const [chartType, setChartType] = useState("line"); // "line" | "bar" (for monthly view)

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

  const chronologicalMonthly = [...monthly]
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .filter(m => hideInactiveMonths ? m.hasActivity : true);

  const displayedMonthly = hideInactiveMonths ? monthly.filter(m => m.hasActivity) : monthly;

  const isMonthly = viewGranularity === 'monthly';

  // Helper to calculate elevated visual values for linear scale so low-volume sales (> 0)
  // create a clean visible elevation above 0 rather than flattening against the floor,
  // while keeping tooltips and exact labels 100% faithful to the real revenue/cogs.
  const computePlotData = (items, keyExtractor) => {
    const rawValues = items.map(keyExtractor);
    const positiveValues = rawValues.filter(v => Number(v || 0) > 0).map(v => Number(v));
    const maxVal = positiveValues.length > 0 ? Math.max(...positiveValues) : 0;
    
    // In linear scale, if maxVal is huge (e.g., ₱9M), anything below 2% of maxVal
    // (like ₱300 or ₱1,050) compresses into < 1px.
    // We elevate values > 0 to have a perceptual minimum (3.5% of maxVal) visually,
    // storing the exact actual value in rawValue for tooltips, legends, and callouts!
    const minElevated = maxVal > 0 ? maxVal * 0.038 : 0;

    return items.map((item, idx) => {
      const actualVal = Number(keyExtractor(item) || 0);
      let plotY = actualVal;

      if (scaleType === 'logarithmic') {
        plotY = actualVal > 0 ? actualVal : null;
      } else if (actualVal > 0 && maxVal > 0 && actualVal < minElevated) {
        // Apply smooth perceptual lift so small values arch visibly into a distinct peak
        plotY = minElevated;
      }

      return {
        x: idx,
        y: plotY,
        actual: actualVal
      };
    });
  };

  const activeDailyPoints = trends.filter(t => (t.revenue || 0) > 0).length;

  const monthlyRevPoints = computePlotData(chronologicalMonthly, m => m.revenue);
  const monthlyCogsPoints = computePlotData(chronologicalMonthly, m => m.cogs);
  const monthlyGpPoints = computePlotData(chronologicalMonthly, m => 
    m.grossProfit !== undefined ? m.grossProfit : ((m.revenue || 0) - (m.cogs || 0))
  );

  const dailyRevPoints = computePlotData(trends, t => t.revenue);
  const dailyCogsPoints = computePlotData(trends, t => t.cogs);
  const dailyGpPoints = computePlotData(trends, t => 
    t.grossProfit !== undefined ? t.grossProfit : ((t.revenue || 0) - (t.cogs || 0))
  );

  const chartData = isMonthly ? {
    labels: chronologicalMonthly.map(m => `${m.month.slice(0, 3)} '${String(m.year).slice(2)}`),
    datasets: [
      {
        label: 'Total Revenue',
        data: monthlyRevPoints,
        borderColor: '#00F2FF',
        backgroundColor: chartType === 'bar' ? 'rgba(0, 242, 255, 0.7)' : 'rgba(0, 242, 255, 0.08)',
        borderRadius: 4,
        borderWidth: 2.5,
        tension: 0.35,
        fill: chartType !== 'bar',
        minBarLength: 14,
        pointBackgroundColor: (ctx) => {
          const pt = ctx.raw;
          const actual = pt?.actual ?? pt;
          return actual > 0 && actual < 10000 ? '#FFFFFF' : '#00F2FF';
        },
        pointBorderColor: '#00F2FF',
        pointBorderWidth: (ctx) => {
          const pt = ctx.raw;
          const actual = pt?.actual ?? pt;
          return actual > 0 && actual < 10000 ? 3 : 1.5;
        },
        pointRadius: (ctx) => {
          const pt = ctx.raw;
          const actual = pt?.actual ?? pt;
          if (!actual || actual <= 0) return 3;
          if (actual < 10000) return 6.5; // Beacon dot for small sales like Jan & Mar!
          return 5;
        },
        pointHoverRadius: 8,
      },
      {
        label: 'Cost of Goods (COGS)',
        data: monthlyCogsPoints,
        borderColor: '#F59E0B',
        backgroundColor: chartType === 'bar' ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.05)',
        borderRadius: 4,
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        minBarLength: 14,
        pointBackgroundColor: '#F59E0B',
        pointRadius: 4,
        pointHoverRadius: 7,
      },
      {
        label: 'Gross Profit',
        data: monthlyGpPoints,
        borderColor: '#10B981',
        backgroundColor: chartType === 'bar' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(16, 185, 129, 0.05)',
        borderRadius: 4,
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        minBarLength: 14,
        pointBackgroundColor: '#10B981',
        pointRadius: 4,
        pointHoverRadius: 7,
      }
    ]
  } : {
    labels: trends.map(t => t.label || t.date),
    datasets: [
      {
        label: 'Total Revenue',
        data: dailyRevPoints,
        borderColor: '#00F2FF',
        backgroundColor: 'rgba(0, 242, 255, 0.08)',
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        spanGaps: scaleType === 'logarithmic',
        // Distinct beacon marker for small sales days (< ₱5,000) like Jan & Mar!
        pointRadius: (ctx) => {
          const pt = ctx.raw;
          const actual = pt?.actual ?? pt;
          if (!actual || actual <= 0) return 0; // Clean baseline without point clutter
          if (actual < 5000) return 6; // Beacon dot for small sales
          return 3.5;
        },
        pointHoverRadius: 8,
        pointBackgroundColor: (ctx) => {
          const pt = ctx.raw;
          const actual = pt?.actual ?? pt;
          if (actual > 0 && actual < 5000) return '#FFFFFF';
          return '#00F2FF';
        },
        pointBorderColor: '#00F2FF',
        pointBorderWidth: (ctx) => {
          const pt = ctx.raw;
          const actual = pt?.actual ?? pt;
          if (actual > 0 && actual < 5000) return 3;
          return 1.5;
        }
      },
      {
        label: 'Cost of Goods (COGS)',
        data: dailyCogsPoints,
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        spanGaps: scaleType === 'logarithmic',
        pointRadius: (ctx) => {
          const pt = ctx.raw;
          const actual = pt?.actual ?? pt;
          return actual > 0 ? 3 : 0;
        },
        pointHoverRadius: 6,
        pointBackgroundColor: '#F59E0B',
      },
      {
        label: 'Gross Profit',
        data: dailyGpPoints,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        spanGaps: scaleType === 'logarithmic',
        pointRadius: (ctx) => {
          const pt = ctx.raw;
          const actual = pt?.actual ?? pt;
          return actual > 0 ? 3 : 0;
        },
        pointHoverRadius: 6,
        pointBackgroundColor: '#10B981',
      }
    ]
  };

  // Custom Chart.js inline plugin to draw floating value tags on active points
  const valueCalloutPlugin = {
    id: 'valueCalloutPlugin',
    afterDatasetsDraw(chart) {
      if (chartType === 'bar' && isMonthly) return;
      const { ctx } = chart;
      const revenueDataset = chart.data.datasets[0];
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data) return;

      meta.data.forEach((element, index) => {
        const rawPt = revenueDataset.data[index];
        const actualVal = rawPt?.actual ?? rawPt;
        if (!actualVal || actualVal <= 0) return;

        // Determine tag text
        let tagText = '';
        if (actualVal >= 1000000) {
          tagText = `₱${(actualVal / 1000000).toFixed(2)}M`;
        } else if (actualVal >= 1000) {
          tagText = `₱${(actualVal / 1000).toLocaleString(undefined, { minimumFractionDigits: actualVal < 10000 ? 2 : 1, maximumFractionDigits: 2 })}k`;
        } else {
          tagText = `₱${actualVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        }

        const isSmall = actualVal < 10000;
        const x = element.x;
        const y = element.y - (isSmall ? 16 : 14);

        ctx.save();
        ctx.font = 'bold 10px "DM Sans", sans-serif';
        const textWidth = ctx.measureText(tagText).width;
        const paddingX = 6;
        const paddingY = 3;
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = 16;
        const boxX = x - boxWidth / 2;
        const boxY = y - boxHeight / 2;

        // Draw pill background
        ctx.fillStyle = isSmall ? 'rgba(0, 242, 255, 0.95)' : 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
        ctx.fill();

        // Draw pill border
        ctx.strokeStyle = isSmall ? '#FFFFFF' : '#00F2FF';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw text
        ctx.fillStyle = isSmall ? '#0A0A0A' : '#00F2FF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, x, y);
        ctx.restore();
      });
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
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
          label: (c) => {
            const rawPt = c.raw;
            // Always display the 100% faithful actual currency value!
            const actual = rawPt?.actual !== undefined ? rawPt.actual : (c.parsed.y ?? 0);
            const formatted = actual !== null && actual !== undefined 
              ? Number(actual).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
              : '0.00';
            return ` ${c.dataset.label}: ₱${formatted}`;
          }
        }
      }
    },
    scales: {
      y: {
        type: scaleType === 'logarithmic' ? 'logarithmic' : 'linear',
        min: scaleType === 'logarithmic' ? 50 : undefined,
        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
        ticks: { 
          color: 'rgba(255, 255, 255, 0.4)', 
          font: { size: 10, family: 'DM Sans' },
          callback: (value) => {
            if (value >= 1000000) return `₱${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `₱${(value / 1000).toFixed(0)}k`;
            return `₱${value}`;
          }
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 10, family: 'DM Sans' } }
      }
    }
  };

  const getChartTitle = () => {
    const scaleLabel = scaleType === 'logarithmic' ? ' [LOG SCALE]' : '';
    const modeLabel = viewGranularity === 'monthly' ? 'MONTHLY' : 'DAILY';
    switch (periodFilter) {
      case '30': return `REVENUE, COGS & GROSS PROFIT (${modeLabel} - 30-DAY TELEMETRY)${scaleLabel}`;
      case '90': return `REVENUE, COGS & GROSS PROFIT (${modeLabel} - 90-DAY TELEMETRY)${scaleLabel}`;
      case '365': return `REVENUE, COGS & GROSS PROFIT (${modeLabel} - 365-DAY ANNUAL TELEMETRY)${scaleLabel}`;
      default: return `REVENUE, COGS & GROSS PROFIT (${modeLabel} - ALL-TIME TELEMETRY)${scaleLabel}`;
    }
  };

  const handleExport = () => {
    const exportSummary = [
      { Metric: 'Total Revenue', Amount: summary.revenue, Notes: `Gross sales from ${summary.totalSalesCount} transactions` },
      { Metric: 'Cost of Goods Sold (COGS)', Amount: summary.cogs, Notes: 'Total product acquisition costs' },
      { Metric: 'Gross Profit', Amount: summary.grossProfit, Notes: `Gross Margin: ${summary.grossMargin}%` }
    ];

    const exportMonthly = displayedMonthly.map(m => {
      const gp = m.grossProfit !== undefined ? m.grossProfit : (m.revenue - m.cogs);
      return {
        Month: m.month,
        Year: m.year,
        Revenue: m.revenue,
        COGS: m.cogs,
        'Gross Profit': gp,
        'Margin %': m.revenue > 0 ? `${((gp / m.revenue) * 100).toFixed(1)}%` : 'N/A',
        Status: gp > 0 ? 'Profitable' : gp < 0 ? 'Deficit' : (m.revenue > 0 ? 'Break-Even' : 'No Activity')
      };
    });

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
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-brand-neonblue rounded-full" />
                      <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">{getChartTitle()}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 ml-4.5">
                      <span className="text-[10px] font-bold text-muted">
                        {viewGranularity === 'daily' 
                          ? `${activeDailyPoints} active sales days out of ${trends.length} days recorded` 
                          : `${chronologicalMonthly.filter(m => m.hasActivity).length} active months displayed`}
                      </span>
                      {scaleType === 'logarithmic' && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-neonpurple/15 border border-brand-neonpurple/30 text-[9px] font-black text-brand-neonpurple uppercase tracking-wider">
                          Log Scale Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Daily vs Monthly Toggle */}
                    <div className="flex bg-brand-bgbase border border-border rounded-lg p-0.5 shadow-inner">
                      <button
                        onClick={() => setViewGranularity("daily")}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                          viewGranularity === "daily"
                            ? "bg-brand-neonblue text-white shadow-sm"
                            : "text-muted hover:text-main"
                        }`}
                      >
                        Daily Flow
                      </button>
                      <button
                        onClick={() => setViewGranularity("monthly")}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                          viewGranularity === "monthly"
                            ? "bg-brand-neonblue text-white shadow-sm"
                            : "text-muted hover:text-main"
                        }`}
                      >
                        Monthly Aggregate
                      </button>
                    </div>

                    {/* Chart Type (Line vs Bar) for Monthly */}
                    {viewGranularity === "monthly" && (
                      <div className="flex bg-brand-bgbase border border-border rounded-lg p-0.5">
                        <button
                          onClick={() => setChartType("line")}
                          className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                            chartType === "line"
                              ? "bg-brand-surface text-brand-neonblue border border-brand-neonblue/30 shadow-sm"
                              : "text-muted hover:text-main"
                          }`}
                        >
                          Line
                        </button>
                        <button
                          onClick={() => setChartType("bar")}
                          className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                            chartType === "bar"
                              ? "bg-brand-surface text-brand-neonblue border border-brand-neonblue/30 shadow-sm"
                              : "text-muted hover:text-main"
                          }`}
                        >
                          Bar
                        </button>
                      </div>
                    )}

                    {/* Scale Toggle: Linear vs Logarithmic */}
                    <div className="flex bg-brand-bgbase border border-border rounded-lg p-0.5">
                      <button
                        onClick={() => setScaleType("linear")}
                        title="Linear Scale (standard currency scale)"
                        className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                          scaleType === "linear"
                            ? "bg-brand-surface text-main border border-border shadow-sm font-bold"
                            : "text-muted hover:text-main"
                        }`}
                      >
                        Linear (₱)
                      </button>
                      <button
                        onClick={() => setScaleType("logarithmic")}
                        title="Logarithmic Scale: Amplifies small sales like ₱300 and ₱1,050 so they are visible alongside multi-million peaks"
                        className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 ${
                          scaleType === "logarithmic"
                            ? "bg-brand-neonpurple/20 text-brand-neonpurple border border-brand-neonpurple/40 shadow-sm font-bold"
                            : "text-muted hover:text-main"
                        }`}
                      >
                        <Scale size={11} />
                        Log Scale
                      </button>
                    </div>
                  </div>
                </div>

                {/* Beacon & Scale Notice Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-brand-bgbase/60 border border-border/40 rounded-xl mb-4 text-[11px]">
                  <div className="flex items-center gap-2 text-muted">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-white border-2 border-brand-neonblue shadow-sm"></span>
                    <span className="text-[10px] font-bold">
                      Beacon points mark low-volume sales (&lt; ₱5,000) so days like Jan &amp; Mar stand out.
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-muted">
                    Toggle <span className="text-brand-neonblue font-black">Monthly Aggregate</span> or <span className="text-brand-neonpurple font-black">Log Scale</span> to compare low months against peak months without flatlines.
                  </div>
                </div>

                <div className="h-72 w-full">
                  {loading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-border border-t-brand-neonblue rounded-full animate-spin" />
                    </div>
                  ) : chartType === 'bar' && isMonthly ? (
                    <Bar data={chartData} options={chartOptions} />
                  ) : (
                    <Line data={chartData} options={chartOptions} plugins={[valueCalloutPlugin]} />
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
                      <th className="px-6 py-4 text-right">Gross Profit</th>
                      <th className="px-6 py-4 text-center">Gross Margin</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-muted text-xs font-bold">
                          Loading monthly financial records...
                        </td>
                      </tr>
                    ) : displayedMonthly.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-muted text-xs font-bold">
                          No financial transactions recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      displayedMonthly.map((row, i) => {
                        const profitVal = row.grossProfit !== undefined ? Number(row.grossProfit) : (Number(row.revenue) - Number(row.cogs));
                        const marginVal = Number(row.revenue) > 0 ? ((profitVal / Number(row.revenue)) * 100).toFixed(1) : null;
                        return (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors text-xs font-bold">
                            <td className="px-6 py-4 font-black text-main">{row.month} {row.year}</td>
                            <td className="px-6 py-4 text-right font-rajdhani font-black text-main">
                              ₱{Number(row.revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right font-rajdhani font-bold text-muted">
                              ₱{Number(row.cogs).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={`px-6 py-4 text-right font-rajdhani font-black ${profitVal > 0 ? 'text-brand-neonblue' : profitVal < 0 ? 'text-brand-crimson' : 'text-muted'}`}>
                              ₱{profitVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-center text-xs font-bold">
                              {marginVal !== null ? `${marginVal}%` : '—'}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {profitVal > 0 && (
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                  Profitable
                                </span>
                              )}
                              {profitVal < 0 && (
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-rose-500/10 text-rose-400 border-rose-500/20">
                                  Deficit
                                </span>
                              )}
                              {profitVal === 0 && Number(row.revenue) > 0 && (
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/20">
                                  Break-Even
                                </span>
                              )}
                              {profitVal === 0 && Number(row.revenue) === 0 && (
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-slate-500/10 text-slate-400 border-slate-500/20">
                                  No Activity
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
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
