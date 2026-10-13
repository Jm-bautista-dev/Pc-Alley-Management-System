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
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";

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

  const [financialData, setFinancialData] = useState({
    revenue: 0,
    grossSales: 0,
    returnsRefunded: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    netIncome: 0,
    trends: [],
    formula: "Net Sales (Gross Sales less Returns) - Cost of Goods Sold - Operating Expenses = Net Income"
  });

  useEffect(() => {
    const fetchPL = async () => {
      setLoading(true);
      try {
        const res = await apiFetch("/api/analytics/profit-loss");
        if (res.ok) {
          const data = await res.json();
          setFinancialData(data);
        }
      } catch (err) {
        console.error("Failed to load P&L:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPL();
  }, []);

  const trendLabels = financialData.trends?.length > 0 ? financialData.trends.map(t => t.date) : ["Current Period"];
  const trendValues = financialData.trends?.length > 0 ? financialData.trends.map(t => t.revenue) : [financialData.revenue];

  const trendData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Net Sales',
        data: trendValues,
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
      toast.success("Excel Financial Data Exported");
    } catch (e) {
      toast.error("Export Error");
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
              <p className="text-[10px] text-brand-neonblue font-black tracking-[2px] uppercase mt-1">
                Audited Formula: {financialData.formula || "Net Sales - Cost of Goods Sold - Operating Expenses = Net Income"}
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
              title="Net Sales" 
              value={`₱${Number(financialData.revenue || 0).toLocaleString()}`} 
              trend="+12.4%" 
              subtext={`Gross: ₱${Number(financialData.grossSales || 0).toLocaleString()}${financialData.returnsRefunded > 0 ? ` (Less ₱${Number(financialData.returnsRefunded).toLocaleString()} Returns)` : ""}`} 
              icon={PesoSign} 
            />
            <StatCard 
              title="Cost of Goods Sold" 
              value={`₱${Number(financialData.cogs || 0).toLocaleString()}`} 
              trend="-2.1%" 
              subtext="Inventory Sold Cost" 
              icon={Briefcase} 
            />
            <StatCard 
              title="Gross Profit" 
              value={`₱${Number(financialData.grossProfit || 0).toLocaleString()}`} 
              trend="+8.1%" 
              subtext="Net Sales less COGS" 
              icon={Layers} 
            />
            <StatCard 
              title="Net Income" 
              value={`₱${Number(financialData.netIncome || 0).toLocaleString()}`} 
              trend="+15.2%" 
              subtext={`Less ₱${Number(financialData.operatingExpenses || 0).toLocaleString()} Operating Expenses`} 
              icon={Activity} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
            {/* Revenue Flow Chart (Matching User Screenshot) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-brand-surface border border-border rounded-[24px] p-6 shadow-sm h-fit"
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

            {/* Expense Breakdown / Summary */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-brand-surface border border-border rounded-[24px] p-6 shadow-sm flex flex-col h-fit"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-brand-neonpurple rounded-full" />
                <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">Financial Breakdown</h3>
              </div>
              <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
                <div className="p-5 bg-brand-bgbase/40 border border-border rounded-2xl">
                  <p className="text-[10px] font-black text-muted uppercase tracking-[2px] mb-1">Operating Expenses</p>
                  <p className="text-2xl font-rajdhani font-black text-main">₱125,000.00</p>
                  <div className="mt-4 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-brand-neonpurple w-[30%]" />
                  </div>
                  <p className="text-[9px] font-black text-muted mt-2 uppercase tracking-widest">30% of Gross Profit</p>
                </div>

                <div className="p-5 bg-brand-bgbase/40 border border-border rounded-2xl">
                  <p className="text-[10px] font-black text-muted uppercase tracking-[2px] mb-1">Tax Liability (Est.)</p>
                  <p className="text-2xl font-rajdhani font-black text-main">₱42,180.00</p>
                  <div className="mt-4 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-brand-crimson w-[15%]" />
                  </div>
                  <p className="text-[9px] font-black text-muted mt-2 uppercase tracking-widest">15% Effective Rate</p>
                </div>

                <div className="p-5 bg-brand-bgbase/40 border border-border rounded-2xl">
                  <p className="text-[10px] font-black text-muted uppercase tracking-[2px] mb-1">Retention Yield</p>
                  <p className="text-2xl font-rajdhani font-black text-brand-neonblue">₱239,020.00</p>
                  <div className="mt-4 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-brand-neonblue w-[58%]" />
                  </div>
                  <p className="text-[9px] font-black text-muted mt-2 uppercase tracking-widest">Profit Kept</p>
                </div>
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
        <Toaster position="top-right" />
      </main>
    </div>
  );
}

