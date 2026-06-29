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
  ArrowDownRight
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { exportToExcel } from "@/lib/excelExport";
import { apiUrl } from "@/lib/api";

const PRIORITY_CONFIG = {
  High:   { color: "text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/25",   dot: "bg-rose-400"   },
  Medium: { color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/25",  dot: "bg-amber-400"  },
  Low:    { color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/25",dot: "bg-emerald-400"},
};

const RECOMMENDATION_ICONS = {
  "Increase inventory":           { icon: ArrowUpRight,  color: "#00F2FF" },
  "Reduce overstock":             { icon: TrendingDown,  color: "#F59E0B" },
  "Promote low-performing items": { icon: Tag,           color: "#A855F7" },
  "Adjust purchasing":            { icon: ShoppingCart,  color: "#10B981" },
  default:                        { icon: Zap,           color: "#00F2FF" },
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

  const [loading,      setLoading]      = useState(true);
  const [data,         setData]         = useState(null);
  const [branches,     setBranches]     = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [expandedRow,  setExpandedRow]  = useState(null);

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

  const handleExport = () => {
    if (!data?.actionsTable?.length) return;
    const rows = data.actionsTable.map(r => ({
      Issue:               r.issue,
      Recommendation:      r.recommendation,
      "Expected Impact":   r.expectedImpact,
      Priority:            r.priority,
      "Why Generated":     r.why,
      "Supporting Metrics":r.metrics,
      "Confidence (%)":    r.confidence,
    }));
    exportToExcel(rows, "Prescriptive_Analytics_Report", "Recommended Actions");
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
  const actions   = data?.actionsTable || [];
  const highCount = actions.filter(a => a.priority === "High").length;
  const medCount  = actions.filter(a => a.priority === "Medium").length;
  const lowCount  = actions.filter(a => a.priority === "Low").length;

  const filtered = filterPriority === "All"
    ? actions
    : actions.filter(a => a.priority === filterPriority);

  // Top-of-page recommendation cards (deduplicated recommendation types)
  const topCards = [
    {
      title: "Increase Inventory",
      description: "Restock items approaching safety-stock threshold to avoid sales loss.",
      icon: ArrowUpRight,
      color: "#00F2FF",
      count: highCount,
      label: `${highCount} High-Priority Alert${highCount !== 1 ? "s" : ""}`
    },
    {
      title: "Reduce Overstock",
      description: "Excess inventory detected. Bundle or promote to clear surplus holdings.",
      icon: TrendingDown,
      color: "#F59E0B",
      count: medCount,
      label: `${medCount} Medium-Priority Alert${medCount !== 1 ? "s" : ""}`
    },
    {
      title: "Promote Low Performers",
      description: "Launch targeted promos or discounts to boost stagnant product lines.",
      icon: Tag,
      color: "#A855F7",
      count: lowCount,
      label: `${lowCount} Low-Priority Alert${lowCount !== 1 ? "s" : ""}`
    },
    {
      title: "Adjust Purchasing",
      description: "Recalibrate PO cadence based on current demand forecasts.",
      icon: ShoppingCart,
      color: "#10B981",
      count: actions.length,
      label: `${actions.length} Total Action${actions.length !== 1 ? "s" : ""}`
    },
  ];

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
                <p className="text-[10px] text-muted font-black tracking-[2px] uppercase mt-1">
                  AI-Driven Recommendations &amp; Business Action Intelligence
                </p>
              </div>

              {/* ── Filters ─────────────────────────────────────────────── */}
              <div className="flex flex-wrap gap-4 w-full xl:w-auto items-center">

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted font-bold uppercase">Sector:</span>
                  <select
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                    className="bg-brand-surface border border-border rounded-lg text-xs font-semibold px-3 py-2 text-main focus:outline-none"
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
                    className="bg-brand-surface border border-border rounded-lg text-xs font-semibold px-3 py-2 text-main focus:outline-none"
                  >
                    <option value="All">All</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <button
                  onClick={handleExport}
                  className="h-9 px-4 bg-brand-surface border border-border rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-brand-hover transition-all text-muted hover:text-main"
                >
                  <FileDown size={14} className="text-brand-neonblue" /> Export Report
                </button>

                <button
                  onClick={fetchPrescriptiveData}
                  className="h-9 w-9 bg-brand-surface border border-border rounded-lg flex items-center justify-center hover:bg-brand-hover transition-all text-muted hover:text-main"
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
                {/* ── Recommendation Cards ─────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
                  {topCards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.07, duration: 0.35 }}
                        className="bg-brand-surface border border-border rounded-[20px] p-5 flex flex-col gap-4 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${card.color}18`, border: `1px solid ${card.color}40` }}
                          >
                            <Icon size={20} style={{ color: card.color }} />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                            style={{ background: `${card.color}18`, color: card.color }}>
                            {card.label}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-rajdhani font-black uppercase text-main mb-1">{card.title}</p>
                          <p className="text-[11px] text-muted leading-relaxed">{card.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* ── Opportunity Analysis ─────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
                  {/* High-demand */}
                  <div className="bg-brand-surface border border-border rounded-[20px] p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <AlertTriangle size={15} className="text-rose-400" />
                      </div>
                      <div>
                        <p className="text-xs font-rajdhani font-black uppercase text-main">High Demand / Low Stock</p>
                        <p className="text-[9px] text-muted font-bold uppercase">Immediate action required</p>
                      </div>
                    </div>
                    {actions.filter(a => a.priority === "High").length > 0 ? (
                      <ul className="space-y-2">
                        {actions.filter(a => a.priority === "High").slice(0, 4).map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-muted leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                            {a.issue}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted italic">No high-priority alerts detected.</p>
                    )}
                  </div>

                  {/* Low inventory warnings */}
                  <div className="bg-brand-surface border border-border rounded-[20px] p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Package size={15} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs font-rajdhani font-black uppercase text-main">Overstock Warnings</p>
                        <p className="text-[9px] text-muted font-bold uppercase">Capital holding risk</p>
                      </div>
                    </div>
                    {actions.filter(a => a.priority === "Medium").length > 0 ? (
                      <ul className="space-y-2">
                        {actions.filter(a => a.priority === "Medium").slice(0, 4).map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-muted leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                            {a.issue}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted italic">No medium-priority alerts detected.</p>
                    )}
                  </div>

                  {/* Revenue opportunities */}
                  <div className="bg-brand-surface border border-border rounded-[20px] p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Target size={15} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-rajdhani font-black uppercase text-main">Revenue Opportunities</p>
                        <p className="text-[9px] text-muted font-bold uppercase">Optimisation potential</p>
                      </div>
                    </div>
                    {actions.filter(a => a.priority === "Low").length > 0 ? (
                      <ul className="space-y-2">
                        {actions.filter(a => a.priority === "Low").slice(0, 4).map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-muted leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            {a.recommendation}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted italic">All low-level metrics healthy.</p>
                    )}
                  </div>
                </div>

                {/* ── Suggested Actions Table ───────────────────────────── */}
                <div className="bg-brand-surface border border-border rounded-[24px] p-6 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-brand-neonblue rounded-full" />
                      <div>
                        <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">
                          SUGGESTED ACTIONS
                        </h3>
                        <p className="text-[9px] text-muted font-bold uppercase mt-0.5">
                          {filtered.length} action{filtered.length !== 1 ? "s" : ""} · click any row to expand analytics explanation
                        </p>
                      </div>
                    </div>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted text-xs font-semibold">
                      No actions match the selected filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted font-bold tracking-wider uppercase text-[9px] bg-brand-bgbase/40">
                            <th className="py-3 px-3">Issue</th>
                            <th className="py-3 px-3">Recommendation</th>
                            <th className="py-3 px-3">Expected Impact</th>
                            <th className="py-3 px-3 text-center">Priority</th>
                            <th className="py-3 px-3 text-center">Confidence</th>
                            <th className="py-3 px-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((row, idx) => {
                            const pc   = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.Low;
                            const recI = getRecIcon(row.recommendation);
                            const RecIcon = recI.icon;
                            const isOpen = expandedRow === idx;
                            return (
                              <Fragment key={idx}>
                                <tr
                                  key={idx}
                                  onClick={() => setExpandedRow(isOpen ? null : idx)}
                                  className="border-b border-border/40 hover:bg-brand-bgbase/25 cursor-pointer transition-colors"
                                >
                                  <td className="py-3 px-3 font-semibold text-main max-w-[240px]">
                                    <span className="line-clamp-2">{row.issue}</span>
                                  </td>
                                  <td className="py-3 px-3 text-muted max-w-[260px]">
                                    <div className="flex items-start gap-2">
                                      <RecIcon size={13} style={{ color: recI.color, flexShrink: 0, marginTop: 2 }} />
                                      <span className="line-clamp-2">{row.recommendation}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-muted max-w-[200px]">
                                    <span className="line-clamp-2">{row.expectedImpact}</span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${pc.bg} ${pc.color} ${pc.border} border`}>
                                      {row.priority}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
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
                                  <td className="py-3 px-2 text-muted">
                                    <ChevronRight
                                      size={14}
                                      className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                                    />
                                  </td>
                                </tr>

                                {/* Expand: Analytics Explanation */}
                                {isOpen && (
                                  <tr key={`exp-${idx}`} className="bg-brand-bgbase/30">
                                    <td colSpan={6} className="px-5 py-5">
                                      <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                                      >
                                        {/* Why generated */}
                                        <div className="bg-brand-surface border border-border/60 rounded-2xl p-4">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">
                                            Why Recommended
                                          </p>
                                          <div className="flex items-start gap-2">
                                            <Lightbulb size={13} className="text-amber-400 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-main leading-relaxed">{row.why}</p>
                                          </div>
                                        </div>

                                        {/* Supporting metrics */}
                                        <div className="bg-brand-surface border border-border/60 rounded-2xl p-4">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">
                                            Supporting Metrics
                                          </p>
                                          <div className="flex items-start gap-2">
                                            <BarChart2 size={13} className="text-brand-neonblue shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-main leading-relaxed font-mono">{row.metrics}</p>
                                          </div>
                                        </div>

                                        {/* Confidence score */}
                                        <div className="bg-brand-surface border border-border/60 rounded-2xl p-4">
                                          <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">
                                            Confidence Score
                                          </p>
                                          <div className="flex items-center gap-3">
                                            <div className="relative w-14 h-14">
                                              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
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
                                                  ? "Recommendation backed by strong data patterns."
                                                  : "Recommendation is directionally sound but data is limited."}
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
                <div className="bg-brand-surface border border-border rounded-[24px] p-6 mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-brand-neonblue/10 border border-brand-neonblue/20 flex items-center justify-center">
                      <Brain size={18} className="text-brand-neonblue" />
                    </div>
                    <div>
                      <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">
                        BUSINESS INTELLIGENCE RULES
                      </h3>
                      <p className="text-[9px] text-muted font-bold uppercase mt-0.5">
                        How recommendations are generated
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                      {
                        condition: "IF sales rising",
                        action: "→ Increase stock levels",
                        icon: ArrowUpRight,
                        color: "#00F2FF",
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
                        <div key={idx} className="bg-brand-bgbase/40 border border-border/50 rounded-2xl p-4 flex flex-col gap-3">
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
