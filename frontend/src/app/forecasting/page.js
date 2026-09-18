"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import { 
  TrendingUp, 
  ArrowUpRight, 
  Activity,
  AlertTriangle,
  Lightbulb,
  FileDown,
  RefreshCw,
  Sliders,
  CheckCircle,
  Database,
  Calendar,
  Layers,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  FileSpreadsheet,
  CalendarDays,
  Sparkles,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/lib/useAuthGuard";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { showSuccess, showError } from "@/context/ModalContext";
import { apiUrl } from "@/lib/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

const PesoSign = ({ size }) => <span style={{ fontSize: size }} className="font-bold text-brand-neonblue">₱</span>;

// Helper to format date as YYYY-MM-DD
const formatDateStr = (d) => d.toISOString().substring(0, 10);

function ForecastingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isChecking } = useAuthGuard();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [branches, setBranches] = useState([]);
  
  // ── FILTER STATES (Branches + Date Filter only) ───────────────────────────
  const [branch, setBranch] = useState("all");
  const [dateRange, setDateRange] = useState("1month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("daily");
  const [horizon, setHorizon] = useState("3m");
  const [forecastType, setForecastType] = useState("sales");

  // Helper to calculate start/end/grouping based on selected date preset
  const calculateDateRange = (rangeKey) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    let nextGroup = "daily";
    let nextHorizon = "30d";

    switch (rangeKey) {
      case "today":
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        nextGroup = "daily";
        nextHorizon = "7d";
        break;
      case "1day":
        start = new Date(today);
        start.setDate(today.getDate() - 1);
        end = new Date(today);
        nextGroup = "daily";
        nextHorizon = "7d";
        break;
      case "1week":
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        end = new Date(today);
        nextGroup = "daily";
        nextHorizon = "30d";
        break;
      case "1month":
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        end = new Date(today);
        nextGroup = "daily";
        nextHorizon = "3m";
        break;
      case "1year":
        start = new Date(today);
        start.setFullYear(today.getFullYear() - 1);
        end = new Date(today);
        nextGroup = "monthly";
        nextHorizon = "6m";
        break;
      default:
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        end = new Date(today);
        nextGroup = "daily";
        nextHorizon = "3m";
        break;
    }

    return {
      startDate: formatDateStr(start),
      endDate: formatDateStr(end),
      groupBy: nextGroup,
      horizon: nextHorizon
    };
  };

  // RBAC Access Verification
  useEffect(() => {
    if (!isChecking) {
      if (!user || user.role !== "super_admin") {
        router.replace("/dashboard");
      }
    }
  }, [user, isChecking, router]);

  // Load URL Query parameters or localStorage defaults on mount
  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchBranches();
      
      const queryBranch = searchParams.get("branch");
      const queryRange = searchParams.get("dateRange");

      let finalBranch = "all";
      let finalRange = "1month";

      const cached = localStorage.getItem("forecasting_filters");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.branch) finalBranch = parsed.branch;
          if (parsed.dateRange) finalRange = parsed.dateRange;
        } catch (e) {}
      }

      if (queryBranch) finalBranch = queryBranch;
      if (queryRange) finalRange = queryRange;

      const calculated = calculateDateRange(finalRange);

      setBranch(finalBranch);
      setDateRange(finalRange);
      setStartDate(calculated.startDate);
      setEndDate(calculated.endDate);
      setGroupBy(calculated.groupBy);
      setHorizon(calculated.horizon);
      setForecastType("sales");

      fetchForecastData({
        branch: finalBranch,
        forecastType: "sales",
        startDate: calculated.startDate,
        endDate: calculated.endDate,
        groupBy: calculated.groupBy,
        horizon: calculated.horizon
      });
    }
  }, [user]);

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(Array.isArray(data) ? data : (data?.branches || []));
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const fetchForecastData = async (currentFilters) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    
    const queryParams = {
      startDate: currentFilters.startDate,
      endDate: currentFilters.endDate,
      groupBy: currentFilters.groupBy,
      horizon: currentFilters.horizon,
      forecastType: currentFilters.forecastType
    };
    if (currentFilters.branch !== "all") {
      queryParams.branchId = currentFilters.branch;
    }

    const params = new URLSearchParams(queryParams);

    try {
      const res = await fetch(apiUrl(`/api/analytics/forecasting?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        showError("Data Error", "Forecasting engine failed to compute with current ranges.");
      }
    } catch (err) {
      showError("Connection Outage", "Network interface timed out.");
    } finally {
      setLoading(false);
    }
  };

  // ── FILTER ACTIONS ──────────────────────────────────────────────────────────
  const applyFilters = () => {
    const calculated = calculateDateRange(dateRange);
    setStartDate(calculated.startDate);
    setEndDate(calculated.endDate);
    setGroupBy(calculated.groupBy);
    setHorizon(calculated.horizon);

    const updated = {
      branch,
      forecastType: "sales",
      startDate: calculated.startDate,
      endDate: calculated.endDate,
      groupBy: calculated.groupBy,
      horizon: calculated.horizon,
      dateRange
    };
    localStorage.setItem("forecasting_filters", JSON.stringify(updated));

    const params = new URLSearchParams({
      branch,
      dateRange,
      startDate: calculated.startDate,
      endDate: calculated.endDate
    });
    window.history.pushState(null, "", `?${params.toString()}`);

    fetchForecastData(updated);
  };

  const resetFilters = () => {
    const calculated = calculateDateRange("1month");
    setDateRange("1month");
    setBranch("all");
    setForecastType("sales");
    setStartDate(calculated.startDate);
    setEndDate(calculated.endDate);
    setGroupBy(calculated.groupBy);
    setHorizon(calculated.horizon);

    const defaults = {
      branch: "all",
      forecastType: "sales",
      startDate: calculated.startDate,
      endDate: calculated.endDate,
      groupBy: calculated.groupBy,
      horizon: calculated.horizon,
      dateRange: "1month"
    };

    localStorage.setItem("forecasting_filters", JSON.stringify(defaults));
    window.history.pushState(null, "", `?branch=all&dateRange=1month`);

    fetchForecastData(defaults);
  };

  // ── CSV EXPORT ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!data || !data.tableData) return;
    const headers = ["Period", "Actual Sales", "Predicted Sales", "Variance", "Projected Demand (Tx)", "Projected Inventory Usage"];
    
    const rows = data.tableData.map(row => {
      const proj = data.projections.find(p => p.month === row.period);
      return [
        `"${row.period}"`,
        row.actual !== null ? row.actual : "0",
        row.predicted,
        row.actual !== null ? row.variance : "0",
        proj ? proj.predictedDemand : "0",
        proj ? proj.predictedInventory : "0"
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Forecasting_Report_${branch || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("CSV Export Completed", "Spreadsheet downloaded successfully.");
  };

  // Render Skeleton Loader grid
  const renderSkeleton = () => (
    <div className="space-y-6">
      {/* 4 Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-brand-surface/40 border border-border/50 rounded-[24px] p-5 h-[105px] animate-pulse flex flex-col justify-between">
            <div className="w-16 h-3 bg-border/80 rounded" />
            <div className="w-28 h-6 bg-border rounded" />
            <div className="w-20 h-2 bg-border/60 rounded" />
          </div>
        ))}
      </div>
      {/* 2 Charts Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-brand-surface/40 border border-border/50 rounded-[24px] p-6 h-[340px] animate-pulse flex flex-col justify-between">
            <div className="w-40 h-4 bg-border rounded" />
            <div className="flex-1 w-full bg-border/30 rounded mt-4" />
          </div>
        ))}
      </div>
      {/* Bottom Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-brand-surface/40 border border-border/50 rounded-[24px] p-6 h-[340px] animate-pulse" />
        <div className="bg-brand-surface/40 border border-border/50 rounded-[24px] p-6 h-[340px] animate-pulse" />
      </div>
    </div>
  );

  // Compile datasets
  const trends = data?.trends || [];
  const projections = data?.projections || [];
  const accuracyComparison = data?.accuracyComparison || [];
  const branchRankings = data?.branchRankings || [];
  const accuracyPercent = data?.accuracy || 100.0;
  const confidenceRating = data?.confidence || "High";

  // Chart configuration labels and sets
  const combinedLabels = [...trends.map(t => t.month), ...projections.map(p => p.month)];
  const combinedHist = [...trends.map(t => parseFloat(t.revenue) || 0), ...Array(projections.length).fill(null)];
  const combinedProj = trends.length > 0 ? [
    ...Array(trends.length - 1).fill(null),
    parseFloat(trends[trends.length - 1]?.revenue || 0),
    ...projections.map(p => p.predictedRevenue)
  ] : projections.map(p => p.predictedRevenue);

  const lineChartData = {
    labels: combinedLabels,
    datasets: [
      {
        label: 'Actual Data (Historical)',
        data: combinedHist,
        borderColor: '#00F2FF',
        backgroundColor: 'rgba(0, 242, 255, 0.01)',
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#00F2FF',
      },
      {
        label: 'Forecast Data (Linear Regression)',
        data: combinedProj,
        borderColor: '#A855F7',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        borderDash: [6, 4],
        tension: 0.35,
        pointBackgroundColor: '#A855F7',
      }
    ]
  };

  // Trend Area Chart
  const areaChartData = {
    labels: projections.map(p => p.month),
    datasets: [
      {
        label: 'Projected Sales (PHP)',
        data: projections.map(p => p.predictedRevenue),
        borderColor: '#00F2FF',
        backgroundColor: 'rgba(0, 242, 255, 0.15)',
        fill: true,
        tension: 0.35,
        yAxisID: 'ySales',
        pointBackgroundColor: '#00F2FF',
      },
      {
        label: 'Projected Demand (Sales Count)',
        data: projections.map(p => p.predictedDemand),
        borderColor: '#A855F7',
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        fill: true,
        tension: 0.35,
        yAxisID: 'yDemand',
        pointBackgroundColor: '#A855F7',
      }
    ]
  };

  const areaChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: 'rgba(255, 255, 255, 0.7)', font: { family: 'DM Sans', size: 10 } }
      }
    },
    scales: {
      ySales: {
        type: 'linear',
        position: 'left',
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#00F2FF', font: { size: 9 } }
      },
      yDemand: {
        type: 'linear',
        position: 'right',
        grid: { display: false },
        ticks: { color: '#A855F7', font: { size: 9 } }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 9 } }
      }
    }
  };

  // Forecast Accuracy Bar Chart
  const accuracyChartData = {
    labels: accuracyComparison.map(a => a.month),
    datasets: [
      {
        label: 'Actual Sales',
        data: accuracyComparison.map(a => a.actual),
        backgroundColor: '#00F2FF',
        borderRadius: 4,
      },
      {
        label: 'Predicted Sales',
        data: accuracyComparison.map(a => a.predicted),
        backgroundColor: '#A855F7',
        borderRadius: 4,
      }
    ]
  };

  // Branch Comparison Horizontal Bar Chart
  const branchChartData = {
    labels: branchRankings.map(b => b.branchName),
    datasets: [
      {
        label: 'Projected Revenue',
        data: branchRankings.map(b => b.predictedSales),
        backgroundColor: 'rgba(0, 242, 255, 0.65)',
        borderColor: '#00F2FF',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  const horizontalBarOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 10 } }
      },
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 9 } }
      }
    }
  };

  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: 'rgba(255, 255, 255, 0.7)', font: { family: 'DM Sans', size: 10 } }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 9 } }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 9 } }
      }
    }
  };


  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      
      {/* Print PDF Custom media stylesheet */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          aside, nav, header, select, button, .no-print, .filter-bar {
            display: none !important;
          }
          main {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-card {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid;
          }
          .text-main, h1, h2, h3, h4, p, span, td, th {
            color: #000000 !important;
          }
          .custom-scrollbar {
            overflow: visible !important;
          }
        }
      `}</style>

      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SALES FORECASTING" />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container">
            
            {/* Header info */}
            <div className="flex justify-between items-center mb-6 no-print">
              <div>
                <h1 className="text-2xl font-rajdhani font-black uppercase mb-0">
                  SALES <span className="text-brand-neonblue">FORECASTING</span>
                </h1>
                <p className="text-[10px] text-muted font-black tracking-[2px] uppercase mt-1">
                  Linear regression forecast model &middot; {startDate && endDate ? `${startDate} to ${endDate}` : ""} ({groupBy} group)
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={() => router.push('/forecasting/benchmark')}
                  className="h-8 px-3 bg-brand-neonblue/10 border border-brand-neonblue/30 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wider hover:bg-brand-neonblue/20 transition-all text-brand-neonblue"
                >
                  <Sliders size={13} /> Model Benchmarking
                </button>
                <button 
                  onClick={() => window.print()}
                  className="h-8 px-3 bg-brand-surface border border-border rounded-lg flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-wider hover:bg-brand-hover transition-all text-muted hover:text-main"
                >
                  <Printer size={13} className="text-brand-neonblue" /> Print PDF
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="h-8 px-3 bg-brand-surface border border-border rounded-lg flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-wider hover:bg-brand-hover transition-all text-muted hover:text-main"
                >
                  <FileSpreadsheet size={13} className="text-brand-purple" /> Export CSV
                </button>
              </div>
            </div>

            {/* Benchmark Recommendation Banner (when available) */}
            {data?.benchmarkRecommendation && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-brand-neonblue/10 via-purple-500/10 to-brand-surface border border-brand-neonblue/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-neonblue/20 flex items-center justify-center text-brand-neonblue shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-main">Recommended Model by Backtesting:</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-neonblue/20 text-brand-neonblue border border-brand-neonblue/40">
                        {data.benchmarkRecommendation.bestModel}
                      </span>
                      <span className="text-[10px] text-muted font-semibold">
                        (WAPE: {data.benchmarkRecommendation.wape}%, {data.benchmarkRecommendation.reliability} Reliability)
                      </span>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">
                      {data.benchmarkRecommendation.recommendationNotes}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/forecasting/benchmark')}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-brand-neonblue text-slate-950 font-bold rounded-xl text-xs hover:bg-brand-neonblue/90 transition shadow-sm"
                >
                  Benchmark Details <ArrowUpRight size={14} />
                </button>
              </div>
            )}

            {/* ── STICKY COMPACT FILTER BAR (no-print) ──────────────── */}
            <div className="sticky top-0 z-[100] bg-brand-surface/90 backdrop-blur-md border border-border/80 rounded-2xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-md filter-bar no-print">
              
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                
                {/* Branch dropdown */}
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="bg-brand-bgbase border border-border rounded-xl text-xs font-semibold px-3.5 h-9 text-main focus:outline-none focus:border-brand-neonblue/50 transition-all cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>

                {/* Date Filter dropdown */}
                <select
                  value={dateRange}
                  onChange={(e) => {
                    const newRange = e.target.value;
                    setDateRange(newRange);
                    const calculated = calculateDateRange(newRange);
                    setStartDate(calculated.startDate);
                    setEndDate(calculated.endDate);
                    setGroupBy(calculated.groupBy);
                    setHorizon(calculated.horizon);
                  }}
                  className="bg-brand-bgbase border border-border rounded-xl text-xs font-semibold px-3.5 h-9 text-main focus:outline-none focus:border-brand-neonblue/50 transition-all cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="1day">1 Day</option>
                  <option value="1week">1 Week</option>
                  <option value="1month">1 Month</option>
                  <option value="1year">1 Year</option>
                </select>

              </div>

              {/* Apply/Reset Actions */}
              <div className="flex gap-2">
                <button
                  onClick={applyFilters}
                  className="bg-brand-neonblue text-black font-black uppercase text-[10px] tracking-widest px-4 h-9 rounded-xl hover:bg-opacity-80 transition-all shadow-sm"
                >
                  Apply
                </button>
                <button
                  onClick={resetFilters}
                  className="bg-brand-bgbase border border-border text-muted font-black uppercase text-[10px] tracking-widest px-3.5 h-9 rounded-xl hover:bg-brand-hover hover:text-main transition-all"
                >
                  Reset
                </button>
              </div>

            </div>

            {/* ── MAIN DASHBOARD VIEW ───────────────────────────────── */}
            {loading ? (
              renderSkeleton()
            ) : (
              <>
                {/* Check for empty/missing data */}
                {trends.length === 0 && projections.length === 0 ? (
                  <div className="bg-brand-surface border border-border rounded-[24px] p-20 flex flex-col items-center justify-center text-center">
                    <Info size={32} className="text-brand-purple mb-4 animate-pulse" />
                    <h3 className="text-base font-rajdhani font-black uppercase text-main">No Data Available</h3>
                    <p className="text-xs text-muted max-w-sm mt-1 leading-relaxed">
                      We couldn't compile a prediction set for the chosen range. Try selecting different branch configurations or enlarging the date filters.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── ROW 1: Forecast KPI Cards ───────────────────── */}
                    <div className="responsive-grid mb-6">
                      <StatCard 
                        title="Predicted Sales" 
                        value={`₱${(data?.predictedSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        trend={data?.growthPercentage >= 0 ? `+${(data?.growthPercentage || 0).toFixed(1)}%` : `${(data?.growthPercentage || 0).toFixed(1)}%`}
                        subtext="Target Forecast Value" 
                        icon={PesoSign} 
                      />
                      <StatCard 
                        title="Predicted Demand" 
                        value={data?.predictedDemand ? `${data.predictedDemand.toLocaleString()} sales` : "0 sales"}
                        trend="Transactions" 
                        subtext="Projected transactions" 
                        icon={Activity} 
                      />
                      <StatCard 
                        title="Inventory Forecast" 
                        value={data?.predictedInventoryUsage ? `${data.predictedInventoryUsage.toLocaleString()} units` : "0 units"}
                        trend="Usage Quantity" 
                        subtext="Projected units flow" 
                        icon={Database} 
                      />
                      
                      {/* Gauge confidence ring */}
                      <div className="bg-brand-surface border border-border rounded-[24px] p-5 flex items-center justify-between print-card relative overflow-hidden">
                        <div className="flex flex-col">
                          <p className="text-[10px] text-muted font-black tracking-[1.5px] uppercase mb-1">
                            Confidence Index
                          </p>
                          <h3 className="text-xl font-rajdhani font-black uppercase mb-0 text-main">
                            {accuracyPercent}%
                          </h3>
                          <span className="text-[10px] text-muted font-semibold mt-1">
                            Accuracy · <strong className="text-brand-neonblue">{confidenceRating}</strong>
                          </span>
                        </div>

                        <div className="relative w-14 h-14">
                          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.2" />
                            <circle 
                              cx="18" cy="18" r="16" fill="none" 
                              stroke={accuracyPercent >= 85 ? "#10B981" : accuracyPercent >= 70 ? "#F59E0B" : "#EF4444"} 
                              strokeWidth="3.2" 
                              strokeDasharray={`${accuracyPercent} ${100 - accuracyPercent}`} 
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-main">
                            {confidenceRating}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── ROW 2: Primary Line & Trend Area ────────────── */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                      
                      {/* Historical vs Forecast line */}
                      <div className="bg-brand-surface border border-border rounded-[24px] p-6 shadow-sm print-card">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1.5 h-6 bg-brand-neonblue rounded-full" />
                          <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">
                            HISTORICAL VS FORECAST (LINE)
                          </h3>
                        </div>
                        <div className="h-[280px] w-full relative">
                          <Line data={lineChartData} options={baseChartOptions} />
                        </div>
                      </div>

                      {/* Forecast Trend Area */}
                      <div className="bg-brand-surface border border-border rounded-[24px] p-6 shadow-sm print-card">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1.5 h-6 bg-brand-purple rounded-full" />
                          <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">
                            FORECAST TREND (AREA)
                          </h3>
                        </div>
                        <div className="h-[280px] w-full relative">
                          <Line data={areaChartData} options={areaChartOptions} />
                        </div>
                      </div>

                    </div>

                    {/* ── ROW 3: Branch Comparatives & Accuracy Bar ───── */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                      
                      {/* Branch Forecast bar chart */}
                      <div className="bg-brand-surface border border-border rounded-[24px] p-6 shadow-sm print-card">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1.5 h-6 bg-brand-neonblue rounded-full" />
                          <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">
                            BRANCH COMPARISON
                          </h3>
                        </div>
                        <div className="h-[280px] w-full relative">
                          {branchRankings.length > 0 ? (
                            <Bar data={branchChartData} options={horizontalBarOptions} />
                          ) : (
                            <div className="text-center py-20 text-muted">No branch sales records found.</div>
                          )}
                        </div>
                      </div>

                      {/* Accuracy validation comparison */}
                      <div className="bg-brand-surface border border-border rounded-[24px] p-6 shadow-sm print-card">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1.5 h-6 bg-brand-purple rounded-full" />
                          <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">
                            FORECAST ACCURACY (PREDICTED VS ACTUAL)
                          </h3>
                        </div>
                        <div className="h-[280px] w-full relative">
                          <Bar data={accuracyChartData} options={baseChartOptions} />
                        </div>
                      </div>

                    </div>

                    {/* ── ROW 4: Insights & Forecast Table ────────────── */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
                      
                      {/* Forecast ledger list */}
                      <div className="xl:col-span-2 bg-brand-surface border border-border rounded-[24px] p-6 flex flex-col h-[340px] print-card">
                        <div className="flex items-center gap-3 mb-6 shrink-0">
                          <div className="w-1.5 h-5 bg-brand-neonblue rounded-full" />
                          <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">
                            FORECAST LEDGER
                          </h3>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                          {data?.tableData?.length > 0 ? (
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-border text-muted font-bold tracking-wider uppercase text-[9px] bg-brand-bgbase/40">
                                  <th className="py-2.5 px-3">Period</th>
                                  <th className="py-2.5 px-3 text-right">Actual (PHP)</th>
                                  <th className="py-2.5 px-3 text-right">Predicted (PHP)</th>
                                  <th className="py-2.5 px-3 text-right">Variance (PHP)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.tableData.map((row, idx) => (
                                  <tr key={idx} className="border-b border-border/40 hover:bg-brand-bgbase/25">
                                    <td className="py-2 px-3 font-semibold text-main">{row.period}</td>
                                    <td className="py-2 px-3 text-right font-medium text-main">
                                      {row.actual !== null ? `₱${row.actual.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-semibold text-brand-purple">
                                      ₱{row.predicted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className={`py-2 px-3 text-right font-bold ${row.actual === null ? 'text-muted' : (row.variance >= 0 ? 'text-green-500' : 'text-rose-500')}`}>
                                      {row.actual !== null ? (row.variance >= 0 ? `+₱${row.variance.toLocaleString()}` : `-₱${Math.abs(row.variance).toLocaleString()}`) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-center py-16 text-muted">No forecast data points generated.</div>
                          )}
                        </div>
                      </div>

                      {/* Automated insights box */}
                      <div className="bg-brand-surface border border-border rounded-[24px] p-6 flex flex-col h-[340px] print-card">
                        <div className="flex items-center gap-3 mb-6 shrink-0">
                          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                            <Lightbulb size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest mb-0">
                              FORECAST INSIGHTS
                            </h3>
                            <p className="text-[10px] text-muted font-bold uppercase mt-0.5">Automated Summaries</p>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                          {data?.insights?.length > 0 ? (
                            data.insights.map((insight, index) => (
                              <div key={index} className="p-4 bg-brand-bgbase/40 border border-border/60 rounded-2xl flex gap-3 items-start print-card">
                                <div className="w-2 h-2 rounded-full bg-brand-neonblue mt-1.5 shrink-0 animate-pulse" />
                                <p className="text-xs text-muted leading-relaxed font-semibold">{insight}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-16 text-muted text-xs">No insights detected.</div>
                          )}
                        </div>
                      </div>

                    </div>
                  </>
                )}
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default function ForecastingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-brand-bgbase text-main">
        <div className="text-[10px] font-black uppercase tracking-[4px] animate-pulse">Loading Forecasting...</div>
      </div>
    }>
      <ForecastingPageContent />
    </Suspense>
  );
}
