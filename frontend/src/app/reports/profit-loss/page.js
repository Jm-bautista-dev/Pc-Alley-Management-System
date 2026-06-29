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
  FileDown
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
import { getChartTheme } from "@/lib/chartTheme";
import { exportToExcel } from "@/lib/excelExport";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

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
  const chartTheme = getChartTheme();

  // Mock data for the Profit & Loss analysis
  const financialData = {
    revenue: 1248500,
    cogs: 842300,
    grossProfit: 406200,
    operatingExpenses: 125000,
    netIncome: 281200,
    trends: [
      { date: "Day 1", revenue: 45000, expenses: 32000 },
      { date: "Day 5", revenue: 52000, expenses: 31000 },
      { date: "Day 10", revenue: 48000, expenses: 35000 },
      { date: "Day 15", revenue: 61000, expenses: 38000 },
      { date: "Day 20", revenue: 58000, expenses: 36000 },
      { date: "Day 25", revenue: 65000, expenses: 40000 },
      { date: "Day 30", revenue: 72000, expenses: 42000 },
    ]
  };

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const trendData = {
    labels: financialData.trends.map(t => t.date),
    datasets: [
      {
        label: 'Daily Revenue',
        data: [45000, 42000, 68000, 32000, 31000, 54000, 48000, 58000, 38000, 54000, 56000, 68000, 71000, 32000, 48000, 59000, 64000, 35000, 32000, 54000, 58000, 56000, 42000, 48000, 42000, 32000, 41000, 48000, 52000, 31000],
        borderColor: '#00F2FF',
        backgroundColor: 'rgba(0, 242, 255, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#00F2FF',
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 10, 0.9)',
        titleFont: { family: 'Rajdhani', size: 12, weight: 'bold' },
        bodyFont: { family: 'DM Sans', size: 11 },
        padding: 12,
        borderRadius: 8,
        displayColors: false,
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
        ticks: { 
          color: 'rgba(255, 255, 255, 0.3)', 
          font: { size: 10, family: 'DM Sans' },
          callback: (value) => `₱${value / 1000}k`
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.3)', font: { size: 10, family: 'DM Sans' } }
      }
    }
  };

  const handleExport = () => {
    const exportData = [
      { Category: 'Total Revenue', Amount: financialData.revenue, Note: 'Gross Money In' },
      { Category: 'Cost of Goods Sold', Amount: financialData.cogs, Note: 'Inventory Costs' },
      { Category: 'Gross Profit', Amount: financialData.grossProfit, Note: 'Revenue - COGS' },
      { Category: 'Operating Expenses', Amount: financialData.operatingExpenses, Note: 'Rent, Power, Staff' },
      { Category: 'Net Income', Amount: financialData.netIncome, Note: 'Final Earnings' }
    ];

    try {
      exportToExcel(exportData, 'PCA_Profit_Loss_Report', 'Financials');
      showSuccess("Excel Financial Data Exported");
    } catch (e) {
      showError("Export Error");
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="EARNINGS & EXPENSES" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div>
               <h1 className="text-2xl font-rajdhani font-black uppercase mb-0">
                 FINANCIAL <span className="text-brand-neonblue">STATUS</span>
               </h1>
              <p className="text-[10px] text-muted font-black tracking-[2px] uppercase mt-1">
                Period: Q2 2026 | Real-time Sales & Expense Analysis
              </p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button 
                onClick={handleExport}
                className="flex-1 md:flex-none h-11 px-8 bg-brand-surface border border-border rounded-full flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-brand-hover transition-all text-muted hover:text-main"
              >
                <FileDown size={16} className="text-brand-neonblue" /> Export Excel
              </button>
              <button 
                onClick={() => window.print()}
                className="flex-1 md:flex-none h-11 px-8 bg-brand-surface border border-border rounded-full flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-brand-hover transition-all text-muted hover:text-main"
              >
                <Download size={16} /> Print PDF
              </button>
            </div>
          </div>

          {/* Key Financial Metrics */}
          <div className="responsive-grid mb-6">
            <StatCard 
              title="Total Sales" 
              value={`₱${(financialData.revenue / 1000).toFixed(1)}k`} 
              trend="+12.4%" 
              subtext="Total Money In" 
              icon={PesoSign} 
            />
            <StatCard 
              title="Item Costs" 
              value={`₱${(financialData.cogs / 1000).toFixed(1)}k`} 
              trend="-2.1%" 
              subtext="Buying Stock" 
              icon={Briefcase} 
            />
            <StatCard 
              title="Gross Profit" 
              value={`₱${(financialData.grossProfit / 1000).toFixed(1)}k`} 
              trend="+8.1%" 
              subtext="Profit Margin" 
              icon={Layers} 
            />
            <StatCard 
              title="Net Income" 
              value={`₱${(financialData.netIncome / 1000).toFixed(1)}k`} 
              trend="+15.2%" 
              subtext="Final Profit" 
              icon={Activity} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
            {/* Revenue Flow Chart (Matching User Screenshot) */}
            {/* Revenue Flow Chart (Full Width) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-3 bg-brand-surface border border-border rounded-[24px] p-6 shadow-sm h-fit"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-brand-neonblue rounded-full" />
                  <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">MONEY IN (30 DAY TREND)</h3>
                </div>
                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-neonblue" />
                    DAILY SALES SPEED
                  </div>
                </div>
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

          {/* Recent P&L Activity */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-brand-surface border border-border rounded-[24px] overflow-hidden shadow-sm mb-6"
          >
            <div className="p-8 border-b border-border flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">Quarterly History</h3>
              </div>
              <span className="text-[10px] font-black text-muted uppercase tracking-widest">Fiscal Year 2026</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-brand-bgbase/50 text-[9px] font-black text-main/30 uppercase tracking-[2px]">
                    <th className="px-8 py-4">Month</th>
                    <th className="px-8 py-4">Total Revenue</th>
                    <th className="px-8 py-4">Total Expenses</th>
                    <th className="px-8 py-4">Net Profit</th>
                    <th className="px-8 py-4 text-right">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {[
                    { month: 'January', revenue: 1120000, expenses: 820000, profit: 300000, status: 'positive' },
                    { month: 'February', revenue: 980000, expenses: 750000, profit: 230000, status: 'positive' },
                    { month: 'March', revenue: 1248500, expenses: 967300, profit: 281200, status: 'positive' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-4 font-bold text-main">{row.month}</td>
                      <td className="px-8 py-4 text-[13px] font-rajdhani font-black">₱{row.revenue.toLocaleString()}</td>
                      <td className="px-8 py-4 text-[13px] font-rajdhani font-black text-muted">₱{row.expenses.toLocaleString()}</td>
                      <td className={`px-8 py-4 text-[13px] font-rajdhani font-black ${row.status === 'positive' ? 'text-brand-neonblue' : 'text-brand-crimson'}`}>
                        ₱{row.profit.toLocaleString()}
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
                          Good
                        </span>
                      </td>
                    </tr>
                  ))}
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

