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
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
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
  const [filterPriority,   setFilterPriority]   = useState("All");
  const [expandedRow,      setExpandedRow]      = useState(null);
  const [selectedCardModal, setSelectedCardModal] = useState(null);

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
    const targetActions = customActions || data?.actions || data?.actionsTable || [];
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

  // ── Derived counts ───────────────────────────────────────────────────────────
  const actions   = data?.actions || data?.actionsTable || [];
  const highCount = actions.filter(a => a.priority === "High").length;
  const medCount  = actions.filter(a => a.priority === "Medium").length;
  const lowCount  = actions.filter(a => a.priority === "Low").length;

  const filtered = filterPriority === "All"
    ? actions
    : actions.filter(a => a.priority === filterPriority);

  // Top-of-page 4 interactive recommendation buttons & metadata
  const topCards = [
    {
      id: "increase_inventory",
      title: "Increase Inventory",
      shortTitle: "Stock Restock Alerts",
      description: "Restock items approaching safety-stock threshold to avoid sales loss and stockout penalties.",
      strategyGuide: "Algorithmic safety-stock trigger evaluating real-time depletion rate against supplier lead times. Prioritize purchase orders for these high-velocity items immediately.",
      icon: ArrowUpRight,
      color: "#06B6D4",
      count: highCount,
      priority: "High",
      label: `${highCount} High-Priority Alert${highCount !== 1 ? "s" : ""}`,
      matchFn: (a) => a.priority === "High" || a.issue?.toLowerCase().includes("stock") || a.recommendation?.toLowerCase().includes("restock")
    },
    {
      id: "reduce_overstock",
      title: "Reduce Overstock",
      shortTitle: "Surplus & Holding Capital",
      description: "Excess inventory detected. Bundle or promote to clear surplus holdings and free up working capital.",
      strategyGuide: "Items exceeding 45-day sales turnover velocity. Bundling with fast-moving complementary components or offering minor clearance incentives will prevent dead-stock depreciation.",
      icon: TrendingDown,
      color: "#F59E0B",
      count: medCount,
      priority: "Medium",
      label: `${medCount} Medium-Priority Alert${medCount !== 1 ? "s" : ""}`,
      matchFn: (a) => a.priority === "Medium" || a.issue?.toLowerCase().includes("overstock") || a.issue?.toLowerCase().includes("surplus")
    },
    {
      id: "promote_low_performers",
      title: "Promote Low Performers",
      shortTitle: "Merchandising & Growth",
      description: "Launch targeted promos, service bundles, or cash register add-on incentives to boost stagnant product lines.",
      strategyGuide: "High-margin or lagging items with steady foot traffic but low conversion. Attach PC diagnosis, warranties, or assembly services to uplift gross revenue.",
      icon: Tag,
      color: "#A855F7",
      count: lowCount,
      priority: "Low",
      label: `${lowCount} Low-Priority Alert${lowCount !== 1 ? "s" : ""}`,
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
      count: actions.length,
      priority: "All",
      label: `${actions.length} Total Action${actions.length !== 1 ? "s" : ""}`,
      matchFn: () => true
    },
  ];

  // Actions matching the open modal
  const modalActions = selectedCardModal
    ? actions.filter(selectedCardModal.matchFn)
    : [];

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
                <h1 className="text-2xl font-rajdhani font-black uppercase mb-0">
                  PRESCRIPTIVE <span className="text-brand-neonblue">ANALYTICS</span>
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
                  onClick={() => handleExport()}
                  className="h-9 px-4 bg-brand-surface border border-border rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-brand-hover transition-all text-main shadow-sm"
                >
                  <FileDown size={14} className="text-brand-neonblue" /> Export Report (.xlsx)
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
                {/* ── 4 Interactive Recommendation Buttons ─────────────────────── */}
                <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-neonblue" />
                    Interactive Decision Modules (Click any box to inspect full action intelligence)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
                    {topCards.map((card, idx) => {
                      const Icon = card.icon;
                      const isFiltered = filterPriority === card.priority;

                      return (
                        <motion.button
                          key={card.id}
                          onClick={() => setSelectedCardModal(card)}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.06, duration: 0.3 }}
                          className={`
                            relative bg-brand-surface border rounded-[20px] p-5 flex flex-col justify-between text-left
                            shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all group
                            ${isFiltered ? "border-brand-neonblue ring-2 ring-brand-neonblue/20" : "border-border hover:border-brand-neonblue/40"}
                          `}
                        >
                          <div>
                            {/* Top header & Badge */}
                            <div className="flex items-start justify-between gap-2 mb-3.5">
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105"
                                style={{ background: `${card.color}18`, border: `1px solid ${card.color}40` }}
                              >
                                <Icon size={20} style={{ color: card.color }} />
                              </div>
                              <span
                                className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-sm"
                                style={{ background: `${card.color}15`, color: card.color, borderColor: `${card.color}35` }}
                              >
                                {card.label}
                              </span>
                            </div>

                            {/* Title & Description */}
                            <p className="text-sm font-rajdhani font-black uppercase text-main mb-1 flex items-center justify-between">
                              <span>{card.title}</span>
                              <ChevronRight size={14} className="text-muted group-hover:text-brand-neonblue group-hover:translate-x-1 transition-all" />
                            </p>
                            <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{card.description}</p>
                          </div>

                          {/* Action Cue footer */}
                          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[10px] font-bold text-brand-neonblue">
                            <span className="flex items-center gap-1">
                              Inspect Details
                            </span>
                            <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-brand-bgbase text-muted group-hover:text-main transition">
                              Open Modal →
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Opportunity Analysis ─────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
                  {/* High-demand */}
                  <div className="bg-brand-surface border border-border rounded-[20px] p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                          <AlertTriangle size={15} className="text-rose-500 dark:text-rose-400" />
                        </div>
                        <div>
                          <p className="text-xs font-rajdhani font-black uppercase text-main">High Demand / Low Stock</p>
                          <p className="text-[9px] text-muted font-bold uppercase">Immediate action required</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCardModal(topCards[0])}
                        className="text-[10px] font-bold text-brand-neonblue hover:underline"
                      >
                        View all →
                      </button>
                    </div>
                    {actions.filter(a => a.priority === "High").length > 0 ? (
                      <ul className="space-y-2">
                        {actions.filter(a => a.priority === "High").slice(0, 4).map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-muted leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                            <span className="line-clamp-2">{a.issue}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted italic">No high-priority alerts detected.</p>
                    )}
                  </div>

                  {/* Overstock warnings */}
                  <div className="bg-brand-surface border border-border rounded-[20px] p-5 shadow-sm">
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
                        onClick={() => setSelectedCardModal(topCards[1])}
                        className="text-[10px] font-bold text-brand-neonblue hover:underline"
                      >
                        View all →
                      </button>
                    </div>
                    {actions.filter(a => a.priority === "Medium").length > 0 ? (
                      <ul className="space-y-2">
                        {actions.filter(a => a.priority === "Medium").slice(0, 4).map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-muted leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span className="line-clamp-2">{a.issue}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted italic">No medium-priority alerts detected.</p>
                    )}
                  </div>

                  {/* Revenue opportunities */}
                  <div className="bg-brand-surface border border-border rounded-[20px] p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Target size={15} className="text-emerald-500 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs font-rajdhani font-black uppercase text-main">Revenue Opportunities</p>
                          <p className="text-[9px] text-muted font-bold uppercase">Optimization potential</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCardModal(topCards[2])}
                        className="text-[10px] font-bold text-brand-neonblue hover:underline"
                      >
                        View all →
                      </button>
                    </div>
                    {actions.filter(a => a.priority === "Low").length > 0 ? (
                      <ul className="space-y-2">
                        {actions.filter(a => a.priority === "Low").slice(0, 4).map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-muted leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span className="line-clamp-2">{a.recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted italic">All low-level metrics healthy.</p>
                    )}
                  </div>
                </div>

                {/* ── Suggested Actions Table ───────────────────────────── */}
                <div className="bg-brand-surface border border-border rounded-[24px] p-6 mb-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-brand-neonblue rounded-full" />
                      <div>
                        <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest flex items-center gap-2">
                          <span>SUGGESTED ACTIONS TABLE</span>
                          {filterPriority !== "All" && (
                            <span className="text-[10px] font-bold text-brand-neonblue px-2 py-0.5 rounded-full bg-brand-bgbase border border-border">
                              Filtered: {filterPriority}
                            </span>
                          )}
                        </h3>
                        <p className="text-[9px] text-muted font-bold uppercase mt-0.5">
                          {filtered.length} action{filtered.length !== 1 ? "s" : ""} · click any row to expand analytics explanation
                        </p>
                      </div>
                    </div>

                    {filterPriority !== "All" && (
                      <button
                        onClick={() => setFilterPriority("All")}
                        className="text-xs font-bold text-brand-neonblue hover:underline self-start sm:self-auto"
                      >
                        Reset Filter (Show All)
                      </button>
                    )}
                  </div>

                  {filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted text-xs font-semibold">
                      No actions match the selected priority filter.
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
                          {filtered.map((row, idx) => {
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

                {/* ── Business Rule Summary ────────────────────────────── */}
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
                        How recommendations are calculated
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                      {
                        condition: "IF sales rising",
                        action: "→ Increase stock levels",
                        icon: ArrowUpRight,
                        color: "#06B6D4",
                        priority: "High"
                      },
                      {
                        condition: "IF demand falling",
                        action: "→ Reduce purchasing cadence",
                        icon: TrendingDown,
                        color: "#F59E0B",
                        priority: "Medium"
                      },
                      {
                        condition: "IF branch underperforming",
                        action: "→ Launch targeted promotions",
                        icon: Tag,
                        color: "#A855F7",
                        priority: "Medium"
                      },
                      {
                        condition: "IF overstock detected",
                        action: "→ Adjust inventory holdings",
                        icon: Layers,
                        color: "#10B981",
                        priority: "Low"
                      },
                    ].map((rule, idx) => {
                      const RuleIcon = rule.icon;
                      const pc = PRIORITY_CONFIG[rule.priority];
                      return (
                        <div key={idx} className="bg-brand-bgbase/40 border border-border rounded-2xl p-4 flex flex-col gap-3">
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

      {/* ── Drill-Down Modal for Clicked Action Box ──────────────────────── */}
      <AnimatePresence>
        {selectedCardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-brand-surface border border-border rounded-3xl max-w-4xl w-full max-h-[88vh] overflow-hidden flex flex-col shadow-2xl text-xs text-main"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-border flex items-start justify-between gap-4 bg-brand-bgbase/30">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ background: `${selectedCardModal.color}20`, border: `1px solid ${selectedCardModal.color}50` }}
                  >
                    <selectedCardModal.icon size={24} style={{ color: selectedCardModal.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
                        style={{ background: `${selectedCardModal.color}18`, color: selectedCardModal.color, borderColor: `${selectedCardModal.color}40` }}
                      >
                        {selectedCardModal.label}
                      </span>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                        {selectedCardModal.shortTitle}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-rajdhani font-black uppercase text-main mt-0.5">
                      {selectedCardModal.title} Intelligence Report
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCardModal(null)}
                  className="w-8 h-8 rounded-xl bg-brand-bgbase hover:bg-brand-hover border border-border flex items-center justify-center text-muted hover:text-main transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
                {/* Executive Strategy Box */}
                <div className="bg-brand-bgbase border border-border rounded-2xl p-4.5 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-neonblue/15 border border-brand-neonblue/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="w-4 h-4 text-brand-neonblue" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-main uppercase tracking-wide">
                      Prescriptive Intelligence Directive
                    </h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      {selectedCardModal.strategyGuide}
                    </p>
                  </div>
                </div>

                {/* List of Detected Action Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-main flex items-center gap-2">
                      <Sparkles size={14} className="text-brand-neonblue" />
                      Detected Recommendations ({modalActions.length})
                    </h3>
                    <span className="text-[10px] font-semibold text-muted">
                      Sector: {selectedBranch ? branches.find(b => String(b.id) === String(selectedBranch))?.name || "Branch" : "All Branches"}
                    </span>
                  </div>

                  {modalActions.length === 0 ? (
                    <div className="bg-brand-bgbase/40 border border-border rounded-2xl p-8 text-center text-muted">
                      <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500" />
                      <p className="text-xs font-bold text-main">No critical warnings in this category</p>
                      <p className="text-[11px] text-muted mt-0.5">All monitored products &amp; branches are performing within normal parameters.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {modalActions.map((action, i) => {
                        const pc = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.Low;
                        const recI = getRecIcon(action.recommendation);
                        const RecIcon = recI.icon;

                        return (
                          <div
                            key={i}
                            className="bg-brand-bgbase/50 border border-border rounded-2xl p-4.5 hover:border-brand-neonblue/40 transition space-y-3"
                          >
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-brand-surface border border-border flex items-center justify-center shrink-0 mt-0.5">
                                  <RecIcon size={14} style={{ color: recI.color }} />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-main leading-snug">
                                    {action.issue}
                                  </h4>
                                  <p className="text-[11px] font-semibold text-brand-neonblue mt-0.5 flex items-center gap-1">
                                    <CheckCircle size={12} /> {action.recommendation}
                                  </p>
                                </div>
                              </div>

                              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${pc.bg} ${pc.color} ${pc.border} border shrink-0`}>
                                {action.priority} Priority
                              </span>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/40 text-[11px]">
                              <div className="bg-brand-surface rounded-xl p-2.5 border border-border">
                                <span className="text-[9px] font-bold uppercase text-muted block mb-0.5">Expected Impact</span>
                                <span className="text-main font-medium">{action.expectedImpact}</span>
                              </div>
                              <div className="bg-brand-surface rounded-xl p-2.5 border border-border">
                                <span className="text-[9px] font-bold uppercase text-muted block mb-0.5">Why Recommended</span>
                                <span className="text-main font-medium line-clamp-2">{action.why}</span>
                              </div>
                              <div className="bg-brand-surface rounded-xl p-2.5 border border-border flex items-center justify-between">
                                <div>
                                  <span className="text-[9px] font-bold uppercase text-muted block mb-0.5">Confidence</span>
                                  <span className="text-main font-bold">{action.confidence}%</span>
                                </div>
                                <div className="w-14 h-1.5 rounded-full bg-brand-bgbase overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${action.confidence}%`, background: recI.color }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-brand-bgbase/40">
                <div className="text-[11px] text-muted">
                  Showing <strong>{modalActions.length}</strong> action item{modalActions.length !== 1 ? "s" : ""}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      if (selectedCardModal.priority && selectedCardModal.priority !== "All") {
                        setFilterPriority(selectedCardModal.priority);
                      } else {
                        setFilterPriority("All");
                      }
                      setSelectedCardModal(null);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-brand-surface hover:bg-brand-hover text-main border border-border font-bold text-xs transition"
                  >
                    Filter Main Table
                  </button>

                  <button
                    onClick={() => handleExport(modalActions, `Prescriptive_${selectedCardModal.id}`)}
                    disabled={modalActions.length === 0}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-brand-neonblue hover:bg-brand-neonblue/90 text-white font-bold text-xs shadow-md shadow-brand-neonblue/20 transition disabled:opacity-50"
                  >
                    Export Category (.xlsx)
                  </button>

                  <button
                    onClick={() => setSelectedCardModal(null)}
                    className="px-4 py-2 rounded-xl bg-brand-bgbase hover:bg-brand-hover text-muted hover:text-main font-semibold text-xs border border-border transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
