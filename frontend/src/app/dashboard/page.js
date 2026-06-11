"use client";

import { useEffect, useState, useRef } from "react";
import Link from 'next/link';
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Activity,
  Package,
  Users,
  AlertOctagon,
  Calendar,
  Box,
  History,
  Trophy,
  Building,
  Monitor,
  Bell,
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ShoppingCart,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { io } from 'socket.io-client';

const PesoSign = ({ size }) => <span style={{ fontSize: size }} className="font-bold">₱</span>;
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import StatCard from "@/components/StatCard";
import { useTheme } from "@/context/ThemeContext";
import { apiUrl, SOCKET_BASE_URL } from "@/lib/api";
import { getChartTheme } from "@/lib/chartTheme";
import { limitData, getKPIs, getTrendData, getBurnRates, getCrossSellCorrelations, getProductPerformance } from "@/utils/analytics";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler
);

const TARGET_REVENUE = 2000000;

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [comparative, setComparative] = useState([]);
  const [dailyTrends, setDailyTrends] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [globalStock, setGlobalStock] = useState({ branches: [], data: [] });
  const [analyticsMetrics, setAnalyticsMetrics] = useState(null);
  const [branchPerformance, setBranchPerformance] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [dateFilter, setDateFilter] = useState("30");
  const [loading, setLoading] = useState(false);
  const [myRestockRequests, setMyRestockRequests] = useState([]);
  const [pendingRestockRequests, setPendingRestockRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [staffInventory, setStaffInventory] = useState([]);

  const inventoryRef = useRef(null);
  const trendsRef = useRef(null);
  const { theme } = useTheme();
  const chartTheme = getChartTheme();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      window.location.href = "/";
    } else {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      const isStaff = parsedUser.role === 'employee' || parsedUser.role === 'staff';
      const isAdmin = parsedUser.role === 'branch_admin' || parsedUser.role === 'super_admin';
      if (isStaff) {
        fetchStaffData(parsedUser);
      } else {
        fetchAllData();
        if (isAdmin) fetchPendingRestocks();
        const socket = io(SOCKET_BASE_URL, { path: "/socket.io/" });
        socket.on('dashboard_update', () => fetchAllData());
        return () => socket.disconnect();
      }
    }
  }, []);

  const fetchStaffData = async (parsedUser) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [restockRes, notifRes, invRes] = await Promise.all([
        fetch(apiUrl("/api/restock-requests"), { headers }),
        fetch(apiUrl("/api/notifications"), { headers }),
        fetch(apiUrl("/api/inventory"), { headers }),
      ]);
      if (restockRes.ok) {
        const data = await restockRes.json();
        const myReqs = (Array.isArray(data) ? data : data?.data ?? [])
          .filter(r => r.requested_by === parsedUser.id || r.RequestedBy?.id === parsedUser.id);
        setMyRestockRequests(myReqs);
      }
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(Array.isArray(data) ? data.slice(0, 8) : []);
      }
      if (invRes.ok) {
        const data = await invRes.json();
        setStaffInventory(Array.isArray(data) ? data : data?.data ?? []);
      }
    } catch (err) {
      console.error("Error fetching staff dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRestocks = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(apiUrl("/api/restock-requests?status=pending"), { headers });
      if (res.ok) {
        const data = await res.json();
        setPendingRestockRequests(Array.isArray(data) ? data : data?.data ?? []);
      }
    } catch (err) {
      console.error("Error fetching pending restocks:", err);
    }
  };

  const fetchAllData = async (days = dateFilter) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [
        salesRes, invRes, compRes, dailyRes, perfRes, stockRes,
        analyticsRes, branchPerfRes, bestSellersRes
      ] = await Promise.all([
        fetch(apiUrl(`/api/sales/history?days=${days}`), { headers }),
        fetch(apiUrl("/api/inventory"), { headers }),
        fetch(apiUrl(`/api/sales/comparative?days=${days}`), { headers }),
        fetch(apiUrl("/api/sales/daily-trends"), { headers }),
        fetch(apiUrl("/api/sales/performance"), { headers }),
        fetch(apiUrl("/api/inventory/global-status"), { headers }),
        fetch(apiUrl("/api/analytics/dashboard"), { headers }),
        fetch(apiUrl("/api/analytics/branch-performance"), { headers }),
        fetch(apiUrl("/api/analytics/best-sellers"), { headers })
      ]);
      if (salesRes.ok) setSalesHistory(limitData(await salesRes.json(), 1000));
      if (invRes.ok) { const d = await invRes.json(); setInventory(Array.isArray(d) ? d : d?.data ?? []); }
      if (compRes.ok) setComparative(await compRes.json());
      if (dailyRes.ok) setDailyTrends(await dailyRes.json());
      if (perfRes.ok) setPerformance(await perfRes.json());
      if (stockRes.ok) setGlobalStock(await stockRes.json());
      if (analyticsRes.ok) setAnalyticsMetrics(await analyticsRes.json());
      if (branchPerfRes.ok) setBranchPerformance(await branchPerfRes.json());
      if (bestSellersRes.ok) setBestSellers(await bestSellersRes.json());
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      showError("Failed to sync intelligence matrix.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (ref) => {
    if (ref && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- Process Analytics ---
  const kpis = getKPIs(salesHistory, inventory);
  const trends = getTrendData(salesHistory);
  const burnRates = getBurnRates(salesHistory, inventory);
  const correlations = getCrossSellCorrelations(salesHistory);
  const { starProducts, deadStock } = getProductPerformance(salesHistory, inventory, correlations);
  const criticalItems = burnRates.filter(b => b.status === 'critical');
  const summaryInsight = {
    restocks: criticalItems.length,
    deadStock: deadStock.length,
    trend: trends.revenueByMonth[new Date().getMonth()] > (trends.revenueByMonth[new Date().getMonth() - 1] || 0) ? 'up' : 'down'
  };

  // --- Chart Data ---
  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      { label: 'Revenue', data: trends.revenueByMonth, borderColor: '#0EA5E9', backgroundColor: 'rgba(14,165,233,0.1)', borderWidth: 3, tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6 },
      { label: 'Est. Profit', data: trends.profitByMonth, borderColor: '#10B981', backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, fill: false, pointRadius: 0, pointHoverRadius: 6 }
    ]
  };
  const lineChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: theme === 'dark' ? '#94a3b8' : '#64748b', font: { family: 'DM Sans', weight: 'bold' } } },
      tooltip: { mode: 'index', intersect: false, backgroundColor: theme === 'dark' ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)', titleColor: theme === 'dark' ? '#fff' : '#0f172a', bodyColor: theme === 'dark' ? '#94a3b8' : '#64748b', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderWidth: 1, padding: 12, callbacks: { label: (c) => `₱${c.parsed.y.toLocaleString()}` } }
    },
    scales: { y: { grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
  };

  const currentMonth = new Date().getMonth();
  const currentRevenue = trends.revenueByMonth[currentMonth] || 0;
  const currentDay = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const predictedRevenue = currentDay > 0 ? (currentRevenue / currentDay) * daysInMonth : 0;
  const targetAchieved = Math.min((currentRevenue / TARGET_REVENUE) * 100, 100);
  const targetRemaining = Math.max(100 - targetAchieved, 0);
  let gaugeColor = '#EF4444';
  if (targetAchieved >= 100) gaugeColor = '#10B981';
  else if (targetAchieved >= 81) gaugeColor = '#22C55E';
  else if (targetAchieved >= 61) gaugeColor = '#84CC16';
  else if (targetAchieved >= 31) gaugeColor = '#F59E0B';

  const gaugeData = { datasets: [{ data: [targetAchieved, targetRemaining], backgroundColor: [gaugeColor, theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'], borderWidth: 0, circumference: 180, rotation: 270, cutout: '80%' }] };

  const barChartData = {
    labels: correlations.map(c => c.pair),
    datasets: [{ label: 'Purchase Correlation %', data: correlations.map(c => c.percentage), backgroundColor: 'rgba(139,92,246,0.8)', borderRadius: 4 }]
  };
  const barChartOptions = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: { backgroundColor: chartTheme.tooltipBackgroundColor, titleColor: chartTheme.tooltipTitleColor, bodyColor: chartTheme.tooltipBodyColor, borderColor: chartTheme.tooltipBorderColor, borderWidth: 1, callbacks: { label: (c) => `Bought together ${c.parsed.x}% of the time` } } },
    scales: { x: { max: 100, grid: { color: chartTheme.gridColor }, ticks: { color: chartTheme.tickColor } }, y: { grid: { display: false }, ticks: { color: chartTheme.tickColor } } }
  };

  const dailyTrendData = {
    labels: dailyTrends.map(t => new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' })),
    datasets: [{ label: 'Daily Revenue', data: dailyTrends.map(t => t.revenue), borderColor: '#00F2FF', backgroundColor: 'rgba(0,242,255,0.1)', borderWidth: 3, tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6 }]
  };

  const branchComparisonLargeData = {
    labels: comparative.map(b => b.branch_name),
    datasets: [
      { label: 'Revenue (₱)', data: comparative.map(b => b.total_revenue), backgroundColor: '#D72638', borderRadius: 8, yAxisID: 'y', barPercentage: 0.6 },
      { label: 'Orders', data: comparative.map(b => b.order_count), backgroundColor: 'rgba(0,242,255,0.4)', borderColor: '#00F2FF', borderWidth: 2, borderRadius: 8, yAxisID: 'y1', barPercentage: 0.4 }
    ]
  };

  // ── Staff Dashboard helpers ────────────────────────────────────────────────
  const isStaffUser = user?.role === 'employee' || user?.role === 'staff';
  const lowStockItems = staffInventory.filter(i => (i.quantity ?? 0) <= 10 && (i.quantity ?? 0) > 0);
  const outOfStockItems = staffInventory.filter(i => (i.quantity ?? 0) === 0);

  const statusBadge = (status) => ({
    pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  }[status] ?? 'bg-muted/10 text-muted border-border/20');

  const statusIcon = (status) => ({
    pending:  <Clock size={12} />,
    approved: <CheckCircle size={12} />,
    rejected: <XCircle size={12} />,
  }[status] ?? <Clock size={12} />);

  // ── STAFF VIEW ─────────────────────────────────────────────────────────────
  if (isStaffUser) {
    return (
      <div className={`flex min-h-screen text-main font-dmsans transition-all duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <TopBar title="MY WORKSPACE" />
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
            <div className="responsive-container">
              <div className="mb-6">
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-2">
                  Staff Overview
                </motion.h2>
                <h1 className="text-2xl font-rajdhani font-black uppercase">DASH<span className="text-brand-crimson">BOARD</span></h1>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-2 border-t-brand-crimson rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'Total Products', value: staffInventory.length, icon: Package, color: '#0EA5E9' },
                      { label: 'Low Stock Items', value: lowStockItems.length, icon: AlertTriangle, color: '#F59E0B' },
                      { label: 'Out of Stock', value: outOfStockItems.length, icon: XCircle, color: '#EF4444' },
                      { label: 'My Requests', value: myRestockRequests.length, icon: ClipboardCheck, color: '#8B5CF6' },
                    ].map((card, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4 md:p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted">{card.label}</span>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.color + '20', color: card.color }}>
                            <card.icon size={15} />
                          </div>
                        </div>
                        <p className="text-3xl font-rajdhani font-black" style={{ color: card.color }}>{card.value}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* My Restock Requests + Notifications */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="glass-card flex flex-col h-[420px]">
                      <div className="p-5 border-b border-border/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-brand-crimson rounded-full" />
                          <h3 className="font-rajdhani font-black text-lg uppercase tracking-widest">My Restock Requests</h3>
                        </div>
                        <Link href="/reports/stock" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-neonblue hover:underline">
                          Manage Stock <ChevronRight size={12} />
                        </Link>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {myRestockRequests.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-muted gap-3">
                            <ClipboardCheck size={32} className="opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No restock requests yet</p>
                            <Link href="/reports/stock" className="btn-primary text-[10px] px-4 py-2 mt-2">Request Restock</Link>
                          </div>
                        ) : (
                          <div className="divide-y divide-border/10">
                            {myRestockRequests.map((req, i) => (
                              <motion.div key={req.id ?? i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                className="px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-main truncate">{req.Product?.name ?? req.product_name ?? `Product #${req.product_id}`}</p>
                                  <p className="text-[9px] font-black text-muted uppercase tracking-widest mt-0.5">
                                    Qty: {req.quantity_requested} &bull; {new Date(req.createdAt ?? req.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusBadge(req.status)}`}>
                                  {statusIcon(req.status)} {req.status}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="glass-card flex flex-col h-[420px]">
                      <div className="p-5 border-b border-border/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-brand-neonblue rounded-full" />
                          <h3 className="font-rajdhani font-black text-lg uppercase tracking-widest">Notifications</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-brand-neonblue animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-neonblue">Live</span>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-muted gap-3">
                            <Bell size={32} className="opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No notifications</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-border/10">
                            {notifications.map((notif, i) => (
                              <motion.div key={notif.id ?? i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                                className="px-5 py-4 hover:bg-white/5 transition-colors">
                                <div className="flex items-start gap-3">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-muted/30' : 'bg-brand-neonblue'}`} />
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-main leading-snug">{notif.message ?? notif.title ?? 'System notification'}</p>
                                    <p className="text-[9px] font-black text-muted uppercase tracking-widest mt-1">
                                      {new Date(notif.createdAt ?? notif.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Low Stock Alert Table */}
                  {lowStockItems.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card mb-8">
                      <div className="p-5 border-b border-border/20 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-yellow-500 rounded-full" />
                        <h3 className="font-rajdhani font-black text-lg uppercase tracking-widest">Low Stock Alert</h3>
                        <span className="ml-auto px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-black uppercase">{lowStockItems.length} items</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[500px]">
                          <thead>
                            <tr className="bg-brand-bgbase text-[10px] font-black text-main/60 uppercase tracking-widest">
                              <th className="px-5 py-3">Product</th>
                              <th className="px-5 py-3">Category</th>
                              <th className="px-5 py-3 text-center">Stock</th>
                              <th className="px-5 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/10">
                            {lowStockItems.map((item, i) => (
                              <tr key={item.id ?? i} className="hover:bg-white/5 transition-colors">
                                <td className="px-5 py-3">
                                  <p className="text-sm font-bold text-main">{item.Product?.name ?? item.name ?? '—'}</p>
                                  <p className="text-[9px] font-black text-muted uppercase tracking-wider">{item.Product?.sku ?? item.sku ?? ''}</p>
                                </td>
                                <td className="px-5 py-3 text-xs text-muted font-bold">{item.Product?.category ?? item.category ?? '—'}</td>
                                <td className="px-5 py-3 text-center">
                                  <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-black">{item.quantity ?? 0} left</span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <Link href="/reports/stock" className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-crimson/10 text-brand-crimson border border-brand-crimson/20 text-[10px] font-black uppercase hover:bg-brand-crimson hover:text-white transition-colors">
                                    <RefreshCw size={10} /> Request
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'New Sale', icon: ShoppingCart, href: '/sales', color: '#10B981' },
                      { label: 'Manage Stock', icon: Package, href: '/reports/stock', color: '#0EA5E9' },
                      { label: 'All Sales', icon: History, href: '/sell/all', color: '#8B5CF6' },
                      { label: 'Customers', icon: Users, href: '/customers', color: '#F59E0B' },
                    ].map((action, i) => (
                      <motion.div key={i} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        <Link href={action.href} className="block glass-card p-5 text-center hover:border-opacity-60 transition-all group">
                          <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: action.color + '20', color: action.color }}>
                            <action.icon size={18} />
                          </div>
                          <p className="text-[11px] font-black uppercase tracking-widest text-muted group-hover:text-main transition-colors">{action.label}</p>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── ADMIN / SUPER ADMIN VIEW ───────────────────────────────────────────────
  return (
    <div className={`flex min-h-screen text-main font-dmsans transition-all duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="INTELLIGENCE HUB" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container">

            {/* Header */}
            <div className="mb-6">
              <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-2">
                {user?.role === 'super_admin' ? 'Global Overview' : 'Branch Operations'}
              </motion.h2>
              <h1 className="text-2xl font-rajdhani font-black uppercase">DASH<span className="text-brand-crimson">BOARD</span></h1>
            </div>

            {/* Action Bar */}
            <div className="w-full bg-brand-surface/40 border border-brand-neonblue/20 rounded-xl p-3 md:p-4 mb-8 flex flex-col sm:flex-row items-center justify-between shadow-[0_0_15px_rgba(14,165,233,0.05)] gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full sm:w-auto">
                <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
                  <div className="h-2 w-2 rounded-full bg-brand-neonblue animate-pulse" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-brand-neonblue">Quick Notifications</span>
                </div>
                <div className="flex gap-4 text-[9px] sm:text-[11px] font-bold text-main/80 uppercase tracking-widest flex-wrap justify-center">
                  <span onClick={() => scrollToSection(inventoryRef)} className="cursor-pointer hover:text-brand-crimson transition-colors flex items-center gap-1">⚠️ {summaryInsight.restocks} critical restocks</span>
                  <span onClick={() => scrollToSection(inventoryRef)} className="cursor-pointer hover:text-yellow-500 transition-colors flex items-center gap-1">🔻 {summaryInsight.deadStock} dead stock items</span>
                  <span onClick={() => scrollToSection(trendsRef)} className="cursor-pointer hover:text-brand-neonblue transition-colors flex items-center gap-1">{summaryInsight.trend === 'up' ? '📈 Revenue growing' : '📉 Revenue cooling'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <select className="bg-brand-surface border border-border text-main text-xs font-bold px-4 py-2 rounded-lg outline-none cursor-pointer focus:border-brand-neonblue transition-colors flex-1 sm:flex-none" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="365">This Year</option>
                </select>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fetchAllData()} disabled={loading}
                  className={`bg-brand-bgbase border border-border/50 text-muted hover:text-main px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors shrink-0 ${loading ? 'opacity-50 cursor-wait' : ''}`}>
                  {loading ? <div className="w-3 h-3 border border-t-brand-neonblue rounded-full animate-spin" /> : <Calendar size={12} />}
                  {loading ? 'SYNCING...' : 'Filter'}
                </motion.button>
              </div>
            </div>

            {/* Urgent Alert */}
            {criticalItems.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full bg-brand-crimson/10 border-l-4 border-brand-crimson rounded-r-xl p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertOctagon className="text-brand-crimson animate-pulse" size={20} />
                  <div>
                    <h4 className="text-brand-crimson font-black text-sm uppercase tracking-widest">Urgent Alert</h4>
                    <p className="text-xs text-brand-crimson/80 font-bold">{criticalItems[0].name} runs out in {criticalItems[0].daysRemaining} days!</p>
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-danger py-1 px-4 text-[10px]">Restock Now</motion.button>
              </motion.div>
            )}

            {/* KPI Cards */}
            <div className="responsive-grid mb-8">
              <StatCard title="Total Revenue" value={`₱${(analyticsMetrics?.totalRevenue ?? kpis.revenue).toLocaleString()}`} icon={PesoSign} trend={user?.role === 'super_admin' ? "Live Global Total" : "Branch Total"} />
              <StatCard title="Total Stock" value={analyticsMetrics?.totalStock ?? (Array.isArray(inventory) ? inventory.reduce((s, i) => s + i.quantity, 0) : 0)} icon={Box} trend="Units On-Hand" />
              <StatCard title="System Orders" value={analyticsMetrics?.totalOrders ?? kpis.orders} icon={Package} trend={user?.role === 'super_admin' ? "System Wide" : "Branch Orders"} />
              <StatCard title="Status Matrix" value="Optimal" icon={Activity} trend="System Online" />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" ref={trendsRef}>
              {/* Sales Trend */}
              <div className="lg:col-span-2 glass-card p-4 md:p-8 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-rajdhani font-black text-lg md:text-xl uppercase tracking-widest text-main">Sales &amp; Profit Trend</h3>
                    <p className="text-[10px] text-muted uppercase tracking-wider font-bold">How much money we are making</p>
                  </div>
                </div>
                <div className="flex-1 min-h-[250px] md:min-h-[300px]">
                  {salesHistory.length > 0 && currentRevenue > 0 ? (
                    <Line data={lineChartData} options={lineChartOptions} />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-muted border border-dashed border-border/20 rounded-xl bg-brand-bgbase/20 p-8">
                      <TrendingUp className="mb-4 opacity-50" size={32} />
                      <span className="text-[10px] uppercase font-black tracking-widest opacity-50 text-center">Waiting for Sales Data...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Executive Summary */}
              <div className="glass-card p-6 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-6">
                  <Monitor className="text-brand-neonblue" size={22} />
                  <h3 className="font-rajdhani font-black text-xl uppercase tracking-widest">Executive Summary</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Revenue", value: `₱${(analyticsMetrics?.totalRevenue ?? kpis.revenue).toLocaleString()}`, color: "text-green-500" },
                    { label: "Orders", value: analyticsMetrics?.totalOrders ?? kpis.orders, color: "text-main" },
                    { label: "Critical Stock", value: criticalItems.length, color: "text-red-500" },
                    { label: "Dead Stock", value: deadStock.length, color: "text-yellow-500" },
                    { label: "Status", value: "ONLINE", color: "text-cyan-400" },
                  ].map((row, i) => (
                    <div key={i} className={`flex justify-between items-center ${i < 4 ? 'border-b border-border/20 pb-3' : ''}`}>
                      <span className="text-xs uppercase font-black text-muted">{row.label}</span>
                      <span className={`text-lg font-black ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue Forecast */}
              <div className="glass-card p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-rajdhani font-black text-xl uppercase tracking-widest">Revenue Forecast</h3>
                  <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] uppercase font-black tracking-widest">Predictive Analytics</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-brand-bgbase/30 rounded-xl p-4">
                    <p className="text-[10px] uppercase font-black text-muted mb-2">Current Revenue</p>
                    <p className="text-2xl font-black">₱{currentRevenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-brand-bgbase/30 rounded-xl p-4">
                    <p className="text-[10px] uppercase font-black text-muted mb-2">Predicted End of Month</p>
                    <p className="text-2xl font-black text-green-500">₱{Math.round(predictedRevenue).toLocaleString()}</p>
                  </div>
                  <div className="bg-brand-bgbase/30 rounded-xl p-4 md:col-span-2">
                    <p className="text-[10px] uppercase font-black text-muted mb-2">Recommendation</p>
                    <p className="text-sm font-bold text-brand-neonblue">Revenue trend indicates positive growth trajectory.</p>
                  </div>
                </div>
              </div>

              {/* Target Gauge */}
              <div className="glass-card p-4 md:p-8 flex flex-col items-center justify-center relative min-h-[300px]">
                <h3 className="font-rajdhani font-black text-xl uppercase tracking-widest text-main mb-2">Monthly Target</h3>
                <p className="text-xs text-muted uppercase tracking-wider font-bold mb-6">₱{TARGET_REVENUE.toLocaleString()} Goal</p>
                <div className="w-56 h-32 relative flex justify-center overflow-hidden">
                  {salesHistory.length > 0 && currentRevenue > 0 ? (
                    <Doughnut data={gaugeData} options={{ responsive: true, maintainAspectRatio: false, plugins: { tooltip: { enabled: false } } }} />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-end pb-4 border-b-2 border-border/20">
                      <span className="text-[10px] uppercase font-black tracking-widest text-muted opacity-50 mb-2">No Target Data</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 flex flex-col items-center">
                    <span className="text-3xl font-rajdhani font-black" style={{ color: salesHistory.length > 0 && currentRevenue > 0 ? gaugeColor : '#555' }}>
                      {salesHistory.length > 0 && currentRevenue > 0 ? targetAchieved.toFixed(1) : 0}%
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted mt-1">
                      {salesHistory.length === 0 || currentRevenue === 0 ? 'Awaiting Sales'
                        : targetAchieved >= 100 ? 'Target Achieved'
                        : targetAchieved >= 81 ? 'On Track'
                        : targetAchieved >= 61 ? 'Good Progress'
                        : targetAchieved >= 31 ? 'Needs Attention'
                        : 'Critical'}
                    </span>
                  </div>
                </div>
                <div className="mt-6 w-full px-4 text-center">
                  <p className="text-xs md:text-sm font-bold text-main">₱{currentRevenue.toLocaleString()} <span className="text-muted text-[10px] md:text-xs">achieved</span></p>
                </div>
              </div>

              {/* Branch Performance (Super Admin) */}
              {user?.role === 'super_admin' && (
                <div className="lg:col-span-3">
                  <div className="glass-card overflow-hidden h-[400px] md:h-[500px] flex flex-col mb-6">
                    <div className="p-4 md:p-8 border-b border-border/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-brand-crimson rounded-full" />
                        <h3 className="font-rajdhani font-black text-lg md:text-xl uppercase tracking-widest text-main">Branch Performance Matrix</h3>
                      </div>
                    </div>
                    <div className="p-4 md:p-8 flex-1 min-h-0 overflow-hidden">
                      {comparative.length > 0 ? (
                        <div className="h-full w-full">
                          <Bar data={branchComparisonLargeData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { position: 'left', grid: { color: chartTheme.gridColor }, ticks: { color: chartTheme.tickColor, font: { size: 10 } } }, y1: { position: 'right', grid: { display: false }, ticks: { color: '#00F2FF', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { color: chartTheme.tickColor, font: { size: 10 } } } } }} />
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center border border-dashed border-border/20 rounded-xl bg-brand-bgbase/10">
                          <p className="text-[10px] font-black uppercase tracking-[4px] text-muted/30">Matrix Awaiting Data</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {comparative.map((b, i) => (
                      <motion.div key={i} whileHover={{ y: -5 }} className="p-4 md:p-6 bg-brand-bgbase/40 rounded-[24px] border border-border group hover:border-brand-crimson/30 transition-all shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-black text-muted group-hover:text-main uppercase tracking-[3px] transition-colors">{b.branch_name}</p>
                          <Building size={14} className="text-muted group-hover:text-brand-crimson transition-colors" />
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-2xl font-rajdhani font-black text-main tracking-tight">₱{(b.total_revenue).toLocaleString()}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-[9px] font-black text-muted uppercase tracking-widest">Revenue</p>
                              <p className="text-[10px] font-black text-brand-neonblue uppercase tracking-widest">{b.order_count} Orders</p>
                            </div>
                          </div>
                          <div className="pt-4 border-t border-border/10">
                            <p className="text-[8px] font-black text-muted uppercase tracking-widest mb-1 opacity-50">Branch Best Seller</p>
                            <div className="flex items-center gap-2">
                              <Trophy size={12} className="text-yellow-500" />
                              <p className="text-[11px] font-bold text-main truncate">{b.top_product || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Revenue Flow */}
              <div className="lg:col-span-2 glass-card p-4 md:p-8 h-[350px] md:h-[450px] flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1.5 h-6 bg-brand-neonblue rounded-full" />
                  <h3 className="text-xs md:text-sm font-rajdhani font-black uppercase text-main tracking-widest">Daily Revenue Flow (30 Cycle)</h3>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {dailyTrends.length > 0 ? (
                    <div className="h-full w-full">
                      <Line data={dailyTrendData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: chartTheme.gridColor }, ticks: { color: chartTheme.tickColor, font: { size: 10 } } }, x: { grid: { display: false }, ticks: { color: chartTheme.tickColor, font: { size: 10 } } } } }} />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-brand-bgbase/20 border border-dashed border-border/20 rounded-3xl p-8">
                      <Activity size={32} className="text-muted/10 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-[4px] text-muted/30">No Daily Pulse Detected</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cross-Sell Insights */}
              <div className="glass-card p-4 md:p-8 flex flex-col h-[350px] md:h-[450px]">
                <h3 className="font-rajdhani font-black text-lg md:text-xl uppercase tracking-widest text-main mb-2">Cross-Sell Insights</h3>
                <p className="text-[10px] text-muted uppercase tracking-wider font-bold mb-6">Items frequently bought together</p>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {correlations.length > 0 ? (
                    <div className="h-full w-full"><Bar data={barChartData} options={barChartOptions} /></div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted font-bold text-[10px] uppercase tracking-widest border border-dashed border-border/20 rounded-xl bg-brand-bgbase/20 p-8 text-center">Insufficient Correlation Data</div>
                  )}
                </div>
              </div>

              {/* Inventory Health */}
              <div className="lg:col-span-2 glass-card p-4 md:p-8 flex flex-col h-[400px] md:h-[510px]" ref={inventoryRef}>
                <h3 className="font-rajdhani font-black text-lg md:text-xl uppercase tracking-widest text-main flex items-center gap-2 mb-2">🏥 Inventory Health</h3>
                <p className="text-xs text-muted uppercase tracking-wider font-bold mb-6">Tracking low stock and unused money</p>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                  <div>
                    <h5 className="text-[10px] font-black tracking-[3px] uppercase text-brand-crimson/70 mb-3 border-b border-brand-crimson/10 pb-1">Items Running Out</h5>
                    <div className="space-y-3">
                      {burnRates.length > 0 ? burnRates.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-border/5 bg-brand-surface/20">
                          <div>
                            <h4 className="font-bold text-xs text-main">{item.name}</h4>
                            <span className="text-[9px] text-muted uppercase font-black tracking-wider">Vol: {item.dailyVelocity}/day &bull; {item.stock} left</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${item.status === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : item.status === 'warning' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                              {item.daysRemaining} Days
                            </span>
                            <Link href="/reports/stock" className="mt-1 px-3 py-1 bg-brand-neonblue/20 text-brand-neonblue hover:bg-brand-neonblue hover:text-white transition-colors rounded text-[8px] font-black uppercase tracking-widest border border-brand-neonblue/30 inline-block text-center cursor-pointer">
                              Restock Req.
                            </Link>
                          </div>
                        </div>
                      )) : (
                        <div className="text-[10px] font-black text-muted/50 uppercase tracking-widest">No immediate stock-out risks.</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black tracking-[3px] uppercase text-yellow-500/70 mb-3 border-b border-yellow-500/10 pb-1">Dead Stock (Money Stuck)</h5>
                    <div className="space-y-3">
                      {deadStock.length > 0 ? deadStock.map((item, idx) => (
                        <div key={idx} className="flex flex-col justify-between p-3 rounded-lg border border-border/5 bg-brand-surface/20 gap-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-xs text-main">{item.name}</h4>
                              <span className="text-[9px] text-muted uppercase font-black tracking-wider">{item.stock} Units holding capital</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${item.tagColor}`}>{item.severity}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-brand-bgbase/40 rounded">
                            <span className="text-[8px] text-main/40 uppercase tracking-widest font-black">Sys:</span>
                            <span className="text-[9px] text-yellow-600/80 font-bold tracking-wide">{item.insight}</span>
                          </div>
                        </div>
                      )) : (
                        <div className="text-[10px] font-black text-muted/50 uppercase tracking-widest">Looking good! No dead stock.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Sales Ledger */}
              <div className="glass-card flex flex-col h-[400px] md:h-[510px]">
                <div className="p-4 md:p-8 border-b border-border/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                    <h3 className="font-rajdhani font-black text-lg md:text-xl uppercase tracking-widest text-main">Recent Transactions</h3>
                  </div>
                  <span className="text-[10px] font-black text-muted uppercase tracking-widest">Live Feed</span>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                  {salesHistory.slice(0, 10).map((order, i) => {
                    const amount = parseFloat(order.totalAmount ?? order.total_amount ?? 0);
                    const name = order.customerName ?? order.customer_name ?? 'Walk-in';
                    const method = order.paymentMethod ?? order.payment_method ?? '—';
                    const invoice = order.invoiceNumber ?? `#${order.id?.toString().slice(-6) ?? i}`;
                    return (
                      <div key={order.id ?? i} className="px-4 md:px-8 py-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-border/10">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-brand-bgbase border border-border flex items-center justify-center text-muted">
                            <History size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-main truncate">{name}</p>
                            <p className="text-[9px] font-black text-muted uppercase tracking-widest truncate">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {order.Branch?.name ?? '—'} &bull; {invoice}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-rajdhani font-black text-green-500">₱{amount.toLocaleString()}</p>
                          <p className="text-[8px] font-black text-muted uppercase tracking-widest">{method}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending Restock Approvals (Admin / Branch Admin) */}
              {(user?.role === 'branch_admin' || user?.role === 'super_admin') && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 glass-card flex flex-col">
                  <div className="p-5 border-b border-border/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-brand-crimson rounded-full" />
                      <h3 className="font-rajdhani font-black text-xl uppercase tracking-widest">Pending Restock Approvals</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      {pendingRestockRequests.length > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-black">{pendingRestockRequests.length} pending</span>
                      )}
                      <Link href="/reports/stock" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-neonblue hover:underline">
                        Manage <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                  {pendingRestockRequests.length === 0 ? (
                    <div className="p-10 flex flex-col items-center justify-center text-muted gap-3">
                      <ClipboardCheck size={32} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No pending restock requests</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[600px]">
                        <thead>
                          <tr className="bg-brand-bgbase text-[10px] font-black text-main/60 uppercase tracking-widest">
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3">Requested By</th>
                            <th className="px-6 py-3 text-center">Qty</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10">
                          {pendingRestockRequests.slice(0, 8).map((req, i) => (
                            <tr key={req.id ?? i} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-main">{req.Product?.name ?? req.product_name ?? `Product #${req.product_id}`}</p>
                                <p className="text-[9px] font-black text-muted uppercase tracking-wider">{req.Product?.category ?? ''}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-semibold text-main">{req.RequestedBy?.username ?? req.RequestedBy?.name ?? `Staff #${req.requested_by}`}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-black text-main">{req.quantity_requested}</span>
                              </td>
                              <td className="px-6 py-4 text-xs text-muted font-bold">{new Date(req.createdAt ?? req.created_at).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-right">
                                <Link href="/reports/stock" className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-neonblue/10 text-brand-neonblue border border-brand-neonblue/20 text-[10px] font-black uppercase hover:bg-brand-neonblue hover:text-white transition-colors">
                                  Review
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Global Stock Matrix (Super Admin) */}
              {user?.role === 'super_admin' && (
                <div className="lg:col-span-3 glass-card overflow-hidden flex flex-col h-[400px] md:h-[510px]">
                  <div className="p-4 md:p-8 border-b border-border/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-brand-neonpurple rounded-full" />
                      <h3 className="font-rajdhani font-black text-lg md:text-xl uppercase tracking-widest text-main">Global Stock Matrix</h3>
                    </div>
                    <span className="text-[10px] font-black text-muted uppercase tracking-widest">Across All Sectors</span>
                  </div>
                  <div className="flex-1 overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="bg-brand-bgbase text-[11px] font-black text-main/80 uppercase tracking-[2px] shadow-sm">
                          <th className="px-6 py-4">Component</th>
                          {globalStock.branches.map(b => <th key={b} className="px-6 py-4 text-center">{b}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10">
                        {globalStock.data.slice(0, 15).map((item, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 min-w-[200px]">
                              <p className="text-[12px] font-bold text-main truncate">{item.name}</p>
                              <p className="text-[9px] font-black text-muted/40 uppercase tracking-widest">{item.sku}</p>
                            </td>
                            {globalStock.branches.map(b => (
                              <td key={b} className="px-6 py-4 text-center">
                                <span className={`text-[12px] font-mono font-black ${item.stock[b] <= 5 ? 'text-brand-crimson' : 'text-main/80'}`}>{item.stock[b]}</span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
