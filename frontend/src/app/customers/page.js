"use client";

import { useEffect, useState, useCallback } from "react";
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
  MapPin
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
  const [customers, setCustomers]             = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [error, setError]                     = useState(null);
  const [user, setUser]                       = useState(null);
  const [searchTerm, setSearchTerm]           = useState("");
  const [filterSegment, setFilterSegment]     = useState("ALL");
  const [filterBranch, setFilterBranch]       = useState("");
  const [branches, setBranches]               = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

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

  // Derived stats
  const totalRevenue   = customers.reduce((s, c) => s + parseFloat(c.totalSpent || 0), 0);
  const totalOrders    = customers.reduce((s, c) => s + parseInt(c.totalOrders || 0), 0);
  const activeCount    = customers.filter(c => parseFloat(c.totalSpent || 0) > 0).length;
  const avgSpend       = activeCount > 0 ? totalRevenue / activeCount : 0;

  // Filter
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
                  className="h-11 px-5 flex items-center gap-2 bg-brand-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-main transition-all"
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
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[1px] border transition-all ${
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
                      <th className="pb-4 px-4 text-right">Branch</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-border/10">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-20">
                          <div className="flex items-center justify-center gap-3 text-muted">
                            <Loader2 size={20} className="animate-spin text-brand-neonblue" />
                            <span className="text-xs font-bold uppercase tracking-widest">Loading Customers...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center">
                          <p className="text-xs font-black uppercase text-brand-crimson mb-2">{error}</p>
                          <button onClick={() => fetchCustomers(false, filterBranch)} className="px-4 py-2 border border-border rounded-lg text-xs font-bold text-muted hover:text-main">
                            Retry
                          </button>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center text-muted">
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
                                onClick={() => setSelectedCustomer(client)}
                                className="flex items-center gap-3 text-left group/cust hover:opacity-90 transition-all cursor-pointer focus:outline-none"
                                title={`View details for ${client.name}`}
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
                            <td className="py-4 px-4 text-xs text-muted font-bold text-right">
                              {client.Branch?.name || "—"}
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

      {/* Customer Detail Centered Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-md bg-brand-surface border border-border rounded-[24px] p-6 md:p-8 shadow-2xl overflow-hidden"
            >
              <button
                onClick={() => setSelectedCustomer(null)}
                className="absolute top-5 right-5 p-2 hover:bg-brand-bgbase rounded-xl text-muted hover:text-main transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-4 mb-6 pr-8">
                <div className="w-14 h-14 rounded-2xl bg-brand-bgbase border border-border flex items-center justify-center font-black text-xl text-muted shrink-0">
                  {selectedCustomer.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-rajdhani font-black uppercase text-main leading-tight truncate" title={selectedCustomer.name}>
                    {selectedCustomer.name}
                  </h2>
                  <span className={`mt-1.5 inline-block px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[2px] border ${segmentColor(segmentFromSpend(selectedCustomer.totalSpent))}`}>
                    {segmentFromSpend(selectedCustomer.totalSpent)}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 bg-brand-bgbase/50 rounded-2xl p-4 border border-border/20 mb-6">
                {[
                  { icon: Mail,       label: "Email",   value: selectedCustomer.email   || "—" },
                  { icon: Phone,      label: "Phone",   value: selectedCustomer.phone   || "—" },
                  { icon: MapPin,     label: "Address", value: selectedCustomer.address || "—" },
                  { icon: TrendingUp, label: "Branch",  value: selectedCustomer.Branch?.name || "—" }
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <row.icon size={14} className="mt-0.5 text-muted/40 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-[2px] text-muted/50">{row.label}</p>
                      <p className="text-xs font-bold text-main truncate">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-brand-bgbase/60 rounded-xl p-4 border border-border/30">
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-muted/50 mb-1">Total Spent</p>
                  <p className="text-xl font-rajdhani font-black text-green-500">
                    ₱{parseFloat(selectedCustomer.totalSpent || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-brand-bgbase/60 rounded-xl p-4 border border-border/30">
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-muted/50 mb-1">Orders</p>
                  <p className="text-xl font-rajdhani font-black text-main">
                    {parseInt(selectedCustomer.totalOrders || 0)}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
