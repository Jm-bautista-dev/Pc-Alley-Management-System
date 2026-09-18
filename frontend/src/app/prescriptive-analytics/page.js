"use client";

import { useEffect, useState, Fragment } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  Zap,
  Package,
  TrendingDown,
  Tag,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  FileDown,
  ChevronRight,
  Target,
  BarChart2,
  Lightbulb,
  Brain,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  X,
  ExternalLink,
  Filter,
  Sparkles,
  Info,
  SlidersHorizontal,
  Check,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { exportToExcel } from "@/lib/excelExport";
import { apiUrl } from "@/lib/api";
import { showSuccess } from "@/context/ModalContext";

const PRIORITY_CONFIG = {
  High:   { color: "text-rose-500 dark:text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/25",   dot: "bg-rose-500"   },
  Medium: { color: "text-amber-500 dark:text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/25",  dot: "bg-amber-500"  },
  Low:    { color: "text-emerald-500 dark:text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/25",dot: "bg-emerald-500"},
};

const RECOMMENDATION_ICONS = {
  "Increase inventory":           { icon: ArrowUpRight,  color: "#06B6D4" },
  "Reduce overstock":             { icon: TrendingDown,  color: "#F59E0B" },
  "Promote low-performing items": { icon: Tag,           color: "#A855F7" },
  "Adjust purchasing":            { icon: ShoppingCart,  color: "#10B981" },
  default:                        { icon: Zap,           color: "#06B6D4" },
};

function getRecIcon(text) {
  for (const key of Object.keys(RECOMMENDATION_ICONS)) {
    if (key !== "default" && text?.toLowerCase().includes(key.toLowerCase())) {
      return RECOMMENDATION_ICONS[key];
    }
  }
  return RECOMMENDATION_ICONS.default;
}

