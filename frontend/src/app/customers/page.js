"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { apiUrl } from "@/lib/api";
import { showError } from "@/context/ModalContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Mail,
  Phone,
  TrendingUp,
  ShoppingBag,
  X,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  MapPin,
  Package,
  Wrench,
  Receipt,
  Calendar,
  CreditCard,
  Tag,
  ArrowUpRight
} from "lucide-react";

const SEGMENTS = ["ALL", "CORE", "CORPORATE", "REGULAR", "INACTIVE"];

function segmentFromSpend(totalSpent) {
  const n = parseFloat(totalSpent || 0);
  if (n >= 500000) return "CORPORATE";
  if (n >= 50000)  return "CORE";
  if (n > 0)       return "REGULAR";
  return "INACTIVE";
}

function segmentColor(seg) {
  switch (seg) {
    case "CORPORATE": return "bg-brand-crimson/10 text-brand-crimson border-brand-crimson/20";
    case "CORE":      return "bg-brand-neonblue/10 text-brand-neonblue border-brand-neonblue/20";
    case "INACTIVE":  return "bg-border/30 text-muted/50 border-border/20";
    default:          return "bg-brand-bgbase text-muted/60 border-border/20";
  }
}

export default function CustomersPage() {
  const [customers, setCustomers]               = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [error, setError]                       = useState(null);
  const [user, setUser]                         = useState(null);
  const [searchTerm, setSearchTerm]             = useState("");
  const [filterSegment, setFilterSegment]       = useState("ALL");
  const [filterBranch, setFilterBranch]         = useState("");
  const [branches, setBranches]                 = useState([]);

  // Customer Details & Purchase History Modal States
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory]   = useState(null);
  const [historyLoading, setHistoryLoading]     = useState(false);
  const [historyTab, setHistoryTab]             = useState("products"); // "products" | "orders"
  const [historySearch, setHistorySearch]       = useState("");
  const [expandedInvoices, setExpandedInvoices] = useState({});

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setBranches(await res.json());
    } catch {}
  };

  const fetchCustomers = useCallback(async (silent = false, branchId = filterBranch) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    const token = localStorage.getItem("token");
    try {
      let url = apiUrl("/api/customers");
      const params = new URLSearchParams();
      if (branchId) params.set("branchId", branchId);
      const qs = params.toString();
      if (qs) url += "?" + qs;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.message || errData.error || `Server error ${res.status}`;
        setError(msg);
        showError(msg);
      }
    } catch (e) {
      const msg = "Network error — could not reach server";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterBranch]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    setUser(userData);
    fetchBranches();

    // Auto-focus on assigned branch for branch managers / branch admins
    const assignedBranchId = userData?.branch_id ? String(userData.branch_id) : "";
    if (assignedBranchId && userData?.role !== "super_admin") {
      setFilterBranch(assignedBranchId);
      fetchCustomers(false, assignedBranchId);
    } else {
      fetchCustomers(false, "");
    }
  }, []);

  // Fetch full purchase history for selected customer
  const fetchCustomerHistory = async (customerId) => {
    setHistoryLoading(true);
    setCustomerHistory(null);
    setExpandedInvoices({});
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/customers/${customerId}/history`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomerHistory(data);
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.message || "Failed to load customer purchase history");
      }
    } catch (e) {
      showError("Network error loading customer history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenCustomer = (client) => {
    setSelectedCustomer(client);
    setHistoryTab("products");
    setHistorySearch("");
    fetchCustomerHistory(client.id);
  };

  const toggleInvoiceExpand = (invoiceId) => {
    setExpandedInvoices(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  // Derived stats for main table
  const totalRevenue = customers.reduce((s, c) => s + parseFloat(c.totalSpent || 0), 0);
  const totalOrders  = customers.reduce((s, c) => s + parseInt(c.totalOrders || 0), 0);
  const activeCount  = customers.filter(c => parseFloat(c.totalSpent || 0) > 0).length;
  const avgSpend     = activeCount > 0 ? totalRevenue / activeCount : 0;

  // Filter customers in main directory
  const filtered = customers.filter(c => {
    const seg = segmentFromSpend(c.totalSpent);
    const matchSeg = filterSegment === "ALL" || seg === filterSegment;
    const matchSearch =
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBranch = !filterBranch || String(c.branchId) === String(filterBranch) || String(c.Branch?.id) === String(filterBranch);
    return matchSeg && matchSearch && matchBranch;
  });

  // Filtered history products
  const filteredHistoryProducts = useMemo(() => {
    if (!customerHistory?.products) return [];
    if (!historySearch.trim()) return customerHistory.products;
    const q = historySearch.toLowerCase().trim();
    return customerHistory.products.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.invoices && p.invoices.some(inv => inv.toLowerCase().includes(q)))
    );
  }, [customerHistory, historySearch]);

  // Filtered history sales/orders
  const filteredHistorySales = useMemo(() => {
    if (!customerHistory?.sales) return [];
    if (!historySearch.trim()) return customerHistory.sales;
    const q = historySearch.toLowerCase().trim();
    return customerHistory.sales.filter(s =>
      (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(q)) ||
      (s.paymentMethod && s.paymentMethod.toLowerCase().includes(q)) ||
      (s.notes && s.notes.toLowerCase().includes(q)) ||
      (s.SaleItems && s.SaleItems.some(i => (i.productName || '').toLowerCase().includes(q)))
    );
  }, [customerHistory, historySearch]);

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-all duration-500">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="CUSTOMER REGISTRY" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar bg-brand-bgbase text-main">
          <div className="max-w-[1600px] mx-auto w-full">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <p className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
                  Customer Directory
                </p>
                <h1 className="text-2xl font-rajdhani font-black tracking-tight text-main uppercase">
                  Customer <span className="text-brand-crimson">Registry</span>
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => fetchCustomers(true, filterBranch)}
                  disabled={refreshing}
                  className="h-11 px-5 flex items-center gap-2 bg-brand-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-main transition-all cursor-pointer"
                >
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  Sync
                </motion.button>
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Customers", value: customers.length, icon: Users, color: "text-brand-neonblue" },
                { label: "Total Revenue",   value: `₱${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-green-500" },
                { label: "Total Orders",    value: totalOrders,   icon: ShoppingBag, color: "text-brand-neonpurple" },
                { label: "Avg. Spend",      value: `₱${Math.round(avgSpend).toLocaleString()}`, icon: TrendingUp, color: "text-yellow-500" }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="glass-card p-5 md:p-6 flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-xl bg-brand-bgbase border border-border flex items-center justify-center ${stat.color}`}>
                    <stat.icon size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[2px] text-muted">{stat.label}</p>
                    <p className="text-lg font-rajdhani font-black text-main">{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Table Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 md:p-8 shadow-sm"
            >
              {/* Controls */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative group w-full md:max-w-md">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-neonblue transition-colors" />
                  <input
                    type="text"
                    placeholder="Search customers by name, email, or phone…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-brand-surface border border-border rounded-xl py-3 pl-11 pr-5 text-xs text-main focus:outline-none focus:border-brand-neonblue/40 transition-all font-bold placeholder:opacity-40"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
                  {/* Branch filter: Only visible for super admin without assigned branch */}
                  {user?.role === "super_admin" && !user?.branch_id && branches.length > 0 && (
                    <div className="relative">
                      <select
                        value={filterBranch}
                        onChange={e => {
                          setFilterBranch(e.target.value);
                          fetchCustomers(false, e.target.value);
                        }}
                        className="appearance-none bg-brand-surface border border-border rounded-xl py-2 pl-4 pr-8 text-[10px] font-black uppercase tracking-[1px] text-muted hover:text-main focus:outline-none focus:border-brand-neonblue transition-all cursor-pointer"
                      >
                        <option value="">ALL BRANCHES</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  )}
                  {SEGMENTS.map(seg => (
                    <button
                      key={seg}
                      onClick={() => setFilterSegment(seg)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[1px] border transition-all cursor-pointer ${
                        filterSegment === seg
                          ? "bg-brand-neonblue/15 border-brand-neonblue/40 text-brand-neonblue"
                          : "bg-brand-surface border-border text-muted hover:text-main"
                      }`}
                    >
                      {seg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-[2px] text-muted/50 border-b border-border/20">
                      <th className="pb-4 pr-4">ID</th>
                      <th className="pb-4 px-4">Customer</th>
                      <th className="pb-4 px-4">Segment</th>
                      <th className="pb-4 px-4">Contact</th>
                      <th className="pb-4 px-4">Total Spent</th>
                      <th className="pb-4 px-4">Orders</th>
                      <th className="pb-4 px-4">Branch</th>
                      <th className="pb-4 pl-4 text-right">Purchase History</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-border/10">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-20">
                          <div className="flex items-center justify-center gap-3 text-muted">
                            <Loader2 size={20} className="animate-spin text-brand-neonblue" />
                            <span className="text-xs font-bold uppercase tracking-widest">Loading Customers...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={8} className="py-20 text-center">
                          <p className="text-xs font-black uppercase text-brand-crimson mb-2">{error}</p>
                          <button onClick={() => fetchCustomers(false, filterBranch)} className="px-4 py-2 border border-border rounded-lg text-xs font-bold text-muted hover:text-main cursor-pointer">
                            Retry
                          </button>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-20 text-center text-muted">
                          <Users size={32} className="mx-auto mb-2 opacity-30" />
                          <p className="text-xs font-black uppercase tracking-widest opacity-40">No matching customers found</p>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((client, i) => {
                        const seg = segmentFromSpend(client.totalSpent);
                        return (
                          <motion.tr
                            key={client.id}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-white/5 transition-colors group"
                          >
                            <td className="py-4 pr-4 font-mono text-[10px] text-muted/50 group-hover:text-brand-neonblue transition-colors uppercase">
                              CU-{client.id?.toString?.().slice(-6).toUpperCase() || "------"}
                            </td>
                            <td className="py-4 px-4">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomer(client)}
                                className="flex items-center gap-3 text-left group/cust hover:opacity-90 transition-all cursor-pointer focus:outline-none"
                                title={`View purchase history for ${client.name}`}
                              >
                                <div className="w-8 h-8 rounded-lg bg-brand-surface border border-border flex items-center justify-center font-bold text-xs text-muted group-hover/cust:border-brand-neonblue/60 group-hover/cust:text-brand-neonblue transition-colors">
                                  {client.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-bold text-xs text-main group-hover/cust:text-brand-neonblue group-hover/cust:underline underline-offset-2 transition-colors max-w-[220px] truncate">
                                  {client.name}
                                </span>
                              </button>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${segmentColor(seg)}`}>
                                {seg}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="space-y-0.5 text-xs text-muted font-medium max-w-[220px]">
                                {client.email && <div className="flex items-center gap-1.5 truncate" title={client.email}><Mail size={11} className="opacity-40 flex-shrink-0" /> <span className="truncate">{client.email}</span></div>}
                                {client.phone && <div className="flex items-center gap-1.5 truncate" title={client.phone}><Phone size={11} className="opacity-40 flex-shrink-0" /> <span className="truncate">{client.phone}</span></div>}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-rajdhani font-black text-sm text-green-500">
                                ₱{parseFloat(client.totalSpent || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-rajdhani font-bold text-sm text-main">
                                {parseInt(client.totalOrders || 0)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs text-muted font-bold">
                              {client.Branch?.name || "—"}
                            </td>
                            <td className="py-4 pl-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomer(client)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-neonblue/10 hover:bg-brand-neonblue/20 text-brand-neonblue text-[10px] font-black uppercase tracking-wider border border-brand-neonblue/30 transition-all cursor-pointer shadow-sm"
                                title="View Customer Purchases & Products"
                              >
                                <ShoppingBag size={12} />
                                <span>View History</span>
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-[10px] font-black text-muted/40 uppercase tracking-widest">
                Showing {filtered.length} of {customers.length} total customers
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Customer Detail & Purchase History Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-4xl bg-brand-surface border border-border/80 rounded-[24px] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
            >
              {/* Modal Top Bar */}
              <div className="p-6 md:p-8 border-b border-border/50 bg-brand-bgbase/40 relative">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="absolute top-6 right-6 p-2 rounded-xl text-muted hover:text-main hover:bg-brand-surface border border-transparent hover:border-border transition-all cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pr-12">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-surface border border-border flex items-center justify-center font-black text-xl text-brand-neonblue shrink-0 shadow-md">
                      {selectedCustomer.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl font-rajdhani font-black uppercase text-main leading-tight" title={selectedCustomer.name}>
                          {selectedCustomer.name}
                        </h2>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[1.5px] border ${segmentColor(segmentFromSpend(customerHistory?.totalSpent || selectedCustomer.totalSpent))}`}>
                          {segmentFromSpend(customerHistory?.totalSpent || selectedCustomer.totalSpent)}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-muted/60 mt-1 uppercase tracking-wider">
                        Customer ID: CU-{selectedCustomer.id?.toString?.().slice(-6).toUpperCase() || "------"}
                      </p>
                    </div>
                  </div>

                  {/* Contact Badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-surface border border-border/60 text-muted text-[11px] font-medium" title={selectedCustomer.email}>
                        <Mail size={12} className="text-muted/60" />
                        <span className="max-w-[160px] truncate">{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-surface border border-border/60 text-muted text-[11px] font-medium" title={selectedCustomer.phone}>
                        <Phone size={12} className="text-muted/60" />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    )}
                    {(selectedCustomer.Branch?.name || customerHistory?.customer?.Branch?.name) && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-surface border border-border/60 text-brand-neonpurple text-[11px] font-bold">
                        <MapPin size={12} />
                        <span>{selectedCustomer.Branch?.name || customerHistory?.customer?.Branch?.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* KPI Metrics Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  <div className="bg-brand-surface/70 rounded-xl p-3 border border-border/40">
                    <p className="text-[9px] font-black uppercase tracking-[2px] text-muted mb-0.5">Total Spent</p>
                    <p className="text-lg font-rajdhani font-black text-green-500">
                      ₱{parseFloat(customerHistory?.totalSpent ?? selectedCustomer.totalSpent ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-brand-surface/70 rounded-xl p-3 border border-border/40">
                    <p className="text-[9px] font-black uppercase tracking-[2px] text-muted mb-0.5">Completed Orders</p>
                    <p className="text-lg font-rajdhani font-black text-main">
                      {parseInt(customerHistory?.totalOrders ?? selectedCustomer.totalOrders ?? 0)}
                    </p>
                  </div>
                  <div className="bg-brand-surface/70 rounded-xl p-3 border border-border/40">
                    <p className="text-[9px] font-black uppercase tracking-[2px] text-muted mb-0.5">Items Purchased</p>
                    <p className="text-lg font-rajdhani font-black text-brand-neonblue">
                      {customerHistory?.totalItemsCount ?? (customerHistory?.products?.reduce((s, p) => s + p.totalQuantity, 0) || 0)}
                    </p>
                  </div>
                  <div className="bg-brand-surface/70 rounded-xl p-3 border border-border/40">
                    <p className="text-[9px] font-black uppercase tracking-[2px] text-muted mb-0.5">Avg. Order Value</p>
                    <p className="text-lg font-rajdhani font-black text-yellow-500">
                      ₱{Math.round(
                        (customerHistory?.totalOrders || selectedCustomer.totalOrders) > 0
                          ? (parseFloat(customerHistory?.totalSpent ?? selectedCustomer.totalSpent ?? 0) / (customerHistory?.totalOrders || selectedCustomer.totalOrders))
                          : 0
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation & Search */}
              <div className="px-6 md:px-8 py-3.5 border-b border-border/40 bg-brand-surface flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryTab("products")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      historyTab === "products"
                        ? "bg-brand-neonblue text-black shadow-md shadow-brand-neonblue/20"
                        : "bg-brand-bgbase text-muted hover:text-main border border-border/50"
                    }`}
                  >
                    <Package size={14} />
                    <span>Purchased Products</span>
                    {customerHistory?.products && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${historyTab === "products" ? "bg-black/20 text-black" : "bg-brand-surface text-muted"}`}>
                        {customerHistory.products.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryTab("orders")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      historyTab === "orders"
                        ? "bg-brand-neonblue text-black shadow-md shadow-brand-neonblue/20"
                        : "bg-brand-bgbase text-muted hover:text-main border border-border/50"
                    }`}
                  >
                    <Receipt size={14} />
                    <span>Invoices &amp; Receipts</span>
                    {customerHistory?.sales && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${historyTab === "orders" ? "bg-black/20 text-black" : "bg-brand-surface text-muted"}`}>
                        {customerHistory.sales.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder={historyTab === "products" ? "Search product or SKU..." : "Search invoice #..."}
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border/60 rounded-xl py-1.5 pl-9 pr-3 text-xs text-main placeholder:text-muted/40 focus:outline-none focus:border-brand-neonblue/50 transition-all font-medium"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-main"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                {historyLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted">
                    <Loader2 size={26} className="animate-spin text-brand-neonblue" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted/70">
                      Loading Customer Purchase History...
                    </p>
                  </div>
                ) : historyTab === "products" ? (
                  /* ─── TAB 1: PURCHASED PRODUCTS ─── */
                  filteredHistoryProducts.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center text-muted">
                      <div className="w-14 h-14 rounded-2xl bg-brand-bgbase border border-border/60 flex items-center justify-center text-muted/40 mb-3">
                        <Package size={26} />
                      </div>
                      <p className="text-sm font-black uppercase tracking-wider text-main mb-1">
                        {historySearch ? "No matching products found" : "No Product Purchases Recorded"}
                      </p>
                      <p className="text-xs text-muted/60 max-w-sm">
                        {historySearch ? "Try adjusting your search query." : "This customer has not completed any product transactions in the system yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-[2px] text-muted/50 mb-2 flex items-center justify-between">
                        <span>Distinct Purchased Items ({filteredHistoryProducts.length})</span>
                        <span>Sorted by Last Purchased</span>
                      </div>

                      {filteredHistoryProducts.map((item, idx) => (
                        <div
                          key={`prod-${item.id || idx}`}
                          className="p-4 rounded-2xl bg-brand-bgbase/60 border border-border/50 hover:border-brand-neonblue/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              item.type === 'service'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : 'bg-brand-surface text-brand-neonblue border-brand-neonblue/20'
                            }`}>
                              {item.type === 'service' ? <Wrench size={18} /> : <Package size={18} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-main truncate" title={item.name}>
                                  {item.name}
                                </h4>
                                <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                  item.type === 'service'
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                }`}>
                                  {item.type === 'service' ? 'Service' : 'Physical Product'}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted flex-wrap">
                                {item.sku && (
                                  <span className="font-mono text-[10px] text-muted/80 bg-brand-surface px-2 py-0.5 rounded border border-border/40">
                                    SKU: {item.sku}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-muted/80">
                                  <Calendar size={11} className="text-muted/50" />
                                  Last: {new Date(item.lastPurchased).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {item.invoices && item.invoices.length > 0 && (
                                  <span className="text-[10px] text-muted/60 font-mono">
                                    in {item.invoices.length} {item.invoices.length === 1 ? 'order' : 'orders'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quantities and Amounts */}
                          <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/20 shrink-0">
                            <div className="text-left sm:text-right">
                              <p className="text-[9px] font-black uppercase tracking-wider text-muted/60">Total Quantity</p>
                              <p className="text-sm font-rajdhani font-black text-main">
                                {item.totalQuantity} <span className="text-xs text-muted font-normal font-dmsans">units</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-wider text-muted/60">Total Spent</p>
                              <p className="text-base font-rajdhani font-black text-green-500">
                                ₱{item.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                              {item.unitPrice > 0 && (
                                <p className="text-[9px] text-muted/50 font-medium">
                                  @ ₱{item.unitPrice.toLocaleString()} / unit
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  /* ─── TAB 2: INVOICES & RECEIPTS ─── */
                  filteredHistorySales.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center text-muted">
                      <div className="w-14 h-14 rounded-2xl bg-brand-bgbase border border-border/60 flex items-center justify-center text-muted/40 mb-3">
                        <Receipt size={26} />
                      </div>
                      <p className="text-sm font-black uppercase tracking-wider text-main mb-1">
                        {historySearch ? "No matching invoices found" : "No Completed Invoices"}
                      </p>
                      <p className="text-xs text-muted/60 max-w-sm">
                        {historySearch ? "Try adjusting your search query." : "No transactions found under this customer."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredHistorySales.map((sale) => {
                        const isExpanded = !!expandedInvoices[sale.id];
                        const items = sale.SaleItems || [];
                        const productCount = items.filter(i => (i.item_type || 'product') === 'product').length;
                        const serviceCount = items.filter(i => i.item_type === 'service').length;

                        return (
                          <div
                            key={sale.id}
                            className="rounded-2xl bg-brand-bgbase/60 border border-border/50 overflow-hidden transition-all"
                          >
                            {/* Invoice Summary Header */}
                            <div
                              onClick={() => toggleInvoiceExpand(sale.id)}
                              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-brand-surface border border-border flex items-center justify-center text-muted shrink-0">
                                  <Receipt size={18} className="text-brand-neonblue" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-sm text-main uppercase">
                                      {sale.invoiceNumber}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                      sale.sale_type === 'service'
                                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                        : sale.sale_type === 'mixed'
                                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                    }`}>
                                      {sale.sale_type || 'product'} Sale
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted">
                                    <span className="flex items-center gap-1 font-medium">
                                      <Calendar size={11} className="opacity-50" />
                                      {new Date(sale.createdAt).toLocaleString()}
                                    </span>
                                    <span className="uppercase text-[9px] font-black tracking-wider text-muted/60 bg-brand-surface px-1.5 py-0.5 rounded border border-border/40">
                                      {sale.paymentMethod || 'cash'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-5">
                                <div className="text-right">
                                  <p className="text-base font-rajdhani font-black text-brand-neonblue">
                                    ₱{parseFloat(sale.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </p>
                                  <p className="text-[10px] text-muted font-bold">
                                    {items.length} {items.length === 1 ? 'item' : 'items'}
                                  </p>
                                </div>
                                <div className={`p-1.5 rounded-lg bg-brand-surface border border-border text-muted transition-transform duration-200 ${isExpanded ? 'rotate-90 text-brand-neonblue' : ''}`}>
                                  <ChevronRight size={14} />
                                </div>
                              </div>
                            </div>

                            {/* Itemized breakdown when expanded */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-border/40 bg-brand-surface/40 p-4 sm:p-5"
                                >
                                  <p className="text-[10px] font-black uppercase tracking-[2px] text-muted/60 mb-3 flex items-center gap-1.5">
                                    <Package size={12} /> Itemized Invoice Products &amp; Services
                                  </p>
                                  <div className="space-y-2">
                                    {items.map((item, itemIdx) => {
                                      const isServ = item.item_type === 'service';
                                      const name = item.productName || item.Product?.name || item.Service?.name || "Item";
                                      const price = parseFloat(item.unitPrice || 0);
                                      const sub = parseFloat(item.subtotal || (item.quantity * price));

                                      return (
                                        <div
                                          key={`subitem-${itemIdx}`}
                                          className="p-3 rounded-xl bg-brand-bgbase/60 border border-border/30 flex items-center justify-between gap-3 text-xs"
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                              isServ
                                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                : 'bg-brand-surface text-muted border-border/40'
                                            }`}>
                                              {isServ ? <Wrench size={12} /> : <Package size={12} />}
                                            </div>
                                            <div className="min-w-0">
                                              <p className="font-bold text-main truncate">{name}</p>
                                              <p className="text-[10px] text-muted font-mono">
                                                Qty: {item.quantity} × ₱{price.toLocaleString()} {item.productSku ? `• SKU: ${item.productSku}` : ''}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="font-black font-rajdhani text-sm text-main shrink-0">
                                            ₱{sub.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Notes if any */}
                                  {sale.notes && (
                                    <div className="mt-3 text-[11px] text-muted/80 bg-brand-bgbase/40 p-2.5 rounded-lg border border-border/20">
                                      <span className="font-bold uppercase tracking-wider text-[9px] text-muted">Notes:</span> {sale.notes}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 md:px-8 border-t border-border/50 bg-brand-bgbase/50 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-muted/50 font-mono uppercase tracking-wider">
                  PC Alley Customer Profile &amp; Purchase Intelligence
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-5 py-2 rounded-xl bg-brand-surface hover:bg-brand-surface/80 border border-border text-xs font-black uppercase tracking-wider text-muted hover:text-main transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
