"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
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
  History,
  ShieldAlert,
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

const PesoSign = ({ size = "1.25rem" }) => (
  <span style={{ fontSize: size }} className="font-bold text-brand-neonblue">₱</span>
);

const RELIABILITY_CONFIG = {
  "High":     { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  "Moderate": { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   dot: "bg-amber-400" },
  "Low":      { color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    dot: "bg-rose-400" },
};

const MODEL_COLORS = {
  naive: "#94A3B8",
  moving_average: "#38BDF8",
  exponential_smoothing: "#F59E0B",
  holt_linear: "#A855F7",
  linear_regression: "#00F2FF",
  seasonal_naive: "#10B981",
};

function BenchmarkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isChecking } = useAuthGuard();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  // Filter States
  const [scopeType, setScopeType] = useState("all"); // 'all' | 'branch' | 'category' | 'product'
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [periodPreset, setPeriodPreset] = useState("12m");
  const [groupBy, setGroupBy] = useState("monthly");
  const [metricTarget, setMetricTarget] = useState("revenue"); // 'revenue' | 'quantity'
  const [selectedModelFilter, setSelectedModelFilter] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyRuns, setHistoryRuns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Custom date range state
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // RBAC Access Verification: Exclusively Super Admin
  useEffect(() => {
    if (!isChecking) {
      if (!user || user.role !== "super_admin") {
        router.replace("/dashboard");
      }
    }
  }, [user, isChecking, router]);

  // Load Metadata (Branches, Categories, Products)
  useEffect(() => {
    const fetchMetadata = async () => {
      const token = localStorage.getItem("token");
      try {
        const [bRes, cRes, pRes] = await Promise.all([
          fetch(apiUrl("/api/branches"), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(apiUrl("/api/categories"), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(apiUrl("/api/products?limit=200"), { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (bRes.ok) {
          const bData = await bRes.json();
          setBranches(Array.isArray(bData) ? bData : (bData?.branches || []));
        }
        if (cRes.ok) {
          const cData = await cRes.json();
          setCategories(Array.isArray(cData) ? cData : (cData?.categories || []));
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

  // Compute Dates based on preset
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
  const fetchBenchmark = async (forceRefresh = false) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const { start, end } = computeDateRange();

    const params = new URLSearchParams();
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    if (groupBy) params.set("frequency", groupBy);
    if (metricTarget) params.set("metric", metricTarget);
    if (forceRefresh) params.set("forceRefresh", "true");

    // Scope params
    params.set("scopeType", scopeType);
    if (scopeType === "branch" && selectedBranch !== "all") {
      params.set("branchId", selectedBranch);
    } else if (scopeType === "category" && selectedCategory !== "all") {
      params.set("categoryId", selectedCategory);
    } else if (scopeType === "product" && selectedProduct !== "all") {
      params.set("productId", selectedProduct);
    }

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
      } else if (res.status === 403) {
        showError("Access Denied", "Only Super Admin accounts have permission to run forecasting model benchmarks.");
        router.replace("/dashboard");
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

  // Load Benchmark History Runs
  const fetchHistory = async () => {
    setHistoryLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/analytics/benchmark/history?limit=15"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setHistoryRuns(json.runs || []);
      }
    } catch (err) {
      console.warn("Failed to load benchmark history:", err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmark();
  }, [scopeType, selectedBranch, selectedCategory, selectedProduct, periodPreset, groupBy, metricTarget, customStart, customEnd]);

  // Export to Excel
  const handleExport = () => {
    if (!data || !data.hasSufficientData) {
      showError("Export Failed", "No benchmark data available to export.");
      return;
    }

    try {
      const exportRows = (data.timeline || []).map(row => {
        const rowObj = {
          "Backtest Period": row.period,
          "Actual Recorded Demand": row.actual,
        };
        (data.models || []).forEach(m => {
          rowObj[`${m.modelName} (Forecast)`] = row.predictions?.[m.modelId] ?? "N/A";
        });
        return rowObj;
      });

      const summary = {
        "Benchmark Horizon": `${data.startDate} to ${data.endDate}`,
        "Evaluation Frequency": data.frequency?.toUpperCase(),
        "Validation Windows": data.validationWindows,
        "Target Metric": data.metric === 'quantity' ? "Units / Quantity" : "Revenue (PHP)",
        "Top Ranked Model": data.bestModel?.modelName || "N/A",
        "Best WAPE Error": `${data.bestModel?.wape}%`,
        "Primary MAE": `₱${data.bestModel?.mae?.toLocaleString()}`,
        "Primary RMSE": `₱${data.bestModel?.rmse?.toLocaleString()}`,
        "Reliability Tier": data.bestModel?.reliability || "Moderate",
        "Evaluation Method": "Walk-Forward Rolling-Origin Backtesting (Zero Data Leakage)"
      };

      exportToExcel(
        exportRows,
        `PC_Alley_Forecasting_Benchmark_${data.frequency}`,
        "Benchmark Backtesting Log",
        {
          title: "PC ALLEY FORECASTING MODEL BENCHMARK REPORT",
          subtitle: `Rolling-Origin Backtest Evaluation • Generated ${new Date().toLocaleDateString()}`,
          summary
        }
      );
      showSuccess("Export Completed", "Benchmark backtesting validation data exported successfully to Excel.");
    } catch (err) {
      showError("Export Error", "Failed to generate Excel export file.");
    }
  };

  // Filtered Products list
  const filteredProductBreakdown = (data?.productBreakdown || []).filter(p => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
  });

  // Chart Data: Actual vs Candidate Models Overlay
  const actualVsPredictedChartData = {
    labels: data?.timeline?.map(d => d.period) || [],
    datasets: [
      {
        label: "Actual Recorded Demand",
        data: data?.timeline?.map(d => d.actual) || [],
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.10)",
        fill: true,
        tension: 0.25,
        pointBackgroundColor: "#10B981",
        pointBorderColor: "#fff",
        pointHoverRadius: 6,
        borderWidth: 3
      },
      ...((data?.models || [])
        .filter(m => {
          if (!m.applicable) return false;
          if (selectedModelFilter === "all") {
            // Show Best Model, Naive baseline, and Holt or Linear
            return m.rank === 1 || m.modelId === "naive" || m.modelId === "holt_linear";
          }
          return m.modelId === selectedModelFilter;
        })
        .map(m => {
          const isBest = m.rank === 1;
          const color = MODEL_COLORS[m.modelId] || "#00F2FF";
          return {
            label: `${m.modelName} ${isBest ? "(Best)" : ""}`,
            data: data?.timeline?.map(d => d.predictions?.[m.modelId] ?? null) || [],
            borderColor: color,
            backgroundColor: "transparent",
            borderDash: isBest ? [] : [4, 4],
            tension: 0.25,
            pointBackgroundColor: color,
            pointBorderColor: "#fff",
            pointHoverRadius: isBest ? 6 : 4,
            borderWidth: isBest ? 2.5 : 1.75
          };
        }))
    ]
  };

  // Chart Data: Residuals / Error Over Time for Best Model
  const bestModelId = data?.bestModel?.modelId || "linear_regression";
  const residualsChartData = {
    labels: data?.timeline?.map(d => d.period) || [],
    datasets: [
      {
        label: `Residual Error (${data?.bestModel?.modelName || 'Best Model'} - Actual)`,
        data: data?.timeline?.map(d => {
          const pred = d.predictions?.[bestModelId] ?? 0;
          return parseFloat((pred - d.actual).toFixed(2));
        }) || [],
        backgroundColor: data?.timeline?.map(d => {
          const res = (d.predictions?.[bestModelId] ?? 0) - d.actual;
          return res >= 0 ? "rgba(0, 242, 255, 0.65)" : "rgba(244, 63, 94, 0.65)";
        }) || [],
        borderColor: data?.timeline?.map(d => {
          const res = (d.predictions?.[bestModelId] ?? 0) - d.actual;
          return res >= 0 ? "#00F2FF" : "#F43F5E";
        }) || [],
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
          font: { family: 'inherit', size: 11 },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: '#0B132B',
        titleColor: '#F8FAFC',
        bodyColor: '#94A3B8',
        borderColor: '#1E293B',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += (data?.metric === 'quantity' ? '' : '₱') + context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 });
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748B', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: {
          color: '#64748B',
          font: { size: 11 },
          callback: function (val) {
            const prefix = data?.metric === 'quantity' ? '' : '₱';
            return prefix + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val);
          }
        }
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title="DECISION INTELLIGENCE FORECAST BENCHMARKING" />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top Title & Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-brand-neonblue/10 text-brand-neonblue border border-brand-neonblue/30 uppercase">
                  Rolling-Origin Backtest
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                  Zero Data Leakage
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase">
                  Super Admin Only
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5 flex items-center gap-2">
                MODEL BENCHMARKING &amp; <span className="text-brand-neonblue">EVALUATION</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Scientific walk-forward backtesting across 6 candidate algorithms to identify PC Alley&apos;s most accurate forecasting model.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => {
                  fetchHistory();
                  setIsHistoryOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
              >
                <History className="w-4 h-4 text-purple-400" />
                Benchmark Runs
              </button>
              <button
                onClick={() => setIsMethodologyOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
              >
                <HelpCircle className="w-4 h-4 text-brand-neonblue" />
                Methodology Guide
              </button>
              <button
                onClick={() => fetchBenchmark(true)}
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
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 text-xs">
            {/* Scope Level */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Scope Level
              </label>
              <select
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
              >
                <option value="all">Business-Wide (Consolidated)</option>
                <option value="branch">Branch Specific</option>
                <option value="category">Category Specific</option>
                <option value="product">Product Specific</option>
              </select>
            </div>

            {/* Dynamic Scope Target (Branch, Category, or Product) */}
            {scopeType === "branch" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Target Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
                >
                  <option value="all">All Branches</option>
                  {(branches || []).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {scopeType === "category" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Target Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
                >
                  <option value="all">All Categories</option>
                  {(categories || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {scopeType === "product" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Target Product
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
                >
                  <option value="all">Select Product...</option>
                  {(products || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Target Metric */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Evaluation Metric
              </label>
              <select
                value={metricTarget}
                onChange={(e) => setMetricTarget(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
              >
                <option value="revenue">Sales Revenue (₱)</option>
                <option value="quantity">Units Sold (Volume)</option>
              </select>
            </div>

            {/* Granularity */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Granularity
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
              >
                <option value="monthly">Monthly (Standard)</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>

            {/* Period Window */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Validation Window
              </label>
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
              >
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="12m">Last 12 Months (Recommended)</option>
                <option value="24m">Last 24 Months</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Model Focus Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Model Visual Focus
              </label>
              <select
                value={selectedModelFilter}
                onChange={(e) => setSelectedModelFilter(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-neonblue transition"
              >
                <option value="all">Key Models Comparison</option>
                <option value="naive">Naive (Baseline)</option>
                <option value="moving_average">Moving Average</option>
                <option value="exponential_smoothing">Simple Exponential Smoothing</option>
                <option value="holt_linear">Holt&apos;s Linear Trend</option>
                <option value="linear_regression">Linear Regression</option>
                <option value="seasonal_naive">Seasonal Naive</option>
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

          {/* Insufficient Data Guard Alert */}
          {data && !data.hasSufficientData && !loading && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-amber-300">Data Sufficiency Advisory: Insufficient Validation Series</h3>
                <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                  {data.message || "To guarantee statistical validity without data leakage, walk-forward rolling-origin backtesting requires at least 4 historical periods."}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-300 bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800">
                    Found Periods: {data.totalPoints || 0} / {data.minRequired || 4}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Switch granularity to <strong>Weekly</strong> or <strong>Daily</strong>, or select a broader date window.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Best Model Recommendation Highlight Banner */}
          {data?.hasSufficientData && data?.bestModel && (
            <div className="bg-gradient-to-r from-brand-neonblue/15 via-purple-500/10 to-slate-900/80 border border-brand-neonblue/40 p-5 rounded-2xl backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-neonblue/20 border border-brand-neonblue/40 flex items-center justify-center text-brand-neonblue shrink-0 mt-0.5">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-brand-neonblue/20 text-brand-neonblue">
                      Recommended Champion
                    </span>
                    <span className="text-base font-black text-white">
                      {data.bestModel.modelName}
                    </span>
                    {data.bestModel.liftVsNaivePercent !== null && data.bestModel.liftVsNaivePercent > 0 && (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        +{data.bestModel.liftVsNaivePercent}% accuracy lift vs baseline
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {data.bestModel.recommendationReason}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 bg-slate-950/70 px-4 py-2.5 rounded-xl border border-slate-800">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Primary Error (WAPE)</div>
                  <div className="text-lg font-black text-brand-neonblue">{data.bestModel.wape}%</div>
                </div>
                <div className="h-7 w-px bg-slate-800" />
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Reliability Tier</div>
                  <div className={`text-sm font-bold ${RELIABILITY_CONFIG[data.bestModel.reliability]?.color || 'text-slate-300'}`}>
                    {data.bestModel.reliability}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KPI Summary Cards */}
          {data?.hasSufficientData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Primary WAPE Error */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Primary WAPE</span>
                  <Percent className="w-4 h-4 text-brand-neonblue" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-brand-neonblue mt-2">
                  {data.bestModel?.wape ?? 0}%
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Weighted Abs % Error (Zero-Safe)</p>
              </div>

              {/* MAE */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mean Abs Error</span>
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-2 flex items-center gap-1">
                  {data.metric === 'quantity' ? '' : <PesoSign size="1.25rem" />}
                  {data.bestModel?.mae?.toLocaleString() ?? 0}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Average step deviation</p>
              </div>

              {/* RMSE */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Root Mean Sq Error</span>
                  <Activity className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-2 flex items-center gap-1">
                  {data.metric === 'quantity' ? '' : <PesoSign size="1.25rem" />}
                  {data.bestModel?.rmse?.toLocaleString() ?? 0}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Penalizes extreme outliers</p>
              </div>

              {/* Directional Bias */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Directional Bias</span>
                  <Gauge className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-2">
                  {data.bestModel?.bias > 0 ? `+${data.bestModel.bias}` : (data.bestModel?.bias ?? 0)}
                </div>
                <div className="mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${data.bestModel?.directionalBias === 'Over-forecasting' ? 'bg-cyan-500/10 text-cyan-400' : data.bestModel?.directionalBias === 'Under-forecasting' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
                    {data.bestModel?.directionalBias || 'Unbiased'}
                  </span>
                </div>
              </div>

              {/* Validation Windows */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Backtest Windows</span>
                  <Layers className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-2">
                  {data.validationWindows || 0}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Rolling evaluation steps</p>
              </div>

              {/* Reliability Tier */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reliability</span>
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </div>
                <div className={`text-2xl sm:text-3xl font-black mt-2 ${RELIABILITY_CONFIG[data.bestModel?.reliability]?.color || 'text-slate-300'}`}>
                  {data.bestModel?.reliability || 'Moderate'}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Based on error &amp; test size</p>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          {data?.hasSufficientData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Actual vs Candidate Models Line Chart */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-brand-neonblue" />
                      Historical Walk-Forward Backtesting Trajectory
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ground truth actual sales vs candidate predictions at each rolling test window.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                    {data.validationWindows} Cutoffs Evaluated
                  </span>
                </div>
                <div className="h-64 sm:h-72">
                  <Line data={actualVsPredictedChartData} options={chartOptions} />
                </div>
              </div>

              {/* Residuals / Directional Bias Bar Chart */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      Prediction Error &amp; Residual Diagnostic
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Residual values (<span className="text-cyan-400">Cyan = Over-forecast</span>, <span className="text-rose-400">Rose = Under-forecast</span>).
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                    Zero Baseline Ideal
                  </span>
                </div>
                <div className="h-64 sm:h-72">
                  <Bar data={residualsChartData} options={chartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Model Comparison Leaderboard Table */}
          {data?.hasSufficientData && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-brand-neonblue" />
                    Forecasting Model Benchmark Leaderboard
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Rigorous ranking ordered by lowest WAPE error across {data.validationWindows} rolling backtest intervals.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  {data.models?.length || 0} Algorithms Evaluated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Rank</th>
                      <th className="px-5 py-3">Forecasting Algorithm</th>
                      <th className="px-5 py-3 text-right">WAPE (%)</th>
                      <th className="px-5 py-3 text-right">MAE</th>
                      <th className="px-5 py-3 text-right">RMSE</th>
                      <th className="px-5 py-3 text-right">MAPE (%)</th>
                      <th className="px-5 py-3 text-right">Directional Bias</th>
                      <th className="px-5 py-3 text-center">Reliability</th>
                      <th className="px-5 py-3 text-center">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {(data?.models || []).map((m) => {
                      const isBest = m.rank === 1;
                      const rel = RELIABILITY_CONFIG[m.reliability] || RELIABILITY_CONFIG["Moderate"];

                      return (
                        <tr key={m.modelId} className={`hover:bg-slate-800/30 transition ${isBest ? "bg-brand-neonblue/5 font-semibold" : ""}`}>
                          <td className="px-5 py-3.5">
                            {m.rank ? (
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${isBest ? "bg-brand-neonblue text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                                #{m.rank}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 flex items-center gap-2">
                            {isBest && <Award className="w-4 h-4 text-brand-neonblue shrink-0" />}
                            <div>
                              <div className="text-white font-semibold">{m.modelName}</div>
                              {m.modelId === "naive" && (
                                <div className="text-[10px] text-slate-400">Baseline Benchmark</div>
                              )}
                              {!m.applicable && (
                                <div className="text-[10px] text-rose-400">{m.ineligibilityReason}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-brand-neonblue">
                            {m.wape !== null ? `${m.wape}%` : "N/A"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-200">
                            {m.mae !== null ? (data.metric === 'quantity' ? m.mae : `₱${m.mae.toLocaleString()}`) : "N/A"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-200">
                            {m.rmse !== null ? (data.metric === 'quantity' ? m.rmse : `₱${m.rmse.toLocaleString()}`) : "N/A"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-200">
                            {m.mape !== null ? `${m.mape}%` : "N/A"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${m.bias > 0 ? 'text-cyan-300 bg-cyan-500/10' : m.bias < 0 ? 'text-rose-300 bg-rose-500/10' : 'text-slate-400'}`}>
                              {m.bias !== null ? (m.bias > 0 ? `+${m.bias}` : m.bias) : "N/A"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${rel.bg} ${rel.color} ${rel.border}`}>
                              {m.reliability}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {isBest ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-neonblue/20 text-brand-neonblue border border-brand-neonblue/40 uppercase">
                                Recommended Champion
                              </span>
                            ) : m.applicable ? (
                              <span className="text-[11px] text-slate-500">Candidate</span>
                            ) : (
                              <span className="text-[11px] text-rose-500">Ineligible</span>
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

          {/* Product-Level Model Benchmarking Breakdown */}
          {data?.hasSufficientData && data?.productBreakdown?.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Product-Level Model Accuracy Breakdown
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Granular backtesting evaluation for individual catalog products.
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
                      <th className="px-5 py-3 text-right">Historical Revenue</th>
                      <th className="px-5 py-3 text-right">Units Sold</th>
                      <th className="px-5 py-3">Top Performing Model</th>
                      <th className="px-5 py-3 text-right">Best WAPE (%)</th>
                      <th className="px-5 py-3 text-right">MAE</th>
                      <th className="px-5 py-3 text-center">Reliability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredProductBreakdown.map(p => {
                      const rel = RELIABILITY_CONFIG[p.reliability] || RELIABILITY_CONFIG["Moderate"];
                      return (
                        <tr key={p.productId} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3 font-semibold text-white">{p.name}</td>
                          <td className="px-5 py-3 font-mono text-slate-400 text-[11px]">{p.sku || "N/A"}</td>
                          <td className="px-5 py-3 text-right font-mono text-slate-200">₱{p.totalRevenue?.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right font-mono text-slate-200">{p.totalUnits}</td>
                          <td className="px-5 py-3 font-semibold text-brand-neonblue">{p.bestModelName}</td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-emerald-400">
                            {p.bestWape !== null ? `${p.bestWape}%` : 'N/A'}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-slate-200">
                            {p.mae !== null ? `₱${p.mae.toLocaleString()}` : 'N/A'}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${rel.bg} ${rel.color} ${rel.border}`}>
                              {p.reliability}
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

          {/* Detailed Period-by-Period Backtest Timeline Table */}
          {data?.hasSufficientData && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-brand-neonblue" />
                    Chronological Backtesting Validation Log
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Step-by-step rolling validation log comparing actual sales against individual candidate predictions.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  {data.timeline?.length || 0} Test Windows
                </span>
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-5 py-3">Period</th>
                      <th className="px-5 py-3 text-right">Actual Outcome</th>
                      <th className="px-5 py-3 text-right">Best Model Pred</th>
                      <th className="px-5 py-3 text-right">Naive Baseline Pred</th>
                      <th className="px-5 py-3 text-right">Absolute Error</th>
                      <th className="px-5 py-3 text-center">Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {(data?.timeline || []).map((row, idx) => {
                      const bestPred = row.predictions?.[bestModelId] ?? 0;
                      const naivePred = row.predictions?.['naive'] ?? 0;
                      const err = parseFloat((bestPred - row.actual).toFixed(2));
                      const absErr = Math.abs(err);
                      const isOver = err > 0;
                      const isExact = err === 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3 font-semibold text-slate-200">{row.period}</td>
                          <td className="px-5 py-3 text-right font-mono text-emerald-400 font-semibold">
                            {data.metric === 'quantity' ? '' : '₱'}{row.actual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-cyan-300 font-semibold">
                            {data.metric === 'quantity' ? '' : '₱'}{bestPred.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-slate-400">
                            {data.metric === 'quantity' ? '' : '₱'}{naivePred.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-slate-300">
                            {data.metric === 'quantity' ? '' : '₱'}{absErr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {isExact ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Exact Match
                              </span>
                            ) : isOver ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                +{absErr.toLocaleString()} (Over)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                -{absErr.toLocaleString()} (Under)
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

      {/* Historical Benchmark Runs Drawer / Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl text-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Saved Historical Benchmark Executions
                </h3>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {historyLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading execution history...</div>
              ) : historyRuns.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No saved benchmark runs found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5">Date Executed</th>
                        <th className="px-4 py-2.5">Scope</th>
                        <th className="px-4 py-2.5">Window</th>
                        <th className="px-4 py-2.5">Frequency</th>
                        <th className="px-4 py-2.5">Best Model</th>
                        <th className="px-4 py-2.5 text-right">WAPE</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {historyRuns.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-4 py-2.5 text-slate-300 font-mono">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 uppercase font-semibold text-slate-200">
                            {r.scope_type}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400">
                            {r.start_date} to {r.end_date}
                          </td>
                          <td className="px-4 py-2.5 uppercase text-slate-300">
                            {r.frequency}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-brand-neonblue">
                            {r.best_model || "N/A"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-400 font-bold">
                            {r.best_wape !== null ? `${r.best_wape}%` : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Methodology Guide Modal */}
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
                  <h4 className="font-bold text-brand-neonblue uppercase tracking-wider text-[11px]">
                    1. Walk-Forward Rolling-Origin Validation (Zero Data Leakage)
                  </h4>
                  <p className="mt-1">
                    Standard random cross-validation leaks future information into historical models. PC Alley uses strict <strong>walk-forward rolling-origin evaluation</strong>: to forecast period <em>T</em>, models are trained strictly on data from periods <em>0 to T-1</em>. Zero future information is accessible during each prediction step.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-brand-neonblue uppercase tracking-wider text-[11px]">
                    2. Pluggable Candidate Algorithms
                  </h4>
                  <ul className="mt-1.5 space-y-1 list-disc list-inside text-slate-400">
                    <li><strong>Naive Baseline:</strong> Projects the most recent observed period into the future.</li>
                    <li><strong>Moving Average (SMA):</strong> Averages the most recent <em>k</em> periods to dampen short-term volatility.</li>
                    <li><strong>Simple Exponential Smoothing (SES):</strong> Exponentially weights recent sales without storing entire windows.</li>
                    <li><strong>Holt&apos;s Linear Trend:</strong> Dual-parameter smoothing capturing ongoing trajectory and momentum.</li>
                    <li><strong>Linear Regression:</strong> Ordinary Least Squares trend-line fitting across the training span.</li>
                    <li><strong>Seasonal Naive:</strong> Copies the observation from the corresponding season of the previous cycle.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-brand-neonblue uppercase tracking-wider text-[11px]">
                    3. WAPE vs. MAPE &amp; Metrics
                  </h4>
                  <p className="mt-1">
                    In retail and inventory management, zero-sales periods cause MAPE (Mean Absolute % Error) to divide by zero and explode. PC Alley utilizes <strong>WAPE (Weighted Absolute % Error)</strong>:
                  </p>
                  <div className="bg-slate-950 p-2.5 rounded-xl font-mono text-[11px] text-cyan-300 my-1.5 border border-slate-800">
                    WAPE = ( Σ |Actual - Predicted| / Σ Actual ) × 100%
                  </div>
                  <p className="text-slate-400">
                    WAPE is completely resilient to zero-sales periods and directly weights high-volume and low-volume items appropriately.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-brand-neonblue uppercase tracking-wider text-[11px]">
                    4. Directional Bias Metric
                  </h4>
                  <p className="mt-1 text-slate-400">
                    Calculated as <code>Mean(Predicted - Actual)</code>. A positive bias indicates systematic over-forecasting (overstock risk), while a negative bias indicates systematic under-forecasting (stockout risk).
                  </p>
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
