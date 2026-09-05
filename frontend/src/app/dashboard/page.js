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
  ChevronRight,
  Wrench,
  DollarSign,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  Tag
} from "lucide-react";
import { io } from 'socket.io-client';

const PesoSign = ({ size = 16 }) => <span style={{ fontSize: size }} className="font-bold">₱</span>;

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

import dynamic from 'next/dynamic';
const Line = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-brand-surface/10 animate-pulse rounded-xl" />
});
const Bar = dynamic(() => import('react-chartjs-2').then((mod) => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-brand-surface/10 animate-pulse rounded-xl" />
});

import StatCard from "@/components/StatCard";
import { useTheme } from "@/context/ThemeContext";
import { apiUrl, SOCKET_BASE_URL } from "@/lib/api";
import { getChartTheme } from "@/lib/chartTheme";
import { limitData, getKPIs, getTrendData, getBurnRates, getProductPerformance } from "@/utils/analytics";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler
);

const SkeletonCard = () => (
  <div className="glass-card p-5 md:p-6 border border-border/50 bg-brand-surface/[0.02] animate-pulse flex flex-col justify-between h-[130px]">
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div className="w-24 h-2.5 bg-main/10 rounded" />
        <div className="w-7 h-7 bg-main/10 rounded-lg" />
      </div>
      <div className="w-32 h-7 bg-main/10 rounded mt-1" />
    </div>
    <div className="w-28 h-3.5 bg-main/10 rounded mt-2" />
  </div>
);

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [comparative, setComparative] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [analyticsMetrics, setAnalyticsMetrics] = useState(null);
  const [bestSellers, setBestSellers] = useState([]);
  const [dateFilter, setDateFilter] = useState("30");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [myRestockRequests, setMyRestockRequests] = useState([]);
  const [pendingRestockRequests, setPendingRestockRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [staffInventory, setStaffInventory] = useState([]);

  const cacheRef = useRef({});
  const dateFilterRef = useRef(dateFilter);
  const customStartDateRef = useRef(customStartDate);
  const customEndDateRef = useRef(customEndDate);

  const inventoryRef = useRef(null);
  const trendsRef = useRef(null);
  const { theme } = useTheme();
  const chartTheme = getChartTheme();

  useEffect(() => {
    dateFilterRef.current = dateFilter;
  }, [dateFilter]);

  useEffect(() => {
    customStartDateRef.current = customStartDate;
  }, [customStartDate]);

  useEffect(() => {
    customEndDateRef.current = customEndDate;
  }, [customEndDate]);

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
        if (isAdmin) fetchPendingRestocks();
        fetchAllData(dateFilterRef.current);
        const socket = io(SOCKET_BASE_URL, { path: "/socket.io/" });
        socket.on('dashboard_update', () => {
          cacheRef.current = {};
          fetchAllData(dateFilterRef.current);
        });
        return () => socket.disconnect();
      }
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'employee' && user.role !== 'staff') {
      if (dateFilter !== 'custom') {
        fetchAllData(dateFilter);
      } else if (customStartDate && customEndDate) {
        fetchAllData('custom');
      }
    }
  }, [user, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    if (user && user.role === 'super_admin') {
      fetchComparativeData("30");
    }
  }, [user]);

  const fetchComparativeData = async (filterVal) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(apiUrl(`/api/sales/comparative?days=${filterVal}`), { headers });
      if (res.ok) {
        const data = await res.json();
        setComparative(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch branch comparison:", err);
    }
  };

  const fetchStaffData = async (parsedUser) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [restockRes, notifRes, invRes] = await Promise.all([
        fetch(apiUrl("/api/restock-requests"), { headers }),
        fetch(apiUrl("/api/notifications"), { headers }),
        fetch(apiUrl("/api/inventory?limit=10000"), { headers }),
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
    if (days === 'custom' && (!customStartDateRef.current || !customEndDateRef.current)) return;
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);

    try {
      const queryParam = days === 'custom'
        ? `startDate=${customStartDateRef.current}&endDate=${customEndDateRef.current}`
        : `days=${days}`;

      const [salesRes, invRes, metricsRes, perfRes] = await Promise.all([
        fetch(apiUrl(`/api/sales?limit=25&${queryParam}`), { headers }),
        fetch(apiUrl("/api/inventory?limit=5000"), { headers }),
        fetch(apiUrl(`/api/analytics/kpis?${queryParam}`), { headers }),
        fetch(apiUrl(`/api/analytics/product-performance?${queryParam}`), { headers })
      ]);

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSalesHistory(Array.isArray(salesData) ? salesData : salesData?.data || []);
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(Array.isArray(invData) ? invData : invData?.data || []);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setAnalyticsMetrics(metricsData);
      }

      if (perfRes.ok) {
        const perfData = await perfRes.json();
        const perfList = Array.isArray(perfData) ? perfData : perfData?.data || [];
        setPerformance(perfList);
        setBestSellers(perfList.slice(0, 5));
      }
    } catch (err) {
      console.error("Dashboard synchronization error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const limitedSales = limitData(salesHistory, 2000);
  const trends = getTrendData(limitedSales);
  const burnRates = getBurnRates(inventory, limitedSales);
  const criticalStockItems = burnRates.filter(b => b.status === 'critical' || b.daysRemaining <= 7);

  // Dead stock calculation
  const deadStock = inventory
    .filter(i => {
      const soldQty = performance.find(p => p.productId === i.product_id)?.quantitySold || 0;
      return (i.quantity ?? 0) > 10 && soldQty === 0;
    })
    .map(i => ({
      name: i.Product?.name || `Item #${i.product_id}`,
      stock: i.quantity,
      severity: 'Low Movement',
      tagColor: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    }))
    .slice(0, 5);

  // Chart data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lineChartData = {
    labels: months,
    datasets: [
      {
        label: 'Gross Sales (₱)',
        data: months.map(m => trends.revenueByMonth[m] || 0),
        borderColor: '#0EA5E9',
        backgroundColor: 'rgba(14,165,233,0.1)',
        tension: 0.35,
        fill: true,
        pointRadius: 3
      },
      {
        label: 'Gross Margin (₱)',
        data: months.map(m => trends.profitByMonth[m] || 0),
        borderColor: '#10B981',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.35,
        pointRadius: 2
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: chartTheme.tickColor, boxWidth: 12, font: { size: 11, weight: 'bold' } } },
      tooltip: { backgroundColor: chartTheme.tooltipBackgroundColor, titleColor: chartTheme.tooltipTitleColor, bodyColor: chartTheme.tooltipBodyColor }
    },
    scales: {
      y: { grid: { color: chartTheme.gridColor }, ticks: { color: chartTheme.tickColor, font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { color: chartTheme.tickColor, font: { size: 10 } } }
    }
  };

  const branchBarData = {
    labels: comparative.map(b => b.branch_name),
    datasets: [
      { label: 'Revenue (₱)', data: comparative.map(b => b.total_revenue), backgroundColor: '#0EA5E9', borderRadius: 6, yAxisID: 'y' },
      { label: 'Orders', data: comparative.map(b => b.order_count), backgroundColor: 'rgba(16,185,129,0.5)', borderColor: '#10B981', borderWidth: 1, borderRadius: 6, yAxisID: 'y1' }
    ]
  };

  // Staff View State
  const isStaffUser = user?.role === 'employee' || user?.role === 'staff';
  const lowStockItems = staffInventory.filter(i => (i.quantity ?? 0) <= 10 && (i.quantity ?? 0) > 0);
  const outOfStockItems = staffInventory.filter(i => (i.quantity ?? 0) === 0);

  // ── STAFF VIEW ─────────────────────────────────────────────────────────────
  if (isStaffUser) {
    return (
      <div className={`flex min-h-screen text-main font-dmsans transition-all duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <TopBar title="STAFF WORKSPACE" />
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
            <div className="responsive-container">
              
              <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black tracking-[3px] uppercase text-main/40 mb-1">
                    Frontline Workspace
                  </p>
                  <h1 className="text-2xl font-rajdhani font-black uppercase">
                    Staff <span className="text-brand-neonblue">Dashboard</span>
                  </h1>
                </div>
                <Link
                  href="/sales"
                  className="h-11 px-5 rounded-xl bg-brand-neonblue hover:bg-brand-neonblue/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all self-start md:self-auto"
                >
                  <ShoppingCart size={15} /> Open Sales Terminal
                </Link>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-2 border-t-brand-neonblue rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Total Products', value: staffInventory.length, icon: Package, color: '#0EA5E9' },
                      { label: 'Low Stock Items', value: lowStockItems.length, icon: AlertTriangle, color: '#F59E0B' },
                      { label: 'Out of Stock', value: outOfStockItems.length, icon: XCircle, color: '#EF4444' },
                      { label: 'My Restock Reqs', value: myRestockRequests.length, icon: ClipboardCheck, color: '#8B5CF6' },
                    ].map((card, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4 md:p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-muted">{card.label}</span>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.color + '20', color: card.color }}>
                            <card.icon size={14} />
                          </div>
                        </div>
                        <p className="text-2xl font-rajdhani font-black" style={{ color: card.color }}>{card.value}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Quick Modules */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'Sales Terminal', href: '/sales', icon: ShoppingCart, color: '#10B981', desc: 'New Transaction' },
                      { label: 'Work Orders / Jobs', href: '/services/jobs', icon: Wrench, color: '#0EA5E9', desc: 'Repair Catalog' },
                      { label: 'Manage Stock', href: '/reports/stock', icon: Package, color: '#F59E0B', desc: 'Inventory Check' },
                      { label: 'Customer List', href: '/customers', icon: Users, color: '#8B5CF6', desc: 'View Profiles' },
                    ].map((mod, i) => (
                      <Link key={i} href={mod.href} className="glass-card p-4 hover:border-brand-neonblue/40 transition-all group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: mod.color + '20', color: mod.color }}>
                            <mod.icon size={16} />
                          </div>
                          <ArrowUpRight size={14} className="text-muted/40 group-hover:text-brand-neonblue transition-colors" />
                        </div>
                        <h4 className="text-xs font-bold text-main group-hover:text-brand-neonblue transition-colors uppercase">{mod.label}</h4>
                        <p className="text-[10px] text-muted font-medium mt-0.5">{mod.desc}</p>
                      </Link>
                    ))}
                  </div>

                  {/* Restock Requests + Low Stock Alert */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Restock Requests */}
                    <div className="glass-card flex flex-col h-[380px]">
                      <div className="p-4 md:p-5 border-b border-border/20 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-5 bg-brand-neonblue rounded-full" />
                          <h3 className="font-rajdhani font-black text-base uppercase tracking-wider">My Restock Requests</h3>
                        </div>
                        <Link href="/reports/stock" className="text-[10px] font-black uppercase tracking-wider text-brand-neonblue hover:underline flex items-center gap-1">
                          Manage <ChevronRight size={12} />
                        </Link>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/10">
                        {myRestockRequests.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-muted gap-2 p-6">
                            <ClipboardCheck size={28} className="opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-wider opacity-40">No pending requests</p>
                          </div>
                        ) : (
                          myRestockRequests.map((req, i) => (
                            <div key={req.id ?? i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                              <div>
                                <p className="text-xs font-bold text-main">{req.Product?.name ?? `Product #${req.product_id}`}</p>
                                <p className="text-[9px] font-black text-muted uppercase tracking-wider mt-0.5">
                                  Qty: {req.quantity_requested || req.quantity} &bull; {new Date(req.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                req.status === 'Approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                req.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              }`}>
                                {req.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Low Stock Items */}
                    <div className="glass-card flex flex-col h-[380px]">
                      <div className="p-4 md:p-5 border-b border-border/20 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-5 bg-yellow-500 rounded-full" />
                          <h3 className="font-rajdhani font-black text-base uppercase tracking-wider">Low Stock Warnings</h3>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[9px] font-black">
                          {lowStockItems.length} items
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/10">
                        {lowStockItems.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-muted gap-2 p-6">
                            <CheckCircle size={28} className="text-green-500/30" />
                            <p className="text-[10px] font-black uppercase tracking-wider text-green-500/60">Inventory levels healthy</p>
                          </div>
                        ) : (
                          lowStockItems.map((item, i) => (
                            <div key={item.id ?? i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                              <div>
                                <p className="text-xs font-bold text-main">{item.Product?.name ?? item.name}</p>
                                <p className="text-[9px] font-black text-muted uppercase tracking-wider">{item.Product?.sku || ''}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-black">
                                  {item.quantity} left
                                </span>
                                <Link
                                  href="/reports/stock"
                                  className="px-2.5 py-1 rounded-lg bg-brand-neonblue/10 text-brand-neonblue hover:bg-brand-neonblue hover:text-white transition-colors text-[9px] font-black uppercase"
                                >
                                  Request
                                </Link>
                              </div>
                            </div>
                          ))
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

  // ── ADMIN / SUPER ADMIN DASHBOARD VIEW ──────────────────────────────────────
  return (
    <div className={`flex min-h-screen text-main font-dmsans transition-all duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SYSTEM DASHBOARD" />
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="responsive-container">

            {/* Header & Date Filter Bar */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-[3px] uppercase text-main/40 mb-1">
                  {user?.role === 'super_admin' ? 'HQ Global Overview' : 'Branch Management'}
                </p>
                <h1 className="text-2xl font-rajdhani font-black uppercase">
                  DASH<span className="text-brand-neonblue">BOARD</span>
                </h1>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                {dateFilter === "custom" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-brand-surface border border-border text-main text-xs font-bold px-3 py-1.5 rounded-lg outline-none focus:border-brand-neonblue"
                    />
                    <span className="text-[10px] uppercase font-black text-muted">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-brand-surface border border-border text-main text-xs font-bold px-3 py-1.5 rounded-lg outline-none focus:border-brand-neonblue"
                    />
                  </div>
                )}
                <select
                  className="bg-brand-surface border border-border text-main text-xs font-bold px-3.5 py-2 rounded-xl outline-none cursor-pointer focus:border-brand-neonblue transition-colors"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="1">Today (1 Day)</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="365">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
                <button
                  onClick={() => fetchAllData()}
                  disabled={loading}
                  className="h-9 px-3.5 rounded-xl border border-border bg-brand-surface hover:bg-brand-bgbase text-xs font-bold text-muted hover:text-main flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={13} className={loading ? "animate-spin text-brand-neonblue" : ""} />
                  Sync
                </button>
              </div>
            </div>

            {/* Urgent Alert Banner if critical items */}
            {criticalStockItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 mb-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <AlertOctagon className="text-red-500 shrink-0" size={18} />
                  <div>
                    <h4 className="text-red-500 font-bold text-xs uppercase tracking-wide">
                      Stock Alert: {criticalStockItems[0].name} is running low ({criticalStockItems[0].stock} units left)
                    </h4>
                  </div>
                </div>
                <Link
                  href="/purchases/restock"
                  className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-wider transition-colors shrink-0"
                >
                  Restock Now
                </Link>
              </motion.div>
            )}

            {/* KPI Summary Cards */}
            <div className="responsive-grid mb-6">
              {loading && !analyticsMetrics ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                <>
                  <StatCard
                    title="Total Revenue"
                    value={`₱${(analyticsMetrics?.totalRevenue ?? 0).toLocaleString()}`}
                    icon={PesoSign}
                    trend={analyticsMetrics?.growthPercentage !== undefined ? `${analyticsMetrics.growthPercentage >= 0 ? '+' : ''}${analyticsMetrics.growthPercentage}%` : undefined}
                    subtext="VS PREVIOUS PERIOD"
                  />
                  <StatCard
                    title="Units in Stock"
                    value={analyticsMetrics?.totalStock ?? 0}
                    icon={Box}
                    subtext="TOTAL ON-HAND"
                  />
                  <StatCard
                    title="Sales Orders"
                    value={analyticsMetrics?.totalOrders ?? 0}
                    icon={Package}
                    trend={analyticsMetrics?.ordersGrowthPercentage !== undefined ? `${analyticsMetrics.ordersGrowthPercentage >= 0 ? '+' : ''}${analyticsMetrics.ordersGrowthPercentage}%` : undefined}
                    subtext="VS PREVIOUS PERIOD"
                  />
                  <StatCard
                    title="Products Sold"
                    value={analyticsMetrics?.productsSold ?? 0}
                    icon={ShoppingCart}
                    trend={analyticsMetrics?.productsSoldGrowthPercentage !== undefined ? `${analyticsMetrics.productsSoldGrowthPercentage >= 0 ? '+' : ''}${analyticsMetrics.productsSoldGrowthPercentage}%` : undefined}
                    subtext="VS PREVIOUS PERIOD"
                  />
                </>
              )}
            </div>

            {/* Clickable Quick Navigation Board */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-muted/60">Quick Module Navigation</p>
                <span className="text-[9px] font-black text-muted/40 uppercase">1-Click Access</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { title: "Sales POS", desc: "Terminal & Billing", href: "/sales", icon: ShoppingCart, color: "#10B981" },
                  { title: "Products", desc: "Catalog & Barcodes", href: "/products", icon: Package, color: "#0EA5E9" },
                  { title: "Stock Health", desc: "Levels & Inventory", href: "/reports/stock", icon: Box, color: "#F59E0B" },
                  { title: "Restock Orders", desc: "Replenishments", href: "/purchases/restock", icon: ClipboardCheck, color: "#8B5CF6" },
                  { title: "Customer Hub", desc: "Pricelists & Tiers", href: "/customers", icon: Users, color: "#EC4899" },
                  { title: "Reports & P&L", desc: "Statements & AI", href: "/reports/profit-loss", icon: DollarSign, color: "#14B8A6" },
                ].map((mod, i) => (
                  <motion.div key={i} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href={mod.href}
                      className="glass-card p-3.5 flex flex-col justify-between h-[100px] hover:border-brand-neonblue/40 transition-all group relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: mod.color + '20', color: mod.color }}
                        >
                          <mod.icon size={15} />
                        </div>
                        <ArrowUpRight size={13} className="text-muted/40 group-hover:text-brand-neonblue transition-colors" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-main group-hover:text-brand-neonblue transition-colors uppercase leading-tight truncate">
                          {mod.title}
                        </h4>
                        <p className="text-[9px] text-muted/60 font-medium truncate mt-0.5">{mod.desc}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* STOCK HEALTH — ELEVATED TO TOP */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" ref={inventoryRef}>
              {/* Critical Stock & Burn Rates */}
              <div className="lg:col-span-2 glass-card p-5 md:p-6 flex flex-col h-[380px]">
                <div className="flex items-center justify-between mb-4 border-b border-border/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-5 bg-red-500 rounded-full" />
                    <h3 className="font-rajdhani font-black text-lg uppercase tracking-wider text-main">
                      Stock Health &amp; Depletion Risks
                    </h3>
                  </div>
                  <Link href="/reports/stock" className="text-[10px] font-black uppercase text-brand-neonblue hover:underline flex items-center gap-1">
                    Manage Stock <ChevronRight size={12} />
                  </Link>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                  {burnRates.length > 0 ? (
                    burnRates.slice(0, 6).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-border/20 bg-brand-surface/40 hover:bg-white/5 transition-colors">
                        <div>
                          <h4 className="font-bold text-xs text-main">{item.name}</h4>
                          <span className="text-[9px] text-muted uppercase font-bold tracking-wider">
                            Velocity: {item.dailyVelocity}/day &bull; {item.stock} left in stock
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            item.status === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                            item.status === 'warning' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                            'bg-green-500/10 text-green-500 border border-green-500/20'
                          }`}>
                            {item.daysRemaining} Days
                          </span>
                          <Link
                            href="/purchases/restock"
                            className="px-2.5 py-1 bg-brand-neonblue/10 text-brand-neonblue hover:bg-brand-neonblue hover:text-white transition-colors rounded-lg text-[9px] font-black uppercase border border-brand-neonblue/20"
                          >
                            Restock
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted gap-2">
                      <CheckCircle size={32} className="text-green-500/30" />
                      <p className="text-xs font-black uppercase tracking-wider text-green-500/60">No immediate stock-out risks detected</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Selling Products */}
              <div className="glass-card p-5 md:p-6 flex flex-col h-[380px]">
                <div className="flex items-center justify-between mb-4 border-b border-border/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Trophy className="text-yellow-500" size={17} />
                    <h3 className="font-rajdhani font-black text-lg uppercase tracking-wider text-main">
                      Top Selling Items
                    </h3>
                  </div>
                  <span className="text-[10px] font-black text-muted uppercase">Period Best</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5">
                  {bestSellers.length > 0 ? (
                    bestSellers.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-border/10 bg-brand-surface/30">
                        <div className="min-w-0 pr-2">
                          <h4 className="font-bold text-xs text-main truncate">{item.productName}</h4>
                          <span className="text-[9px] text-muted uppercase font-bold tracking-wider font-mono">
                            {item.productSku || 'SKU: N/A'}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-green-500/10 text-green-500 border border-green-500/20">
                            {item.quantitySold} Sold
                          </span>
                          <p className="text-xs font-bold text-main mt-0.5">₱{parseFloat(item.revenueGenerated || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted gap-2">
                      <Package size={28} className="opacity-20" />
                      <p className="text-xs font-black uppercase tracking-wider opacity-40">No sales in this period</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sales Trends Chart & Executive Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" ref={trendsRef}>
              {/* Sales Chart */}
              <div className="lg:col-span-2 glass-card p-5 md:p-6 flex flex-col h-[380px]">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-rajdhani font-black text-lg uppercase tracking-wider text-main">Sales &amp; Margin Trend</h3>
                    <p className="text-[10px] text-muted uppercase font-bold">Revenue and estimated profit trajectory</p>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  {loading && salesHistory.length === 0 ? (
                    <div className="h-full w-full bg-brand-surface/5 animate-pulse rounded-xl" />
                  ) : (
                    <Line data={lineChartData} options={lineChartOptions} />
                  )}
                </div>
              </div>

              {/* Executive Summary */}
              <div className="glass-card p-6 flex flex-col justify-between h-[380px]">
                <div>
                  <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border/20">
                    <Monitor className="text-brand-neonblue" size={18} />
                    <h3 className="font-rajdhani font-black text-lg uppercase tracking-wider">Executive Overview</h3>
                  </div>
                  <div className="space-y-3.5">
                    {[
                      { label: "Gross Revenue", value: `₱${(analyticsMetrics?.totalRevenue ?? 0).toLocaleString()}`, color: "text-green-500" },
                      { label: "Total Invoices", value: analyticsMetrics?.totalOrders ?? 0, color: "text-main" },
                      { label: "Units Dispatched", value: analyticsMetrics?.productsSold ?? 0, color: "text-main" },
                      { label: "Top Performer", value: bestSellers[0]?.productName || "N/A", color: "text-brand-neonblue truncate text-xs font-bold" },
                      { label: "Low Stock Items", value: criticalStockItems.length, color: criticalStockItems.length > 0 ? "text-red-500" : "text-green-500" },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center pb-2 border-b border-border/10">
                        <span className="text-xs uppercase font-bold text-muted">{row.label}</span>
                        <span className={`text-sm font-black ${row.color}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Link
                  href="/reports/profit-loss"
                  className="w-full py-2.5 px-4 rounded-xl border border-brand-neonblue/30 bg-brand-neonblue/10 text-brand-neonblue hover:bg-brand-neonblue hover:text-white text-xs font-black uppercase tracking-wider text-center transition-all"
                >
                  View Full Financial Report
                </Link>
              </div>
            </div>

            {/* Branch Performance Matrix (Super Admin) */}
            {user?.role === 'super_admin' && comparative.length > 0 && (
              <div className="glass-card p-5 md:p-6 mb-8">
                <div className="flex items-center justify-between mb-4 border-b border-border/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Building className="text-brand-neonblue" size={18} />
                    <h3 className="font-rajdhani font-black text-lg uppercase tracking-wider text-main">
                      All Branches Performance
                    </h3>
                  </div>
                  <span className="text-[10px] font-black text-muted uppercase">Multi-Branch Comparison</span>
                </div>
                <div className="h-[220px] w-full">
                  <Bar
                    data={branchBarData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { grid: { color: chartTheme.gridColor }, ticks: { color: chartTheme.tickColor, font: { size: 10 } } },
                        y1: { position: 'right', grid: { display: false }, ticks: { color: '#10B981', font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { color: chartTheme.tickColor, font: { size: 10 } } }
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Bottom Row: Recent Transactions & Pending Approvals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Recent Transactions */}
              <div className="glass-card flex flex-col h-[380px]">
                <div className="p-4 md:p-5 border-b border-border/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-5 bg-green-500 rounded-full" />
                    <h3 className="font-rajdhani font-black text-base uppercase tracking-wider text-main">Recent Transactions</h3>
                  </div>
                  <Link href="/sell/all" className="text-[10px] font-black uppercase tracking-wider text-brand-neonblue hover:underline">
                    View All Sales
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/10">
                  {salesHistory.slice(0, 8).map((order, i) => {
                    const amount = parseFloat(order.totalAmount ?? order.total_amount ?? 0);
                    const name = order.customerName ?? order.customer_name ?? 'Walk-in';
                    const invoice = order.invoiceNumber ?? `#${order.id?.toString().slice(-6) ?? i}`;
                    return (
                      <div key={order.id ?? i} className="p-3.5 px-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-surface border border-border flex items-center justify-center text-muted">
                            <History size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-main">{name}</p>
                            <p className="text-[9px] font-black text-muted uppercase tracking-wider">
                              {order.Branch?.name ?? 'Branch'} &bull; {invoice}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-green-500">₱{amount.toLocaleString()}</p>
                          <p className="text-[8px] font-bold text-muted uppercase">{order.paymentMethod || 'Cash'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="glass-card flex flex-col h-[380px]">
                <div className="p-4 md:p-5 border-b border-border/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-5 bg-brand-neonblue rounded-full" />
                    <h3 className="font-rajdhani font-black text-base uppercase tracking-wider text-main">Pending Restock Approvals</h3>
                  </div>
                  {pendingRestockRequests.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9px] font-black">
                      {pendingRestockRequests.length} pending
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/10">
                  {pendingRestockRequests.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted gap-2 p-6">
                      <ClipboardCheck size={28} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-40">No pending restock approvals</p>
                    </div>
                  ) : (
                    pendingRestockRequests.slice(0, 6).map((req, i) => (
                      <div key={req.id ?? i} className="p-3.5 px-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-main">{req.Product?.name ?? `Product #${req.product_id}`}</p>
                          <p className="text-[9px] font-black text-muted uppercase tracking-wider mt-0.5">
                            Qty: {req.quantity_requested || req.quantity} &bull; By: {req.RequestedBy?.username || req.Manager?.username || 'Staff'}
                          </p>
                        </div>
                        <Link
                          href="/purchases/restock"
                          className="px-3 py-1 rounded-lg bg-brand-neonblue/10 text-brand-neonblue border border-brand-neonblue/20 hover:bg-brand-neonblue hover:text-white transition-colors text-[9px] font-black uppercase"
                        >
                          Review
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
