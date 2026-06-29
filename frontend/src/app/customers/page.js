"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Mail,
  Phone,
  History,
  TrendingUp,
  ShoppingBag,
  Plus,
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
    case "CORPORATE": return "bg-brand-crimson/8 text-brand-crimson border-brand-crimson/15";
    case "CORE":      return "bg-brand-neonblue/8 text-brand-neonblue border-brand-neonblue/15";
    case "INACTIVE":  return "bg-border/30 text-muted/50 border-border/20";
    default:          return "bg-brand-bgbase text-muted/60 border-border/20";
  }
}

export default function CustomersPage() {
  const [customers, setCustomers]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState(null);
  const [user, setUser]                 = useState(null);
  const [searchTerm, setSearchTerm]     = useState("");
  const [filterSegment, setFilterSegment] = useState("ALL");
  const [filterBranch, setFilterBranch]   = useState("");
  const [branches, setBranches]           = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    setUser(userData);
    fetchBranches();
    fetchCustomers();
  }, []);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived stats
  const totalRevenue   = customers.reduce((s, c) => s + parseFloat(c.totalSpent || 0), 0);
  const totalOrders    = customers.reduce((s, c) => s + parseInt(c.totalOrders || 0), 0);
  const activeCount    = customers.filter(c => parseFloat(c.totalSpent || 0) > 0).length;
  const avgSpend       = activeCount > 0 ? totalRevenue / activeCount : 0;

  // Filter
  const filtered = customers.filter(c => {
    const seg = segmentFromSpend(c.totalSpent);
    const matchSeg  = filterSegment === "ALL" || seg === filterSegment;
    const matchSearch =
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSeg && matchSearch;
  });



  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-all duration-500">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="CUSTOMER NETWORK HUB" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar bg-brand-bgbase text-main">
          <div className="max-w-[1600px] mx-auto w-full">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <p className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-1">
                  Customer Management
                </p>
                <h1 className="text-2xl font-rajdhani font-black tracking-tight text-main uppercase">
                  Customer <span className="text-brand-crimson">Registry</span>
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => fetchCustomers(true, filterBranch)}
                  disabled={refreshing}
                  className="h-12 px-5 flex items-center gap-2 bg-brand-surface border border-border rounded-full text-[10px] font-black uppercase tracking-widest text-muted hover:text-main transition-all"
                >
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  Sync
                </motion.button>
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
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

            {/* Table */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6 md:p-10 shadow-sm"
            >
              {/* Controls */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                <div className="relative group w-full md:max-w-md">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-neonblue transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by name, email or phone…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-brand-surface border border-border rounded-xl py-3.5 pl-11 pr-5 text-xs text-main focus:outline-none focus:border-brand-neonblue/30 transition-all font-bold placeholder:opacity-30 shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {branches.length > 0 && (
                    <div className="relative">
                      <select
                        value={filterBranch}
                        onChange={e => {
                          setFilterBranch(e.target.value);
                          fetchCustomers(false, e.target.value);
                        }}
                        className="appearance-none bg-brand-surface border border-border rounded-full py-2 pl-4 pr-8 text-[9px] font-black uppercase tracking-[2px] text-muted hover:text-main focus:outline-none focus:border-brand-neonblue/30 transition-all cursor-pointer"
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
                      className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[2px] border transition-all ${
                        filterSegment === seg
                          ? "bg-brand-neonblue/10 border-brand-neonblue/30 text-brand-neonblue"
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
                    <tr className="text-[10px] font-black uppercase tracking-[3px] text-muted/30 border-b border-border/10">
                      <th className="pb-6 pr-4">ID</th>
                      <th className="pb-6 px-4">Customer</th>
                      <th className="pb-6 px-4">Segment</th>
                      <th className="pb-6 px-4">Contact</th>
                      <th className="pb-6 px-4">Total Spent</th>
                      <th className="pb-6 px-4">Orders</th>
                      <th className="pb-6 pl-4">Branch</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-24">
                          <div className="space-y-3">
                            {[1,2,3,4,5].map(r => (
                              <div key={r} className="flex items-center gap-4 px-2">
                                <div className="w-10 h-10 rounded-xl bg-brand-surface animate-pulse flex-shrink-0" />
                                <div className="flex-1 h-4 rounded bg-brand-surface animate-pulse" />
                                <div className="w-20 h-4 rounded bg-brand-surface animate-pulse" />
                                <div className="w-32 h-4 rounded bg-brand-surface animate-pulse" />
                                <div className="w-24 h-4 rounded bg-brand-surface animate-pulse" />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={7} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full border border-brand-crimson/20 bg-brand-crimson/10 flex items-center justify-center">
                              <X size={20} className="text-brand-crimson" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[4px] text-brand-crimson">Failed to load customers</p>
                            <p className="text-[10px] text-muted/40 font-mono">{error}</p>
                            <button
                              onClick={() => fetchCustomers(false, filterBranch)}
                              className="mt-2 h-9 px-5 rounded-full border border-border text-[10px] font-black uppercase tracking-widest text-muted hover:text-main transition-all"
                            >
                              Retry
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Users size={36} className="text-main/10" />
                            <p className="text-[10px] font-black uppercase tracking-[4px] text-muted/30">
                              {customers.length === 0 ? "No customers yet — add your first customer" : "No customers match your filters"}
                            </p>

                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((client, i) => {
                        const seg = segmentFromSpend(client.totalSpent);
                        return (
                          <motion.tr
                            key={client.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="border-b border-main/5 hover:bg-brand-surface/30 transition-all group cursor-pointer"
                            onClick={() => setSelectedCustomer(client)}
                          >
                            <td className="py-6 pr-4 font-mono text-[10px] text-muted/40 group-hover:text-brand-neonblue transition-colors uppercase tracking-[2px]">
                              CU-{client.id?.toString?.().slice(-6).toUpperCase() || "------"}
                            </td>
                            <td className="py-6 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-surface border border-border flex items-center justify-center font-black text-[11px] text-muted group-hover:border-brand-neonblue/20 group-hover:text-brand-neonblue transition-all">
                                  {client.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-[13px] font-black text-main group-hover:text-brand-neonblue transition-colors">{client.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-6 px-4">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[2px] border ${segmentColor(seg)}`}>
                                {seg}
                              </span>
                            </td>
                            <td className="py-6 px-4">
                              <div className="space-y-1.5">
                                {client.email && (
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-muted/60">
                                    <Mail size={11} className="opacity-40" /> {client.email}
                                  </div>
                                )}
                                {client.phone && (
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-muted/60">
                                    <Phone size={11} className="opacity-40" /> {client.phone}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-6 px-4">
                              <span className="text-[15px] font-black text-green-500">
                                ₱{parseFloat(client.totalSpent || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-6 px-4">
                              <span className="text-[15px] font-black text-main">
                                {parseInt(client.totalOrders || 0)}
                              </span>
                            </td>
                            <td className="py-6 pl-4 text-[11px] font-bold text-muted/50">
                              {client.Branch?.name || "—"}
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 text-[10px] font-black text-muted/30 uppercase tracking-widest">
                Showing {filtered.length} of {customers.length} customers
              </div>
            </motion.div>
          </div>
        </div>
      </main>



      {/* Customer Detail Drawer */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="absolute inset-0 bg-brand-bgbase/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10 w-full max-w-sm h-full bg-brand-surface border-l border-border p-8 overflow-y-auto custom-scrollbar"
            >
              <button onClick={() => setSelectedCustomer(null)} className="absolute top-6 right-6 p-2 hover:bg-brand-bgbase rounded-xl text-muted hover:text-main transition-colors">
                <X size={18} />
              </button>

              <div className="mb-8">
                <div className="w-16 h-16 rounded-2xl bg-brand-bgbase border border-border flex items-center justify-center font-black text-2xl text-muted mb-4">
                  {selectedCustomer.name?.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <h2 className="text-xl font-rajdhani font-black uppercase">{selectedCustomer.name}</h2>
                <span className={`mt-2 inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[2px] border ${segmentColor(segmentFromSpend(selectedCustomer.totalSpent))}`}>
                  {segmentFromSpend(selectedCustomer.totalSpent)}
                </span>
              </div>

              <div className="space-y-5">
                {[
                  { icon: Mail,     label: "Email",  value: selectedCustomer.email   || "—" },
                  { icon: Phone,    label: "Phone",  value: selectedCustomer.phone   || "—" },
                  { icon: MapPin,   label: "Address",value: selectedCustomer.address || "—" },
                  { icon: TrendingUp, label: "Branch", value: selectedCustomer.Branch?.name || "—" }
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <row.icon size={14} className="mt-0.5 text-muted/40 shrink-0" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[2px] text-muted/40">{row.label}</p>
                      <p className="text-sm font-bold text-main">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-brand-bgbase/60 rounded-xl p-4">
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-muted/40 mb-1">Total Spent</p>
                  <p className="text-xl font-rajdhani font-black text-green-500">
                    ₱{parseFloat(selectedCustomer.totalSpent || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-brand-bgbase/60 rounded-xl p-4">
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-muted/40 mb-1">Orders</p>
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
