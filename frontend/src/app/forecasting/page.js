"use client";

import { useEffect, useState, useRef } from "react";
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

export default function ForecastingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isChecking } = useAuthGuard();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [branches, setBranches] = useState([]);
  
  // ── FILTER STATES ──────────────────────────────────────────────────────────
  const [branch, setBranch] = useState("all");
  const [forecastType, setForecastType] = useState("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("monthly");
  const [horizon, setHorizon] = useState("3m");
  
  // Custom Date Picker Dropdown State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const calendarRef = useRef(null);

  // Validation Error state
  const [dateError, setDateError] = useState("");

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
      const queryType = searchParams.get("forecastType");
      const queryStart = searchParams.get("startDate");
      const queryEnd = searchParams.get("endDate");
      const queryGroup = searchParams.get("groupBy");
      const queryHorizon = searchParams.get("horizon");

      let finalBranch = "all";
      let finalType = "sales";
      let finalStart = "";
      let finalEnd = "";
      let finalGroup = "monthly";
      let finalHorizon = "3m";

      const cached = localStorage.getItem("forecasting_filters");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          finalBranch = parsed.branch || "all";
          finalType = parsed.forecastType || "sales";
          finalStart = parsed.startDate || "";
          finalEnd = parsed.endDate || "";
          finalGroup = parsed.groupBy || "monthly";
          finalHorizon = parsed.horizon || "3m";
        } catch (e) {}
      }

      if (queryBranch) finalBranch = queryBranch;
      if (queryType) finalType = queryType;
      if (queryStart) finalStart = queryStart;
      if (queryEnd) finalEnd = queryEnd;
      if (queryGroup) finalGroup = queryGroup;
      if (queryHorizon) finalHorizon = queryHorizon;

      // If dates are not set, default to last 6 months
      if (!finalStart || !finalEnd) {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 6);
        finalStart = formatDateStr(start);
        finalEnd = formatDateStr(end);
      }

      setBranch(finalBranch);
      setForecastType(finalType);
      setStartDate(finalStart);
      setEndDate(finalEnd);
      setGroupBy(finalGroup);
      setHorizon(finalHorizon);

      fetchForecastData({
        branch: finalBranch,
        forecastType: finalType,
        startDate: finalStart,
        endDate: finalEnd,
        groupBy: finalGroup,
        horizon: finalHorizon
      });
    }
  }, [user]);

  // Handle outside click to close calendar popup
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setBranches(await res.json());
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
    // Validate range
    if (new Date(startDate) > new Date(endDate)) {
      setDateError("Start Date cannot exceed End Date.");
      return;
    }
    const todayStr = formatDateStr(new Date());
    if (startDate > todayStr || endDate > todayStr) {
      setDateError("Cannot select future dates.");
      return;
    }
    setDateError("");
    setIsCalendarOpen(false);

    // Save and push URL
    const updated = { branch, forecastType, startDate, endDate, groupBy, horizon };
    localStorage.setItem("forecasting_filters", JSON.stringify(updated));

    const params = new URLSearchParams(updated);
    window.history.pushState(null, "", `?${params.toString()}`);

    fetchForecastData(updated);
  };

  const resetFilters = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);

    const defaults = {
      branch: "all",
      forecastType: "sales",
      startDate: formatDateStr(start),
      endDate: formatDateStr(end),
      groupBy: "monthly",
      horizon: "3m"
    };

    setBranch(defaults.branch);
    setForecastType(defaults.forecastType);
    setStartDate(defaults.startDate);
    setEndDate(defaults.endDate);
    setGroupBy(defaults.groupBy);
    setHorizon(defaults.horizon);
    setDateError("");
    setIsCalendarOpen(false);

    localStorage.setItem("forecasting_filters", JSON.stringify(defaults));
    window.history.pushState(null, "", `?branch=all&forecastType=sales&startDate=${defaults.startDate}&endDate=${defaults.endDate}&groupBy=monthly&horizon=3m`);

    fetchForecastData(defaults);
  };

  const handlePresetClick = (preset) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case "Today":
        break;
      case "Last 7 Days":
        start.setDate(today.getDate() - 7);
        break;
      case "Last 30 Days":
        start.setDate(today.getDate() - 30);
        break;
      case "This Month":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "Last Month":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "Last 3 Months":
        start.setMonth(today.getMonth() - 3);
        break;
      case "Last 6 Months":
        start.setMonth(today.getMonth() - 6);
        break;
      case "This Year":
        start = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        break;
    }

    const startStr = formatDateStr(start);
    const endStr = formatDateStr(end);

    setStartDate(startStr);
    setEndDate(endStr);

    // Apply default Group By rule: <= 30 days -> Daily, else -> Monthly
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let nextGroup = "monthly";
    if (diffDays <= 30) {
      nextGroup = "daily";
    }
    setGroupBy(nextGroup);

    // Dynamic state update directly
    setDateError("");
    setIsCalendarOpen(false);

    const updated = { branch, forecastType, startDate: startStr, endDate: endStr, groupBy: nextGroup, horizon };
    localStorage.setItem("forecasting_filters", JSON.stringify(updated));

    const params = new URLSearchParams(updated);
    window.history.pushState(null, "", `?${params.toString()}`);

    fetchForecastData(updated);
  };

  // ── CUSTOM CALENDAR MATH ──────────────────────────────────────────────────
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const handleDayClick = (dayNum) => {
    const selectedDate = new Date(calYear, calMonth, dayNum);
    const selectedDateStr = formatDateStr(selectedDate);
    const todayStr = formatDateStr(new Date());

    if (selectedDateStr > todayStr) return; // Clamped to today

    if (!startDate || (startDate && endDate)) {
      setStartDate(selectedDateStr);
      setEndDate("");
    } else if (startDate && !endDate) {
      if (selectedDateStr < startDate) {
        setStartDate(selectedDateStr);
      } else {
        setEndDate(selectedDateStr);
        // Automatically check group by rule
        const diffTime = Math.abs(selectedDate - new Date(startDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          setGroupBy("daily");
        } else {
          setGroupBy("monthly");
        }
      }
    }
  };

  const nextCalMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  const prevCalMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
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

  // Date range picker visual helper
  const datePlaceholderText = startDate && endDate 
    ? `${new Date(startDate).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })} → ${new Date(endDate).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : "Select Date Range 📅";

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
        <TopBar title="DECISION INTELLIGENCE FORECASTING" />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container">
            
            {/* Header info */}
            <div className="flex justify-between items-center mb-6 no-print">
              <div>
                <h1 className="text-2xl font-rajdhani font-black uppercase mb-0">
                  DECISION <span className="text-brand-neonblue">FORECASTING</span>
                </h1>
                <p className="text-[10px] text-muted font-black tracking-[2px] uppercase mt-1">
                  Linear regression forecast model &middot; {startDate && endDate ? `${startDate} to ${endDate}` : ""} ({groupBy} group)
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
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

            {/* ── STICKY COMPACT FILTER BAR (no-print) ──────────────── */}
            <div className="sticky top-0 z-[100] bg-brand-surface/90 backdrop-blur-md border border-border/80 rounded-2xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-md filter-bar no-print">
              
              <div className="flex flex-wrap items-center gap-2 flex-1">
                
                {/* Branch dropdown */}
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="bg-brand-bgbase border border-border rounded-xl text-xs font-semibold px-3 h-9 text-main focus:outline-none"
                >
                  <option value="all">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>

                {/* Forecast Type dropdown */}
                <select
                  value={forecastType}
                  onChange={(e) => setForecastType(e.target.value)}
                  className="bg-brand-bgbase border border-border rounded-xl text-xs font-semibold px-3 h-9 text-main focus:outline-none"
                >
                  <option value="sales">Sales Forecast</option>
                  <option value="inventory">Inventory Forecast</option>
                  <option value="demand">Demand Forecast</option>
                </select>

                {/* Date range picker dropdown trigger */}
                <div className="relative" ref={calendarRef}>
                  <button
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className="bg-brand-bgbase border border-border rounded-xl text-xs font-semibold px-3 h-9 text-main flex items-center gap-2 hover:bg-brand-hover/40 transition-all"
                  >
                    <CalendarDays size={14} className="text-brand-neonblue" />
                    <span>{datePlaceholderText}</span>
                  </button>

                  {/* Calendar Popup card */}
                  <AnimatePresence>
                    {isCalendarOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 mt-2 bg-brand-surface border border-border rounded-2xl p-4 shadow-xl z-[200] w-[460px] flex gap-4"
                      >
                        {/* Quick Presets left panel */}
                        <div className="w-[130px] border-r border-border/60 pr-3 flex flex-col gap-1.5 shrink-0">
                          <p className="text-[9px] text-muted font-black tracking-wider uppercase mb-1">Quick Presets</p>
                          {["Today", "Last 7 Days", "Last 30 Days", "This Month", "Last Month", "Last 3 Months", "Last 6 Months", "This Year"].map(preset => (
                            <button
                              key={preset}
                              onClick={() => handlePresetClick(preset)}
                              className="text-left text-[10px] font-bold text-muted hover:text-brand-neonblue px-2 py-1.5 rounded-lg hover:bg-brand-bgbase/40 transition-colors"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        {/* Visual Month calendar grid right panel */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <button onClick={prevCalMonth} className="text-muted hover:text-main p-1"><ChevronLeft size={14} /></button>
                            <span className="text-[11px] font-black uppercase text-main">
                              {new Date(calYear, calMonth).toLocaleString("default", { month: "long", year: "numeric" })}
                            </span>
                            <button onClick={nextCalMonth} className="text-muted hover:text-main p-1"><ChevronRight size={14} /></button>
                          </div>

                          {/* Grid days layout */}
                          <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-muted mb-1">
                            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => <span key={d}>{d}</span>)}
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {/* Empty space pads */}
                            {Array.from({ length: startDayOfMonth(calMonth, calYear) - 1 }).map((_, idx) => (
                              <span key={`pad-${idx}`} />
                            ))}
                            {/* Monthly day days list */}
                            {Array.from({ length: daysInMonth(calMonth, calYear) }).map((_, idx) => {
                              const dayNum = idx + 1;
                              const currentSelected = new Date(calYear, calMonth, dayNum);
                              const currentSelectedStr = formatDateStr(currentSelected);
                              const isStart = startDate === currentSelectedStr;
                              const isEnd = endDate === currentSelectedStr;
                              const inRange = startDate && endDate && currentSelectedStr >= startDate && currentSelectedStr <= endDate;
                              const todayStr = formatDateStr(new Date());
                              const isFuture = currentSelectedStr > todayStr;

                              return (
                                <button
                                  key={dayNum}
                                  onClick={() => handleDayClick(dayNum)}
                                  disabled={isFuture}
                                  className={`h-6 rounded-md flex items-center justify-center font-semibold text-[10px] transition-all 
                                    ${isFuture ? "text-border cursor-not-allowed" : "text-main hover:bg-brand-neonblue/20"}
                                    ${isStart ? "bg-brand-neonblue text-black font-black" : ""}
                                    ${isEnd ? "bg-brand-purple text-white font-black" : ""}
                                    ${inRange && !isStart && !isEnd ? "bg-brand-neonblue/10" : ""}
                                  `}
                                >
                                  {dayNum}
                                </button>
                              );
                            })}
                          </div>

                          {/* Range values info status */}
                          <div className="mt-3 border-t border-border/40 pt-2 flex flex-col gap-1 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-muted">Start: {startDate || "—"}</span>
                              <span className="text-muted">End: {endDate || "—"}</span>
                            </div>
                            {dateError && <span className="text-rose-500 font-bold mt-1 text-[9px]">{dateError}</span>}
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Group By selector */}
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="bg-brand-bgbase border border-border rounded-xl text-xs font-semibold px-3 h-9 text-main focus:outline-none"
                >
                  <option value="daily">Daily Grouping</option>
                  <option value="weekly">Weekly Grouping</option>
                  <option value="monthly">Monthly Grouping</option>
                  <option value="quarterly">Quarterly Grouping</option>
                  <option value="yearly">Yearly Grouping</option>
                </select>

                {/* Horizon Prediction selector */}
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  className="bg-brand-bgbase border border-border rounded-xl text-xs font-semibold px-3 h-9 text-main focus:outline-none"
                >
                  <option value="7d">Next 7 Days</option>
                  <option value="30d">Next 30 Days</option>
                  <option value="3m">Next 3 Months</option>
                  <option value="6m">Next 6 Months</option>
                  <option value="1y">Next Year</option>
                </select>

              </div>

              {/* Apply/Reset Actions */}
              <div className="flex gap-2">
                <button
                  onClick={applyFilters}
                  className="bg-brand-neonblue text-black font-black uppercase text-[10px] tracking-widest px-4 h-9 rounded-xl hover:bg-opacity-80 transition-all"
                >
                  Apply
                </button>
                <button
                  onClick={resetFilters}
                  className="bg-brand-bgbase border border-border text-muted font-black uppercase text-[10px] tracking-widest px-3 h-9 rounded-xl hover:bg-brand-hover/40 transition-all"
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
