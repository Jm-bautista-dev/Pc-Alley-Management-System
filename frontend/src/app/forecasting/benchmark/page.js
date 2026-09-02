"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import {
  TrendingUp,
  Award,
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
  Sparkles,
  Info,
  BarChart3,
  Search,
  HelpCircle,
  X,
  Target,
  ArrowUpRight,
  TrendingDown,
  Gauge,
  Percent,
  CircleDollarSign,
  ChevronDown
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
import { exportToExcel } from "@/lib/excelExport";

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

const PERFORMANCE_CONFIG = {
  "Excellent":         { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  "Good":              { color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/30",    dot: "bg-blue-400" },
  "Fair":              { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   dot: "bg-amber-400" },
  "Needs Improvement": { color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    dot: "bg-rose-400" },
  "Insufficient Data": { color: "text-slate-400",   bg: "bg-slate-500/10",   border: "border-slate-500/30",   dot: "bg-slate-400" },
};

function BenchmarkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isChecking } = useAuthGuard();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);

  // Filter States
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [periodPreset, setPeriodPreset] = useState("12m");
  const [groupBy, setGroupBy] = useState("monthly");
  const [selectedModelFilter, setSelectedModelFilter] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  // Custom date range state
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // RBAC Access Verification
  useEffect(() => {
    if (!isChecking) {
      if (!user || (user.role !== "super_admin" && user.role !== "branch_admin")) {
        router.replace("/dashboard");
      }
    }
  }, [user, isChecking, router]);

  // Load Branches & Products
  useEffect(() => {
    const fetchMetadata = async () => {
      const token = localStorage.getItem("token");
      try {
        const [bRes, pRes] = await Promise.all([
          fetch(apiUrl("/api/branches"), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(apiUrl("/api/products?limit=200"), { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (bRes.ok) {
          const bData = await bRes.json();
          setBranches(Array.isArray(bData) ? bData : (bData?.branches || []));
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          setProducts(Array.isArray(pData) ? pData : (pData?.products || []));
        }
      } catch (err) {
        console.error("Failed to load benchmark metadata:", err);
      }
    };
    fetchMetadata();
  }, []);

  // Calculate Dates based on preset
  const computeDateRange = () => {
    if (periodPreset === "custom" && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    const end = new Date();
    const start = new Date();
    if (periodPreset === "3m") start.setMonth(start.getMonth() - 3);
    else if (periodPreset === "6m") start.setMonth(start.getMonth() - 6);
    else if (periodPreset === "12m") start.setMonth(start.getMonth() - 12);
    else if (periodPreset === "24m") start.setMonth(start.getMonth() - 24);

    return {
      start: start.toISOString().substring(0, 10),
      end: end.toISOString().substring(0, 10)
    };
  };

  // Fetch Benchmark Data
  const fetchBenchmark = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const { start, end } = computeDateRange();

    const params = new URLSearchParams();
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    if (selectedBranch && selectedBranch !== "all") params.set("branchId", selectedBranch);
    if (selectedProduct && selectedProduct !== "all") params.set("productId", selectedProduct);
    if (groupBy) params.set("groupBy", groupBy);

    try {
      const res = await fetch(apiUrl(`/api/analytics/benchmark?${params.toString()}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-access-token": token || ""
        }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json().catch(() => ({}));
        showError("Benchmark Error", errJson.message || "Failed to calculate forecasting benchmark metrics.");
      }
    } catch (err) {
      showError("Connection Error", "Could not connect to predictive benchmarking engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmark();
  }, [selectedBranch, selectedProduct, periodPreset, groupBy, customStart, customEnd]);

  // Export to Excel / CSV
  const handleExport = () => {
    if (!data || !data.hasSufficientData) {
      showError("Export Failed", "No benchmark data available to export.");
      return;
    }

    try {
      const exportRows = data.backtestHistory.map(row => ({
        "Evaluation Period": row.period,
        "Actual Recorded Sales (PHP)": row.actual,
        "Model Forecast (PHP)": row.predicted,
        "Absolute Error (PHP)": row.absError,
        "Percentage Error (%)": row.pctError !== null ? `${row.pctError}%` : "N/A",
        "Residual Error (PHP)": row.residual
      }));

      const summary = {
        "Benchmark Horizon": data.benchmarkPeriod,
        "Evaluation Granularity": data.granularity.toUpperCase(),
        "Evaluated Periods Count": data.evaluatedPeriodsCount,
        "Overall Forecast Accuracy": `${data.overallMetrics.accuracy}% (${data.overallMetrics.performance})`,
        "Mean Absolute Error (MAE)": `₱${data.overallMetrics.mae.toLocaleString()}`,
        "Root Mean Squared Error (RMSE)": `₱${data.overallMetrics.rmse.toLocaleString()}`,
        "Mean Absolute Percentage Error (MAPE)": `${data.overallMetrics.mape}%`,
        "Recommended Forecasting Model": data.bestModel?.name || "N/A"
      };

      exportToExcel(
        exportRows,
        `Forecasting_Model_Benchmark_${data.granularity}`,
        "Benchmark Results",
        {
          title: "PREDICTIVE ANALYTICS MODEL BENCHMARKING REPORT",
          subtitle: `Time-Series Backtesting Validation • Generated ${new Date().toLocaleDateString()}`,
          summary
        }
      );
      showSuccess("Export Completed", "Benchmark validation data exported successfully to Excel.");
    } catch (err) {
      showError("Export Error", "Failed to generate Excel export file.");
    }
  };

  // Filtered Products list
  const filteredProductBenchmarks = (data?.productBenchmarks || []).filter(p => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
  });

  // Chart Data: Actual vs Predicted
  const actualVsPredictedChartData = {
    labels: data?.backtestHistory?.map(d => d.period) || [],
    datasets: [
      {
        label: "Actual Recorded Sales",
        data: data?.backtestHistory?.map(d => d.actual) || [],
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#10B981",
        pointBorderColor: "#fff",
        pointHoverRadius: 6,
        borderWidth: 2.5
      },
      {
        label: `${data?.bestModel?.name || 'Primary Model'} Forecast`,
        data: data?.backtestHistory?.map(d => d.predicted) || [],
        borderColor: "#00F2FF",
        backgroundColor: "transparent",
        borderDash: [5, 5],
        tension: 0.3,
        pointBackgroundColor: "#00F2FF",
        pointBorderColor: "#fff",
        pointHoverRadius: 6,
        borderWidth: 2.5
      }
    ]
  };

  // Chart Data: Residuals / Error Over Time
  const residualsChartData = {
    labels: data?.backtestHistory?.map(d => d.period) || [],
    datasets: [
      {
        label: "Prediction Error (Forecast - Actual)",
        data: data?.backtestHistory?.map(d => d.residual) || [],
        backgroundColor: data?.backtestHistory?.map(d => d.residual >= 0 ? "rgba(0, 242, 255, 0.7)" : "rgba(244, 63, 94, 0.7)") || [],
        borderColor: data?.backtestHistory?.map(d => d.residual >= 0 ? "#00F2FF" : "#F43F5E") || [],
        borderWidth: 1.5,
        borderRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94A3B8',
          font: { family: 'inherit', size: 12 },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#F8FAFC',
        bodyColor: '#94A3B8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += '₱' + context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 });
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748B', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: '#64748B',
          font: { size: 11 },
          callback: function (val) {
            return '₱' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val);
          }
        }
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title="PREDICTIVE ANALYTICS BENCHMARKING" />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top Title & Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-brand-neonblue/10 text-brand-neonblue border border-brand-neonblue/30 uppercase">
                  Time-Series Validation
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                  Zero Data Leakage
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5 flex items-center gap-2">
                FORECASTING MODEL <span className="text-brand-neonblue">BENCHMARKING</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Objective evaluation of predictive analytics accuracy via chronological rolling-origin backtesting against actual records.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setIsMethodologyOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
              >
                <HelpCircle className="w-4 h-4 text-brand-neonblue" />
                Methodology Guide
              </button>
              <button
                onClick={fetchBenchmark}
                disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
              >
                <RefreshCw className={`w-4 h-4 text-slate-300 ${loading ? "animate-spin" : ""}`} />
                Recalculate
              </button>
              <button
                onClick={handleExport}
                disabled={!data?.hasSufficientData}
                className="flex items-center gap-2 px-4 py-2 bg-brand-neonblue hover:bg-brand-neonblue/90 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-brand-neonblue/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-4 h-4" />
                Export Benchmark (.xlsx)
              </button>
            </div>
          </div>

          {/* Filter Controls Toolbar */}
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
            {/* Branch Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Branch Sector
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
              >
                <option value="all">All Branches (Consolidated)</option>
                {(branches || []).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Product Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Product Scope
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
              >
                <option value="all">All Products (Aggregate Revenue)</option>
                {(products || []).map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'})</option>
                ))}
              </select>
            </div>

            {/* Granularity */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Forecast Granularity
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
              >
                <option value="monthly">Monthly (Recommended)</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            {/* Period Preset */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Benchmark Window
              </label>
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
              >
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="12m">Last 12 Months (Standard)</option>
                <option value="24m">Last 24 Months</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Model Comparison Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Model Focus
              </label>
              <select
                value={selectedModelFilter}
                onChange={(e) => setSelectedModelFilter(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
              >
                <option value="all">All Candidate Models</option>
                <option value="linear_regression">Linear Regression</option>
                <option value="moving_average">Simple Moving Average</option>
                <option value="exponential_smoothing">Exponential Smoothing</option>
              </select>
            </div>
          </div>

          {/* Custom Date Inputs when 'custom' is active */}
          {periodPreset === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-slate-900/30 p-4 rounded-xl border border-slate-800 flex items-center gap-4 text-xs"
            >
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-brand-neonblue"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-brand-neonblue"
                />
              </div>
            </motion.div>
          )}

          {/* Insufficient Data Banner */}
          {data && !data.hasSufficientData && !loading && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-amber-300">Insufficient Historical Sales Data</h3>
                <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                  {data.message || "To perform time-series rolling-origin validation without data leakage, at least 4 historical chronological periods are required for sequential model training and testing."}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-300 bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800">
                    Observed Periods: {data.timeSeriesLength || 0} / {data.requiredLength || 4}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Try switching granularity to <strong>Daily</strong> or widening the benchmark date window.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* KPI Summary Cards */}
          {data?.hasSufficientData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Forecast Accuracy */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Forecast Accuracy</span>
                  <Award className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
                  {data.overallMetrics.accuracy}%
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PERFORMANCE_CONFIG[data.overallMetrics.performance]?.bg} ${PERFORMANCE_CONFIG[data.overallMetrics.performance]?.color} ${PERFORMANCE_CONFIG[data.overallMetrics.performance]?.border}`}>
                    {data.overallMetrics.performance}
                  </span>
                </div>
              </div>

              {/* MAE */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mean Abs Error (MAE)</span>
                  <Target className="w-4 h-4 text-brand-neonblue" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-2 flex items-center gap-1">
                  <PesoSign size="1.25rem" />
                  {data.overallMetrics.mae.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Average deviation per period</p>
              </div>

              {/* RMSE */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Root Mean Sq Error</span>
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-2 flex items-center gap-1">
                  <PesoSign size="1.25rem" />
                  {data.overallMetrics.rmse.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Penalizes large error outliers</p>
              </div>

              {/* MAPE */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">MAPE Error</span>
                  <Percent className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-2">
                  {data.overallMetrics.mape}%
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Mean Absolute % Error</p>
              </div>

              {/* R² */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">R² Determination</span>
                  <Gauge className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-indigo-300 mt-2">
                  {data.overallMetrics.r2 !== null ? data.overallMetrics.r2 : "N/A"}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Explained variance ratio</p>
              </div>

              {/* Recommended Model */}
              <div className="bg-gradient-to-br from-brand-neonblue/10 via-slate-900/80 to-slate-950 border border-brand-neonblue/30 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-neonblue">Top Model</span>
                  <Sparkles className="w-4 h-4 text-brand-neonblue" />
                </div>
                <div className="text-sm font-black text-white mt-2 truncate">
                  {data.bestModel?.name || "Linear Regression"}
                </div>
                <p className="text-[10px] text-slate-300 mt-1 line-clamp-2">
                  {data.bestModel?.recommendationReason || "Lowest empirical MAE error."}
                </p>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          {data?.hasSufficientData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Actual vs Predicted Chart */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-brand-neonblue" />
                      Actual vs Predicted Historical Trajectory
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Visual comparison of historical sales records vs rolling model forecast.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                    {data.evaluatedPeriodsCount} Backtest Intervals
                  </span>
                </div>
                <div className="h-64 sm:h-72">
                  <Line data={actualVsPredictedChartData} options={chartOptions} />
                </div>
              </div>

              {/* Residuals / Error Analysis Chart */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      Prediction Error & Residual Analysis
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Residual values (<span className="text-brand-neonblue">Cyan = Over</span>, <span className="text-rose-400">Rose = Under</span>).
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                    Zero Mean Ideal
                  </span>
                </div>
                <div className="h-64 sm:h-72">
                  <Bar data={residualsChartData} options={chartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Model Comparison Table */}
          {data?.hasSufficientData && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-brand-neonblue" />
                    Predictive Model Benchmark Comparison
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Side-by-side evaluation of candidate forecasting algorithms on the identical historical validation window.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  Evaluated on {data.evaluatedPeriodsCount} periods
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Model Architecture</th>
                      <th className="px-5 py-3 text-right">MAE (₱)</th>
                      <th className="px-5 py-3 text-right">RMSE (₱)</th>
                      <th className="px-5 py-3 text-right">MAPE (%)</th>
                      <th className="px-5 py-3 text-right">WAPE (%)</th>
                      <th className="px-5 py-3 text-right">R² Score</th>
                      <th className="px-5 py-3 text-right">Accuracy Score</th>
                      <th className="px-5 py-3 text-center">Performance Rating</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {(data?.modelsComparison || []).map((m, idx) => {
                      const isBest = idx === 0;
                      const perf = PERFORMANCE_CONFIG[m.performance] || PERFORMANCE_CONFIG["Needs Improvement"];

                      return (
                        <tr key={m.id} className={`hover:bg-slate-800/30 transition ${isBest ? "bg-brand-neonblue/5 font-semibold" : ""}`}>
                          <td className="px-5 py-3.5 flex items-center gap-2">
                            {isBest && <Award className="w-4 h-4 text-brand-neonblue shrink-0" />}
                            <span className="text-white">{m.name}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-200">₱{m.mae.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-200">₱{m.rmse.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-200">{m.mape}%</td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-200">{m.wape}%</td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-200">{m.r2 !== null ? m.r2 : "N/A"}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-400">{m.accuracy}%</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${perf.bg} ${perf.color} ${perf.border}`}>
                              {m.performance}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {isBest ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-neonblue/20 text-brand-neonblue border border-brand-neonblue/40 uppercase">
                                Recommended
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">Candidate</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Product-Level Benchmarking Breakdown */}
          {data?.hasSufficientData && data?.productBenchmarks?.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Product-Level Model Benchmarking
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Granular forecast accuracy breakdown per individual catalog item.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search product or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-neonblue transition"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-5 py-3">Product Name</th>
                      <th className="px-5 py-3">SKU</th>
                      <th className="px-5 py-3 text-right">Units Sold</th>
                      <th className="px-5 py-3 text-right">MAE (Units)</th>
                      <th className="px-5 py-3 text-right">RMSE (Units)</th>
                      <th className="px-5 py-3 text-right">MAPE (%)</th>
                      <th className="px-5 py-3 text-right">Accuracy</th>
                      <th className="px-5 py-3 text-center">Reliability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredProductBenchmarks.map(p => {
                      const perf = PERFORMANCE_CONFIG[p.performance] || PERFORMANCE_CONFIG["Needs Improvement"];
                      return (
                        <tr key={p.productId} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3 font-semibold text-white">{p.name}</td>
                          <td className="px-5 py-3 font-mono text-slate-400 text-[11px]">{p.sku || "N/A"}</td>
                          <td className="px-5 py-3 text-right font-mono text-slate-200">{p.totalUnits}</td>
                          <td className="px-5 py-3 text-right font-mono text-slate-200">{p.mae}</td>
                          <td className="px-5 py-3 text-right font-mono text-slate-200">{p.rmse}</td>
                          <td className="px-5 py-3 text-right font-mono text-slate-200">{p.mape}%</td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-emerald-400">{p.accuracy}%</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${perf.bg} ${perf.color} ${perf.border}`}>
                              {p.performance}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Period-by-Period Backtest Table */}
          {data?.hasSufficientData && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-brand-neonblue" />
                    Chronological Backtesting Validation Log
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Step-by-step historical prediction vs actual outcome comparison without data leakage.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  {data.backtestHistory.length} Test Iterations
                </span>
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-5 py-3">Backtest Period</th>
                      <th className="px-5 py-3 text-right">Actual Recorded Sales</th>
                      <th className="px-5 py-3 text-right">Model Prediction</th>
                      <th className="px-5 py-3 text-right">Absolute Error</th>
                      <th className="px-5 py-3 text-right">Percentage Error</th>
                      <th className="px-5 py-3 text-center">Residual Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {(data?.backtestHistory || []).map((row, idx) => {
                      const isOver = row.error > 0;
                      const isExact = row.error === 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3 font-semibold text-slate-200">{row.period}</td>
                          <td className="px-5 py-3 text-right font-mono text-emerald-400 font-semibold">
                            ₱{row.actual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-cyan-300 font-semibold">
                            ₱{row.predicted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-slate-300">
                            ₱{row.absError.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-slate-300">
                            {row.pctError !== null ? `${row.pctError}%` : "N/A"}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {isExact ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Exact Match
                              </span>
                            ) : isOver ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                +₱{row.error.toLocaleString()} (Over-forecast)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                -₱{Math.abs(row.error).toLocaleString()} (Under-forecast)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Methodology & Formulas Modal */}
      <AnimatePresence>
        {isMethodologyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl text-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-brand-neonblue" />
                  Forecasting Model Benchmarking Methodology
                </h3>
                <button
                  onClick={() => setIsMethodologyOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-slate-300 leading-relaxed">
                <div>
                  <h4 className="font-bold text-brand-neonblue uppercase tracking-wider text-[11px]">1. Rolling-Origin Backtesting (Zero Data Leakage)</h4>
                  <p className="mt-1">
                    Unlike standard random train/test splitting, time-series data requires chronological evaluation. The benchmarking engine evaluates historical period <em>T</em> by training the model strictly on records available prior to <em>T</em>. Future data is strictly sealed until after the prediction is produced.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-brand-neonblue uppercase tracking-wider text-[11px]">2. Accuracy Metrics Formulas</h4>
                  <ul className="mt-1.5 space-y-1.5 list-disc list-inside text-slate-400">
                    <li><strong>MAE (Mean Absolute Error):</strong> <code className="text-slate-200">Σ|Actual - Predicted| / N</code> — Represents average absolute dollar/unit deviation.</li>
                    <li><strong>RMSE (Root Mean Squared Error):</strong> <code className="text-slate-200">sqrt(Σ(Actual - Predicted)² / N)</code> — Penalizes larger forecasting errors more heavily.</li>
                    <li><strong>MAPE (Mean Absolute % Error):</strong> <code className="text-slate-200">(100 / k) * Σ(|Actual - Predicted| / Actual)</code> for non-zero periods.</li>
                    <li><strong>WAPE (Weighted Absolute % Error):</strong> <code className="text-slate-200">100 * (Σ|Actual - Predicted| / ΣActual)</code> — Handles zero actual sales robustly.</li>
                    <li><strong>R² (Coefficient of Determination):</strong> Measures the proportion of variance in historical sales explained by the predictive model.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-brand-neonblue uppercase tracking-wider text-[11px]">3. Performance Tier Standards</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-center">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="font-bold text-emerald-400">Excellent</div>
                      <div className="text-[10px] text-slate-400">Error ≤ 10%</div>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                      <div className="font-bold text-blue-400">Good</div>
                      <div className="text-[10px] text-slate-400">10% &lt; Error ≤ 20%</div>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div className="font-bold text-amber-400">Fair</div>
                      <div className="text-[10px] text-slate-400">20% &lt; Error ≤ 30%</div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
                      <div className="font-bold text-rose-400">Needs Impr.</div>
                      <div className="text-[10px] text-slate-400">Error &gt; 30%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setIsMethodologyOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition"
                >
                  Close Guide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BenchmarkPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#070b14] text-brand-neonblue">
        <div className="text-xs font-black tracking-widest uppercase animate-pulse">Loading Predictive Benchmark Engine...</div>
      </div>
    }>
      <BenchmarkContent />
    </Suspense>
  );
}
