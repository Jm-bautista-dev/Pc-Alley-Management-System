"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import StatCard from "@/components/StatCard";
import { 
  TrendingUp, 
  ArrowUpRight, 
  Download,
  Activity,
  AlertTriangle,
  Lightbulb,
  FileDown,
  ChevronRight,
  TrendingDown,
  RefreshCw,
  Sliders,
  CheckCircle,
  HelpCircle
} from "lucide-react";
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
import { getChartTheme } from "@/lib/chartTheme";
import { exportToExcel } from "@/lib/excelExport";
import { showSuccess, showError } from "@/context/ModalContext";
import { apiUrl } from "@/lib/api";

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

const PesoSign = ({ size }) => <span style={{ fontSize: size }} className="font-bold text-brand-neonblue">₱</span>;

export default function ForecastPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [period, setPeriod] = useState(3); // 1, 3, or 6 months
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed.role !== "super_admin" && parsed.branch_id) {
        setSelectedBranch(String(parsed.branch_id));
      }
    }
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchForecastData();
  }, [selectedBranch, period]);

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        setBranches(d);
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const fetchForecastData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const params = new URLSearchParams({ period: String(period) });
      if (selectedBranch) {
        params.set("branchId", selectedBranch);
      }
      const res = await fetch(apiUrl(`/api/analytics/forecast?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        showError("Failed to fetch", "Could not load forecast intelligence data.");
      }
    } catch (err) {
      showError("Connection Error", "Network latency prevented retrieving analytics.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    const exportRows = [];
    
    data.trends.forEach(t => {
      exportRows.push({
        Month: t.month,
        Type: 'Historical',
        'Revenue (PHP)': parseFloat(t.revenue)
      });
    });

    data.projections.forEach(p => {
      exportRows.push({
        Month: p.month,
        Type: 'Projected (Forecast)',
        'Revenue (PHP)': parseFloat(p.revenue)
      });
    });

    try {
      exportToExcel(exportRows, `Revenue_Forecast_Report`, 'Forecast Data');
      showSuccess("Exported successfully", "Forecast data exported to Excel file.");
    } catch (e) {
      showError("Export error", "Could not save Excel sheet.");
    }
  };

  // Compile chart datasets
  const trends = data?.trends || [];
  const projections = data?.projections || [];
  const labels = [...trends.map(t => t.month), ...projections.map(p => p.month)];

  const historicalVals = [...trends.map(t => parseFloat(t.revenue) || 0), ...Array(projections.length).fill(null)];
  const projectedVals = [
    ...Array(trends.length - 1).fill(null),
    parseFloat(trends[trends.length - 1]?.revenue || 0),
    ...projections.map(p => p.revenue)
  ];

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Historical Revenue',
        data: historicalVals,
        borderColor: '#00F2FF',
        backgroundColor: 'rgba(0, 242, 255, 0.03)',
        borderWidth: 3,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#00F2FF',
        pointRadius: 4,
      },
      {
        label: 'Projected Revenue (Forecast)',
        data: projectedVals,
        borderColor: '#A855F7',
        backgroundColor: 'transparent',
        borderWidth: 3,
        borderDash: [6, 4],
        tension: 0.35,
        pointBackgroundColor: '#A855F7',
        pointRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: { family: 'DM Sans', size: 11 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        titleFont: { family: 'Rajdhani', size: 12, weight: 'bold' },
        bodyFont: { family: 'DM Sans', size: 11 },
        padding: 12,
        borderRadius: 8,
        callbacks: {
          label: (context) => `Revenue: ₱${context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
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

  // Metrics
  const lastMonthRev = trends[trends.length - 1]?.revenue || 0;
  const nextMonthRev = projections[0]?.revenue || 0;
  const averageHistorical = trends.reduce((sum, t) => sum + parseFloat(t.revenue || 0), 0) / (trends.length || 1);

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="REVENUE PREDICTIONS & ANALYTICS" />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container">
            
            {/* Header and Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6">
              <div>
                <h1 className="text-2xl font-rajdhani font-black uppercase mb-0">
                  REVENUE <span className="text-brand-neonblue">FORECAST</span>
                </h1>
                <p className="text-[10px] text-muted font-black tracking-[2px] uppercase mt-1">
                  Predictive Analysis | Diagnostic & Prescriptive Recommendations
                </p>
              </div>

              <div className="flex flex-wrap gap-4 w-full xl:w-auto items-center">
                {/* Branch Selection (for Super Admin) */}
                {user?.role === "super_admin" && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted font-bold uppercase">Sector:</span>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="bg-brand-surface border border-border rounded-lg text-xs font-semibold px-3 py-2 text-main focus:outline-none focus:border-brand-neonblue cursor-pointer"
                    >
                      <option value="">All Sectors</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Horizon Selection */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted font-bold uppercase">Horizon:</span>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                    className="bg-brand-surface border border-border rounded-lg text-xs font-semibold px-3 py-2 text-main focus:outline-none focus:border-brand-neonblue cursor-pointer"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                  </select>
                </div>

                <button 
                  onClick={handleExport}
                  className="flex-1 xl:flex-none h-9 px-4 bg-brand-surface border border-border rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-brand-hover transition-all text-muted hover:text-main"
                >
                  <FileDown size={14} className="text-brand-neonblue" /> Export Excel
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-3">
                <RefreshCw size={36} className="animate-spin text-brand-neonblue" />
                <p className="text-xs text-muted font-bold uppercase tracking-wider">Processing Intelligence Models...</p>
              </div>
            ) : (
              <>
                {/* Predictive Cards */}
                <div className="responsive-grid mb-6">
                  <StatCard 
                    title="Next Month Projection" 
                    value={`₱${nextMonthRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    trend={nextMonthRev >= lastMonthRev ? `+${(((nextMonthRev - lastMonthRev) / (lastMonthRev || 1)) * 100).toFixed(1)}%` : `${(((nextMonthRev - lastMonthRev) / (lastMonthRev || 1)) * 100).toFixed(1)}%`}
                    subtext="Next Period Value" 
                    icon={PesoSign} 
                  />
                  <StatCard 
                    title="Growth Rate (Monthly)" 
                    value={data?.slope ? `₱${data.slope.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "₱0.00"}
                    trend={data?.slope >= 0 ? "Upward" : "Downward"} 
                    subtext="Regression Slope" 
                    icon={data?.slope >= 0 ? TrendingUp : TrendingDown}
                  />
                  <StatCard 
                    title="Average Revenue" 
                    value={`₱${averageHistorical.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    trend={`${trends.length} Months`}
                    subtext="Historical Benchmark" 
                    icon={Activity} 
                  />
                  <StatCard 
                    title="Confidence Index" 
                    value={data?.confidenceScore || "Low"}
                    trend={data?.confidenceScore === "High" ? "Optimal Data" : "Needs Data"}
                    subtext="Based on Data Points" 
                    icon={CheckCircle} 
                  />
                </div>

                {/* Main Forecast Chart */}
                <div className="bg-brand-surface border border-border rounded-[24px] p-6 shadow-sm mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-brand-neonblue rounded-full" />
                      <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">REVENUE PREDICTION TIMELINE</h3>
                    </div>
                  </div>
                  <div className="h-[340px] w-full relative">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>

                {/* Analytics Log panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                  
                  {/* Diagnostics Panel */}
                  <div className="bg-brand-surface border border-border rounded-[24px] p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest mb-0">DIAGNOSTIC LOGS</h3>
                        <p className="text-[10px] text-muted font-bold uppercase mt-0.5">Explaining current trend factors</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {data?.diagnostics?.length > 0 ? (
                        data.diagnostics.map((diag, index) => (
                          <div key={index} className="p-4 bg-brand-bgbase/40 border border-border/60 rounded-2xl flex gap-3 items-start">
                            <div className="w-2.5 h-2.5 rounded-full bg-brand-neonblue mt-1.5 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-main uppercase tracking-wide">{diag.title}</p>
                              <p className="text-xs text-muted mt-1 leading-relaxed">{diag.description}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-xs text-muted">
                          No diagnostic alerts logged.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Prescriptive Panel */}
                  <div className="bg-brand-surface border border-border rounded-[24px] p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <Lightbulb size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest mb-0">PRESCRIPTIVE SUGGESTIONS</h3>
                        <p className="text-[10px] text-muted font-bold uppercase mt-0.5">AI-Recommended adjustments</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {data?.recommendations?.length > 0 ? (
                        data.recommendations.map((rec, index) => (
                          <div key={index} className="p-4 bg-brand-bgbase/40 border border-border/60 rounded-2xl">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-xs font-bold text-main uppercase tracking-wide">{rec.title}</p>
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                rec.priority === 'High' ? 'text-rose-400 border-rose-400/20 bg-rose-400/10' :
                                rec.priority === 'Medium' ? 'text-amber-400 border-amber-400/20 bg-amber-400/10' :
                                'text-gray-400 border-gray-400/20 bg-gray-400/10'
                              }`}>
                                {rec.priority} Priority
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-1.5 leading-relaxed">{rec.action}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-xs text-muted">
                          No recommendations generated.
                        </div>
                      )}
                    </div>
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