export default function PrescriptiveAnalyticsPage() {
  const router   = useRouter();
  const { user, isChecking } = useAuthGuard();

  const [loading,          setLoading]          = useState(true);
  const [data,             setData]             = useState(null);
  const [branches,         setBranches]         = useState([]);
  const [selectedBranch,   setSelectedBranch]   = useState("");
  const [activeCategory,   setActiveCategory]   = useState("all");
  const [searchQuery,      setSearchQuery]      = useState("");
  const [filterPriority,   setFilterPriority]   = useState("All");
  const [expandedRow,      setExpandedRow]      = useState(null);

  // ── RBAC ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isChecking && (!user || user.role !== "super_admin")) {
      router.replace("/dashboard");
    }
  }, [user, isChecking, router]);

  // ── Data fetch ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchBranches();
      fetchPrescriptiveData();
    }
  }, [selectedBranch, user]);

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setBranches(await res.json());
    } catch {}
  };

  const fetchPrescriptiveData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const params = new URLSearchParams();
      if (selectedBranch) params.set("branchId", selectedBranch);

      const res = await fetch(apiUrl(`/api/analytics/prescriptive?${params}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Failed to load prescriptive analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (customActions = null, title = "Prescriptive_Analytics_Report") => {
    const targetActions = customActions || filteredActions;
    if (!targetActions.length) return;
    const rows = targetActions.map(r => ({
      Issue:               r.issue,
      Recommendation:      r.recommendation,
      "Expected Impact":   r.expectedImpact,
      Priority:            r.priority,
      "Why Generated":     r.why,
      "Supporting Metrics":r.metrics,
      "Confidence (%)":    r.confidence,
    }));
    exportToExcel(rows, title, "Recommended Actions");
    showSuccess("Export Completed", "Prescriptive actions report exported to Excel.");
  };

  // ── Loading / guard states ───────────────────────────────────────────────────
  if (isChecking || !user || user.role !== "super_admin") {
    return (
      <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans justify-center items-center">
        <RefreshCw size={24} className="animate-spin text-brand-neonblue" />
      </div>
    );
  }

  // ── Derived actions ──────────────────────────────────────────────────────────
  const actions   = data?.actions || data?.actionsTable || [];
  const highCount = actions.filter(a => a.priority === "High" || a.issue?.toLowerCase().includes("stock") || a.recommendation?.toLowerCase().includes("restock")).length;
  const medCount  = actions.filter(a => a.priority === "Medium" || a.issue?.toLowerCase().includes("overstock") || a.issue?.toLowerCase().includes("surplus")).length;
  const lowCount  = actions.filter(a => a.priority === "Low" || a.issue?.toLowerCase().includes("promo") || a.issue?.toLowerCase().includes("merchandis") || a.recommendation?.toLowerCase().includes("bundle")).length;
  const adjustCount = actions.length;

  // 4 Primary Decision Modules
  const decisionModules = [
    {
      id: "increase_inventory",
      title: "Increase Inventory",
      shortTitle: "Stock Restock Alerts",
      description: "Restock items approaching safety-stock threshold to avoid sales loss and stockout penalties.",
      strategyGuide: "Algorithmic safety-stock trigger evaluating real-time depletion rate against supplier lead times. Prioritize purchase orders and internal transfer requests for these high-velocity items immediately.",
      icon: ArrowUpRight,
      color: "#06B6D4",
      count: highCount,
      priority: "High",
      badgeText: `${highCount} High-Priority Alerts`,
      impactHeadline: "Prevent Immediate Revenue Loss & Stockouts",
      matchFn: (a) => a.priority === "High" || a.issue?.toLowerCase().includes("stock") || a.recommendation?.toLowerCase().includes("restock")
    },
    {
      id: "reduce_overstock",
      title: "Reduce Overstock",
      shortTitle: "Surplus & Holding Capital",
      description: "Excess inventory detected. Bundle or promote to clear surplus holdings and free up working capital.",
      strategyGuide: "Items exceeding 45-day sales turnover velocity. Bundling with fast-moving complementary components or offering clearance incentives will prevent dead-stock depreciation.",
      icon: TrendingDown,
      color: "#F59E0B",
      count: medCount,
      priority: "Medium",
      badgeText: `${medCount} Medium-Priority Alerts`,
      impactHeadline: "Release Locked Working Capital & Warehouse Space",
      matchFn: (a) => a.priority === "Medium" || a.issue?.toLowerCase().includes("overstock") || a.issue?.toLowerCase().includes("surplus")
    },
    {
      id: "promote_low_performers",
      title: "Promote Low Performers",
      shortTitle: "Merchandising & Growth",
      description: "Launch targeted promos, service bundles, or cash register add-on incentives to boost stagnant product lines.",
      strategyGuide: "High-margin or lagging items with steady foot traffic but low conversion. Attach PC diagnosis, warranties, or assembly services to uplift gross revenue across target branches.",
      icon: Tag,
      color: "#A855F7",
      count: lowCount,
      priority: "Low",
      badgeText: `${lowCount} Low-Priority Alerts`,
      impactHeadline: "Accelerate Sluggish Inventory with High-Margin Value Adds",
      matchFn: (a) => a.priority === "Low" || a.issue?.toLowerCase().includes("promo") || a.issue?.toLowerCase().includes("merchandis") || a.recommendation?.toLowerCase().includes("bundle")
    },
    {
      id: "adjust_purchasing",
      title: "Adjust Purchasing",
      shortTitle: "Cadence & PO Planning",
      description: "Recalibrate PO cadence, supplier order intervals, and batch sizes based on current demand forecasts.",
      strategyGuide: "Holistic procurement balancing. Synchronizes reorder points across all branch hubs to maximize supplier volume discounts and minimize storage overhead.",
      icon: ShoppingCart,
      color: "#10B981",
      count: adjustCount,
      priority: "All",
      badgeText: `${adjustCount} Total Actions`,
      impactHeadline: "Optimize Supplier Order Cycles & Procurement Spend",
      matchFn: (a) => true
    },
  ];

  // Active module object (or null if "all")
  const activeModule = decisionModules.find(m => m.id === activeCategory);

  // Filter actions based on active module + priority filter + search
  const categoryActions = activeModule
    ? actions.filter(activeModule.matchFn)
    : actions;

  const filteredActions = categoryActions.filter(a => {
    const matchesPriority = filterPriority === "All" || a.priority === filterPriority;
    const matchesSearch = !searchQuery || 
      a.issue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.recommendation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.why?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="PRESCRIPTIVE ANALYTICS" />

        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container">

            {/* ── Page header ─────────────────────────────────────────── */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6">
              <div>
                <h1 className="text-2xl font-rajdhani font-black uppercase mb-0 flex items-center gap-2.5">
                  <span>PRESCRIPTIVE <span className="text-brand-neonblue">ANALYTICS</span></span>
                  {activeModule && (
                    <span 
                      className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm"
                      style={{ 
                        background: `${activeModule.color}15`, 
                        color: activeModule.color, 
                        borderColor: `${activeModule.color}35` 
                      }}
                    >
                      {activeModule.title} Mode
                    </span>
                  )}
                </h1>
                <p className="text-[10px] text-muted font-bold tracking-[2px] uppercase mt-1">
                  AI-Driven Recommendations &amp; Business Action Intelligence
                </p>
              </div>

              {/* ── Filters & Global Actions ─────────────────────────────── */}
              <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted font-bold uppercase">Sector:</span>
                  <select
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                    className="bg-brand-surface border border-border rounded-lg text-xs font-semibold px-3 py-2 text-main focus:outline-none shadow-sm"
                  >
                    <option value="">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted font-bold uppercase">Priority:</span>
                  <select
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                    className="bg-brand-surface border border-border rounded-lg text-xs font-semibold px-3 py-2 text-main focus:outline-none shadow-sm"
                  >
                    <option value="All">All Priorities</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <button
                  onClick={() => handleExport(filteredActions, activeModule ? `Prescriptive_${activeModule.id}` : "Prescriptive_Analytics_Report")}
                  className="h-9 px-4 bg-brand-surface border border-border rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-brand-hover transition-all text-main shadow-sm"
                >
                  <FileDown size={14} className="text-brand-neonblue" /> Export (.xlsx)
                </button>

                <button
                  onClick={fetchPrescriptiveData}
                  className="h-9 w-9 bg-brand-surface border border-border rounded-lg flex items-center justify-center hover:bg-brand-hover transition-all text-main shadow-sm"
                  title="Refresh recommendations"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin text-brand-neonblue" : ""} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-3">
                <Brain size={40} className="text-brand-neonblue animate-pulse" />
                <p className="text-xs text-muted font-bold uppercase tracking-wider">
                  Compiling AI recommendations…
                </p>
              </div>
            ) : (
              <>
                {/* ── 4 Interactive Decision Modules (Page Content Driver) ──── */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-neonblue" />
                      Interactive Decision Modules (Select module to dynamically filter page content)
                    </p>
                    {activeCategory !== "all" && (
                      <button
                        onClick={() => setActiveCategory("all")}
                        className="text-[10px] font-bold text-brand-neonblue hover:underline flex items-center gap-1"
                      >
                        <RefreshCw size={11} /> Show All Modules Overview
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {decisionModules.map((module, idx) => {
                      const Icon = module.icon;
                      const isActive = activeCategory === module.id;

                      return (
                        <motion.button
                          key={module.id}
                          onClick={() => {
                            if (isActive) {
                              setActiveCategory("all");
                            } else {
                              setActiveCategory(module.id);
                            }
                          }}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05, duration: 0.25 }}
                          className={`
                            relative bg-brand-surface border rounded-[22px] p-5 flex flex-col justify-between text-left
                            shadow-sm hover:shadow-xl transition-all group overflow-hidden cursor-pointer
                            ${isActive 
                              ? "ring-2 shadow-lg -translate-y-1" 
                              : "border-border hover:border-brand-neonblue/40"
                            }
                          `}
                          style={{
                            borderColor: isActive ? module.color : undefined,
                            boxShadow: isActive ? `0 10px 25px -5px ${module.color}25` : undefined,
                          }}
                        >
                          {/* Top active pill indicator */}
                          {isActive && (
                            <div 
                              className="absolute top-0 right-0 left-0 h-1.5"
                              style={{ background: module.color }}
                            />
                          )}

                          <div>
                            {/* Header Icon + Badge */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div
                                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105"
                                style={{ 
                                  background: isActive ? module.color : `${module.color}15`, 
                                  border: `1px solid ${module.color}40` 
                                }}
                              >
                                <Icon size={20} style={{ color: isActive ? "#FFFFFF" : module.color }} />
                              </div>
                              <span
                                className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-sm"
                                style={{ 
                                  background: `${module.color}15`, 
                                  color: module.color, 
                                  borderColor: `${module.color}35` 
                                }}
                              >
                                {module.badgeText}
                              </span>
                            </div>

                            {/* Title & Description */}
                            <p className="text-sm font-rajdhani font-black uppercase text-main mb-1 flex items-center justify-between">
                              <span style={{ color: isActive ? module.color : undefined }}>{module.title}</span>
                              <ChevronRight 
                                size={15} 
                                className={`transition-transform duration-200 ${isActive ? "rotate-90 text-brand-neonblue" : "text-muted group-hover:translate-x-1"}`} 
                              />
                            </p>
                            <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{module.description}</p>
                          </div>

                          {/* Footer Action State */}
                          <div 
                            className="mt-4 pt-3 border-t flex items-center justify-between text-[10px] font-bold"
                            style={{ borderColor: isActive ? `${module.color}30` : undefined }}
                          >
                            <span 
                              className="flex items-center gap-1.5 font-bold uppercase tracking-wider"
                              style={{ color: isActive ? module.color : undefined }}
                            >
                              {isActive ? (
                                <>
                                  <Check size={13} /> Active Filter
                                </>
                              ) : (
                                "Apply View"
                              )}
                            </span>
                            <span 
                              className={`text-[9px] uppercase px-2 py-0.5 rounded transition ${
                                isActive 
                                  ? "text-white font-bold" 
                                  : "bg-brand-bgbase text-muted group-hover:text-main"
                              }`}
                              style={{ background: isActive ? module.color : undefined }}
                            >
                              {isActive ? "Filtered" : "Click to view →"}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Active Module Directive Banner (Inlined on Page) ──────── */}
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-brand-surface border rounded-[24px] p-5 sm:p-6 mb-8 shadow-sm relative overflow-hidden"
                  style={{
                    borderColor: activeModule ? `${activeModule.color}40` : undefined
                  }}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md mt-0.5"
                        style={{
                          background: activeModule ? `${activeModule.color}18` : "rgba(6,182,212,0.15)",
                          border: `1px solid ${activeModule ? activeModule.color : "#06B6D4"}40`
                        }}
                      >
                        {activeModule ? (
                          <activeModule.icon size={24} style={{ color: activeModule.color }} />
                        ) : (
                          <Brain size={24} className="text-brand-neonblue" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap mb-1">
                          <span 
                            className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
                            style={{
                              background: activeModule ? `${activeModule.color}15` : "#06B6D415",
                              color: activeModule ? activeModule.color : "#06B6D4",
                              borderColor: activeModule ? `${activeModule.color}35` : "#06B6D435"
                            }}
                          >
                            {activeModule ? activeModule.shortTitle : "Integrated Overview"}
                          </span>
                          <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                            Target Sector: {selectedBranch ? branches.find(b => String(b.id) === String(selectedBranch))?.name || "Selected Branch" : "All Branch Outlets"}
                          </span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-rajdhani font-black uppercase text-main leading-tight">
                          {activeModule ? activeModule.title : "Holistic Prescriptive Directives"}
                        </h2>
                        <p className="text-xs text-muted mt-1 leading-relaxed max-w-4xl">
                          {activeModule ? activeModule.strategyGuide : "Multi-variable prescriptive model analyzing real-time POS velocity, stock buffer thresholds, supplier lead times, and turnover rates across all branches."}
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats Strip on the Right */}
                    <div className="flex items-center gap-3 w-full lg:w-auto shrink-0 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
                      <div className="bg-brand-bgbase/60 rounded-2xl p-3 border border-border text-center min-w-[95px] flex-1 lg:flex-none">
                        <span className="text-[9px] font-bold uppercase text-muted block">Directives</span>
                        <span className="text-base font-black text-main">{categoryActions.length}</span>
                      </div>
                      <div className="bg-brand-bgbase/60 rounded-2xl p-3 border border-border text-center min-w-[95px] flex-1 lg:flex-none">
                        <span className="text-[9px] font-bold uppercase text-muted block">Priority Focus</span>
                        <span 
                          className="text-xs font-black uppercase"
                          style={{ color: activeModule ? activeModule.color : "#06B6D4" }}
                        >
                          {activeModule ? activeModule.priority : "Mixed"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* ── Opportunity Analysis (Context-Aware) ────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
                  {/* High-demand / Low Stock */}
                  <div className={`bg-brand-surface border rounded-[20px] p-5 shadow-sm transition-all ${
                    activeCategory === "increase_inventory" ? "border-rose-500 ring-2 ring-rose-500/20" : "border-border"
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                          <AlertTriangle size={15} className="text-rose-500 dark:text-rose-400" />
                        </div>
                        <div>
                          <p className="text-xs font-rajdhani font-black uppercase text-main">High Demand / Low Stock</p>
                          <p className="text-[9px] text-muted font-bold uppercase">Immediate Restock Required</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveCategory("increase_inventory")}
                        className="text-[10px] font-bold text-brand-neonblue hover:underline"
                      >
                        {activeCategory === "increase_inventory" ? "Filtered Active" : "Filter →"}
                      </button>
                    </div>
                    {actions.filter(a => a.priority === "High").length > 0 ? (
                      <ul className="space-y-2">
                        {actions.filter(a => a.priority === "High").slice(0, 4).map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-muted leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                            <span className="line-clamp-2 text-main">{a.issue}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted italic">No high-priority alerts detected.</p>
                    )}
                  </div>

                  {/* Overstock warnings */}
                  <div className={`bg-brand-surface border rounded-[20px] p-5 shadow-sm transition-all ${
                    activeCategory === "reduce_overstock" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-border"
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <Package size={15} className="text-amber-500 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-xs font-rajdhani font-black uppercase text-main">Overstock Warnings</p>
                          <p className="text-[9px] text-muted font-bold uppercase">Capital holding risk</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveCategory("reduce_overstock")}
                        className="text-[10px] font-bold text-brand-neonblue hover:underline"
                      >
                        {activeCategory === "reduce_overstock" ? "Filtered Active" : "Filter →"}
                      </button>
                    </div>
                    {actions.filter(a => a.priority === "Medium").length > 0 ? (
                      <ul className="space-y-2">
                        {actions.filter(a => a.priority === "Medium").slice(0, 4).map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-muted leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span className="line-clamp-2 text-main">{a.issue}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted italic">No medium-priority alerts detected.</p>
                    )}
                  </div>

                  {/* Revenue opportunities */}
                  <div className={`bg-brand-surface border rounded-[20px] p-5 shadow-sm transition-all ${
                    activeCategory === "promote_low_performers" ? "border-purple-500 ring-2 ring-purple-500/20" : "border-border"
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                          <Target size={15} className="text-purple-500 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs font-rajdhani font-black uppercase text-main">Revenue Opportunities</p>
                          <p className="text-[9px] text-muted font-bold uppercase">Merchandising &amp; Promos</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveCategory("promote_low_performers")}
                        className="text-[10px] font-bold text-brand-neonblue hover:underline"
                      >
                        {activeCategory === "promote_low_performers" ? "Filtered Active" : "Filter →"}
                      </button>
                    </div>
                    {actions.filter(a => a.priority === "Low").length > 0 ? (
                      <ul className="space-y-2">
                        {actions.filter(a => a.priority === "Low").slice(0, 4).map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-muted leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                            <span className="line-clamp-2 text-main">{a.recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted italic">All low-level metrics healthy.</p>
                    )}
                  </div>
                </div>

                {/* ── Suggested Actions Table (Filtered Dynamically) ────────── */}
                <div className="bg-brand-surface border border-border rounded-[24px] p-6 mb-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-1.5 h-6 rounded-full" 
                        style={{ background: activeModule ? activeModule.color : "#06B6D4" }}
                      />
                      <div>
                        <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest flex items-center gap-2">
                          <span>SUGGESTED ACTIONS TABLE</span>
                          {activeModule && (
                            <span 
                              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm"
                              style={{ 
                                background: `${activeModule.color}15`, 
                                color: activeModule.color, 
                                borderColor: `${activeModule.color}35` 
                              }}
                            >
                              Module: {activeModule.title}
                            </span>
                          )}
                          {filterPriority !== "All" && (
                            <span className="text-[10px] font-bold text-brand-neonblue px-2 py-0.5 rounded-full bg-brand-bgbase border border-border">
                              Priority: {filterPriority}
                            </span>
                          )}
                        </h3>
                        <p className="text-[9px] text-muted font-bold uppercase mt-0.5">
                          {filteredActions.length} action{filteredActions.length !== 1 ? "s" : ""} available · click row to expand reasoning
                        </p>
                      </div>
                    </div>

                    {/* Table Filters & Search */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search actions..."
                          className="bg-brand-bgbase border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-main placeholder-muted focus:outline-none focus:border-brand-neonblue w-44"
                        />
                      </div>

                      {(activeCategory !== "all" || filterPriority !== "All" || searchQuery) && (
                        <button
                          onClick={() => {
                            setActiveCategory("all");
                            setFilterPriority("All");
                            setSearchQuery("");
                          }}
                          className="text-xs font-bold text-brand-neonblue hover:underline self-start sm:self-auto"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredActions.length === 0 ? (
                    <div className="text-center py-16 text-muted text-xs font-semibold">
                      No actions match the current module &amp; filter selections.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted font-bold tracking-wider uppercase text-[9px] bg-brand-bgbase">
                            <th className="py-3 px-3">Issue</th>
                            <th className="py-3 px-3">Recommendation</th>
                            <th className="py-3 px-3">Expected Impact</th>
                            <th className="py-3 px-3 text-center">Priority</th>
                            <th className="py-3 px-3 text-center">Confidence</th>
                            <th className="py-3 px-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredActions.map((row, idx) => {
                            const pc   = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.Low;
                            const recI = getRecIcon(row.recommendation);
                            const RecIcon = recI.icon;
                            const isOpen = expandedRow === idx;
                            return (
                              <Fragment key={idx}>
                                <tr
                                  onClick={() => setExpandedRow(isOpen ? null : idx)}
                                  className="hover:bg-brand-hover/50 cursor-pointer transition-colors"
                                >
                                  <td className="py-3.5 px-3 font-semibold text-main max-w-[240px]">
                                    <span className="line-clamp-2">{row.issue}</span>
                                  </td>
                                  <td className="py-3.5 px-3 text-muted max-w-[260px]">
                                    <div className="flex items-start gap-2">
                                      <RecIcon size={13} style={{ color: recI.color, flexShrink: 0, marginTop: 2 }} />
                                      <span className="line-clamp-2 text-main">{row.recommendation}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-3 text-muted max-w-[200px]">
                                    <span className="line-clamp-2">{row.expectedImpact}</span>
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${pc.bg} ${pc.color} ${pc.border} border`}>
                                      {row.priority}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs font-black text-main">{row.confidence}%</span>
                                      <div className="w-16 h-1 rounded-full bg-border overflow-hidden">
                                        <div
                                          className="h-full rounded-full"
                                          style={{ width: `${row.confidence}%`, background: recI.color }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-2 text-muted">
                                    <ChevronRight
                                      size={14}
                                      className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                                    />
                                  </td>
                                </tr>

                                {/* Expand: Analytics Explanation */}
                                {isOpen && (
                                  <tr key={`exp-${idx}`} className="bg-brand-bgbase/40">
                                    <td colSpan={6} className="px-5 py-5">
                                      <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                                      >
                                        {/* Why generated */}
                                        <div className="bg-brand-surface border border-border rounded-2xl p-4 shadow-sm">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">
                                            Why Recommended
                                          </p>
                                          <div className="flex items-start gap-2">
                                            <Lightbulb size={13} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-main leading-relaxed">{row.why}</p>
                                          </div>
                                        </div>

                                        {/* Supporting metrics */}
                                        <div className="bg-brand-surface border border-border rounded-2xl p-4 shadow-sm">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">
                                            Supporting Metrics
                                          </p>
                                          <div className="flex items-start gap-2">
                                            <BarChart2 size={13} className="text-brand-neonblue shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-main leading-relaxed font-mono">{row.metrics}</p>
                                          </div>
                                        </div>

                                        {/* Confidence score */}
                                        <div className="bg-brand-surface border border-border rounded-2xl p-4 shadow-sm">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">
                                            Confidence Score
                                          </p>
                                          <div className="flex items-center gap-3">
                                            <div className="relative w-14 h-14">
                                              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth="3" />
                                                <circle
                                                  cx="18" cy="18" r="15.9" fill="none"
                                                  stroke={recI.color} strokeWidth="3"
                                                  strokeDasharray={`${row.confidence} ${100 - row.confidence}`}
                                                  strokeLinecap="round"
                                                />
                                              </svg>
                                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-main">
                                                {row.confidence}%
                                              </span>
                                            </div>
                                            <div>
                                              <p className="text-[11px] font-bold text-main">
                                                {row.confidence >= 85 ? "High Confidence" : row.confidence >= 70 ? "Moderate" : "Indicative"}
                                              </p>
                                              <p className="text-[10px] text-muted leading-snug">
                                                {row.confidence >= 85
                                                  ? "Recommendation backed by high sample volume."
                                                  : "Recommendation is directionally sound."}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ── Business Rule Summary (Highlights Active Rule) ──────── */}
                <div className="bg-brand-surface border border-border rounded-[24px] p-6 mb-10 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-brand-neonblue/10 border border-brand-neonblue/20 flex items-center justify-center">
                      <Brain size={18} className="text-brand-neonblue" />
                    </div>
                    <div>
                      <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">
                        BUSINESS INTELLIGENCE RULES
                      </h3>
                      <p className="text-[9px] text-muted font-bold uppercase mt-0.5">
                        How AI decisions and suggestions are calculated
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                      {
                        moduleId: "increase_inventory",
                        condition: "IF sales rising & safety stock low",
                        action: "→ Increase inventory levels",
                        icon: ArrowUpRight,
                        color: "#06B6D4",
                        priority: "High"
                      },
                      {
                        moduleId: "reduce_overstock",
                        condition: "IF demand falling & stock > 45d",
                        action: "→ Reduce overstock via bundling",
                        icon: TrendingDown,
                        color: "#F59E0B",
                        priority: "Medium"
                      },
                      {
                        moduleId: "promote_low_performers",
                        condition: "IF branch / SKU underperforming",
                        action: "→ Promote low performers with promos",
                        icon: Tag,
                        color: "#A855F7",
                        priority: "Low"
                      },
                      {
                        moduleId: "adjust_purchasing",
                        condition: "IF PO cadence or batch size volatile",
                        action: "→ Adjust purchasing cycles",
                        icon: ShoppingCart,
                        color: "#10B981",
                        priority: "All"
                      },
                    ].map((rule, idx) => {
                      const RuleIcon = rule.icon;
                      const pc = PRIORITY_CONFIG[rule.priority] || PRIORITY_CONFIG.Low;
                      const isRuleActive = activeCategory === rule.moduleId;

                      return (
                        <div 
                          key={idx} 
                          onClick={() => setActiveCategory(rule.moduleId)}
                          className={`
                            border rounded-2xl p-4 flex flex-col gap-3 transition-all cursor-pointer
                            ${isRuleActive 
                              ? "bg-brand-surface border-brand-neonblue ring-2 ring-brand-neonblue/20 shadow-md" 
                              : "bg-brand-bgbase/40 border-border hover:border-brand-neonblue/40"
                            }
                          `}
                          style={{
                            borderColor: isRuleActive ? rule.color : undefined
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center"
                              style={{ background: `${rule.color}18`, border: `1px solid ${rule.color}40` }}
                            >
                              <RuleIcon size={14} style={{ color: rule.color }} />
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${pc.bg} ${pc.color} ${pc.border} border`}>
                              {rule.priority}
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-muted uppercase tracking-wide mb-1">{rule.condition}</p>
                            <p className="text-xs font-bold text-main">{rule.action}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
