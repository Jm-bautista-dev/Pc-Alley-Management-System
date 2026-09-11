"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { 
  Shield, 
  Users, 
  Activity, 
  Key, 
  MoreVertical, 
  Search, 
  UserPlus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  Fingerprint,
  LogOut,
  ExternalLink,
  Building2,
  ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl, apiFetch } from "@/lib/api";
import RestockManagement from "@/components/restock/RestockManagement";

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [comparativeData, setComparativeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personnel");
  const [editingBranch, setEditingBranch] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [branchData, setBranchData] = useState({ name: "", location: "", phone: "" });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        if (parsed.role === 'employee' || parsed.role === 'staff') {
          window.location.href = '/sales';
          return;
        }
      } catch (_) {
        window.location.href = '/';
        return;
      }
    } else {
      window.location.href = '/';
      return;
    }

    fetchData();
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "restock") setActiveTab("restock");
    else if (tab === "personnel") setActiveTab("personnel");
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, bRes, compRes, restockRes] = await Promise.all([
        apiFetch("/api/auth/users"),
        apiFetch("/api/branches"),
        apiFetch("/api/sales/comparative"),
        apiFetch("/api/restock-requests?status=Pending")
      ]);
      
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(Array.isArray(uData) ? uData : (uData.data || []));
      }
      if (bRes.ok) {
        const bData = await bRes.json();
        setBranches(Array.isArray(bData) ? bData : []);
      }
      if (compRes.ok) {
        const compData = await compRes.json();
        setComparativeData(compData);
      }
      if (restockRes.ok) {
        const restockData = await restockRes.json();
        setComparativeData(prev => Array.isArray(prev) ? prev : { ...prev, pendingRestock: restockData.length });
      }
    } catch (err) {
      console.error("Link Failure:", err);
    } finally {
      setLoading(false);
    }
  };

  const activityLogs = [
    { id: 101, action: "Inventory Restock", user: "Alexander Pierce", time: "2m ago", status: "Success", detail: "Added 50x RTX 4090" },
    { id: 102, action: "Security Login", user: "Maria Clara", time: "1h ago", status: "Success", detail: "Terminal 04 Access" },
    { id: 103, action: "Refund Issued", user: "Renato Cruz", time: "2h ago", status: "Alert", detail: "₱12,500 Vector Loop" },
    { id: 104, action: "Registry Change", user: "System Core", time: "5h ago", status: "Success", detail: "Price matrix update" },
  ];

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/branches/${editingBranch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branchData)
      });
      
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingBranch(null);
        setBranchData({ name: "", location: "", phone: "" });
        fetchData();
      }
    } catch (err) {
      console.error("Branch Update Error:", err);
    }
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setBranchData({
      name: branch.name,
      location: branch.location || "",
      phone: branch.phone || ""
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Are you sure you want to terminate this personnel account?")) return;
    try {
      const res = await apiFetch(`/api/auth/users/${userId}`, {
        method: "DELETE"
      });
      if (res.ok) fetchData();
      else alert("Failed to delete user");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBranch = async (branchId) => {
    if (!confirm("Are you sure you want to decommission this sector? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/api/branches/${branchId}`, {
        method: "DELETE"
      });
      if (res.ok) fetchData();
      else alert("Failed to delete branch");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title={currentUser?.role === 'branch_admin' ? "BRANCH ADMINISTRATION" : "SYSTEM ADMINISTRATION"} />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          
          {/* Branch Admin Context Banner */}
          {currentUser?.role === 'branch_admin' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-6 px-5 py-3 bg-brand-neonblue/5 border border-brand-neonblue/20 rounded-2xl"
            >
              <div className="w-2 h-2 rounded-full bg-brand-neonblue shadow-[0_0_8px_#00F2FF]" />
              <span className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue">
                Managing Sector:
              </span>
              <span className="text-[10px] font-black uppercase tracking-[3px] text-main">
                {currentUser?.branch_name || `Branch #${currentUser?.branch_id}`}
              </span>
              <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-muted">
                Scope: Branch Only
              </span>
            </motion.div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setActiveTab("personnel")}
              className={`h-9 px-5 rounded-lg text-sm font-semibold transition-colors border ${
                activeTab === "personnel" 
                ? "bg-brand-neonblue/10 border-brand-neonblue/30 text-brand-neonblue" 
                : "bg-brand-surface border-border text-muted hover:text-main hover:bg-brand-bgbase"
              }`}
            >
              Personnel & Branches
            </button>
            <button 
              onClick={() => setActiveTab("restock")}
              className={`h-9 px-5 rounded-lg text-sm font-semibold transition-colors border ${
                activeTab === "restock" 
                ? "bg-brand-neonblue/10 border-brand-neonblue/30 text-brand-neonblue" 
                : "bg-brand-surface border-border text-muted hover:text-main hover:bg-brand-bgbase"
              }`}
            >
              Restock Requests
              {currentUser?.role === 'branch_admin' && comparativeData?.pendingRestock > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold">
                  {comparativeData.pendingRestock}
                </span>
              )}
            </button>
          </div>

          {activeTab === "personnel" ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* User Management Section */}
                <motion.div 
                   initial={{ opacity: 0, scale: 0.98 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="lg:col-span-2 bg-brand-surface border border-border rounded-2xl p-5 md:p-6 lg:p-8 overflow-hidden shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-4 bg-brand-neonblue/50 rounded-full" />
                      <h3 className="text-sm font-rajdhani font-bold uppercase text-main tracking-wider">
                        {currentUser?.role === 'branch_admin' ? `Staff — ${currentUser?.branch_name || 'Your Branch'}` : 'Personnel Overview'}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href="/personnel"
                        className="btn-premium h-10 px-5 rounded-full inline-flex items-center gap-2 text-xs font-bold"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Manage in Personnel</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
                      </Link>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                         <tr className="text-[10px] font-black uppercase tracking-widest text-main/40 border-b border-border">
                          <th className="pb-4 pr-4">User ID</th>
                          <th className="pb-4 px-4">User Name</th>
                          <th className="pb-4 px-4">Role</th>
                          <th className="pb-4 px-4">Branch</th>
                          <th className="pb-4 pl-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {loading ? (
                          <tr>
                            <td colSpan="5" className="py-24 text-center text-[10px] font-black uppercase tracking-[4px] text-main/20 animate-pulse">
                              Syncing Personnel Registry...
                            </td>
                          </tr>
                        ) : users.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-24 text-center text-[10px] font-bold uppercase tracking-[4px] text-muted">
                              No Users Found
                            </td>
                          </tr>
                        ) : (
                        users.map((user) => (
                          <tr key={user.id} className="border-b border-border hover:bg-brand-muted/5 transition-colors group">
                            <td className="py-4 pr-4">
                              <div className="flex items-center gap-2 font-mono text-[10px] text-muted-40 truncate uppercase">
                                UID-{user.id.toString().padStart(4, '0')}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-brand-surface border border-border flex items-center justify-center text-[10px] font-bold text-muted group-hover:border-brand-neonblue/30 group-hover:text-brand-neonblue transition-all opacity-60 uppercase">
                                  {user.username.substring(0, 2)}
                                </div>
                                <div>
                                   <h4 className="text-[13px] font-bold text-main group-hover:text-brand-neonblue transition-colors">{user.username}</h4>
                                   <p className="text-[10px] text-muted-40 uppercase tracking-widest mt-0.5">
                                     {user.id === currentUser?.id ? 'Current Session' : 'Active Account'}
                                   </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                                user.role === 'super_admin' ? 'bg-brand-crimson/10 border-brand-crimson/20 text-brand-crimson' : 
                                user.role === 'employee' ? 'bg-orange-400/10 border-orange-400/20 text-orange-400' :
                                'bg-brand-neonblue/10 border-brand-neonblue/20 text-brand-neonblue'
                              }`}>
                                {user.role === 'employee' ? 'Staff' : (user.role === 'branch_admin' ? 'Manager' : 'Admin')}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-mono text-[10px] text-muted-40 uppercase">
                               {user.Branch ? user.Branch.name : 'Central Core'}
                            </td>
                            <td className="py-4 pl-4 text-right">
                               <div className="flex justify-end gap-2">
                                 {user.id !== currentUser?.id && (
                                 <motion.button 
                                   whileHover={{ scale: 1.1 }}
                                   whileTap={{ scale: 0.9 }}
                                   onClick={() => handleDeleteUser(user.id)} 
                                   className="p-2.5 bg-brand-surface border border-border rounded-full text-brand-crimson hover:bg-brand-crimson hover:text-white transition-all shadow-sm"
                                   title="Terminate Account"
                                 >
                                   <LogOut size={14} />
                                 </motion.button>
                                 )}
                               </div>
                            </td>
                          </tr>
                        ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                {/* Activity Logs Section */}
                <motion.div 
                   initial={{ opacity: 0, scale: 0.98 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.1 }}
                   className="bg-brand-surface border border-border rounded-2xl p-5 md:p-8 lg:p-10 flex flex-col h-[500px] lg:h-auto shadow-sm"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-4 bg-brand-neonpurple/50 rounded-full" />
                      <h3 className="text-sm font-rajdhani font-bold uppercase text-main tracking-wider">Logic Flow</h3>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-brand-neonpurple shadow-[0_0_8px_#BC13FE]" />
                  </div>

                  <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="relative pl-6 pb-6 border-l border-border last:pb-0">
                        <div className={`absolute left-[-4.5px] top-0 w-2 h-2 rounded-full ${
                          log.status === 'Alert' ? 'bg-brand-crimson shadow-[0_0_8px_#D72638]' : 'bg-brand-neonblue shadow-[0_0_8px_#00F2FF]'
                        }`} />
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-[10px] font-bold uppercase tracking-widest ${log.status === 'Alert' ? 'text-brand-crimson' : 'text-main/60'}`}>{log.action}</h4>
                          <span className="text-[9px] font-bold text-muted uppercase">{log.time}</span>
                        </div>
                        <p className="text-[11px] font-medium text-muted mb-3">{log.detail}</p>
                        <div className="flex items-center gap-2">
                           <div className="w-4 h-4 rounded bg-brand-bgbase flex items-center justify-center text-[8px] font-black text-muted border border-border">
                             {log.user.split(' ').map(n => n[0]).join('')}
                           </div>
                           <span className="text-[9px] font-black text-main/40 uppercase tracking-widest">{log.user}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/admin/audit")} 
                    className="w-full mt-6 py-3 bg-brand-surface border border-border rounded-full text-[10px] font-bold uppercase tracking-[2px] text-muted hover:text-main transition-all shadow-sm"
                  >
                    Full System Audit
                  </motion.button>
                </motion.div>
              </div>

              {/* Comparative Output Section */}
              {currentUser?.role === 'super_admin' && (
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.15 }}
                   className="bg-brand-surface border border-border rounded-2xl p-5 md:p-6 lg:p-8 mb-8 overflow-hidden shadow-sm"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-4 bg-orange-400/50 rounded-full" />
                      <h3 className="text-sm font-rajdhani font-bold uppercase text-main tracking-wider">Comparative Output</h3>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => window.print()} 
                      className="btn-ghost px-6 py-2 text-[9px] rounded-full"
                    >
                      Export Report
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {comparativeData.map((data) => (
                      <div key={data.branch_id} className="p-5 border border-border bg-main/5 rounded-2xl">
                        <h4 className="text-[13px] font-bold text-main mb-4 uppercase">{data.branch_name}</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted uppercase tracking-widest">Total Revenue</span>
                            <span className="text-[12px] text-brand-neonblue font-bold">₱{Number(data.total_revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted uppercase tracking-widest">Orders Processed</span>
                            <span className="text-[12px] text-main font-bold">{data.order_count || 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted uppercase tracking-widest">Active Stock</span>
                            <span className="text-[12px] text-orange-400 font-bold">{data.total_stock || 0} units</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Branch Registry Section */}
              <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
                 className="bg-brand-surface border border-border rounded-2xl p-5 md:p-6 lg:p-8 mb-8 overflow-hidden shadow-sm"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-4 bg-brand-neonblue/50 rounded-full" />
                    <h3 className="text-sm font-rajdhani font-bold uppercase text-main tracking-wider">Branch Registry</h3>
                  </div>
                  <Link
                    href="/personnel"
                    className="btn-ghost px-4 py-2 text-xs rounded-full inline-flex items-center gap-2"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Open Matrix</span>
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-widest text-main border-b border-border">
                        <th className="pb-4 pr-4">Sector ID</th>
                        <th className="pb-4 px-4">Designation</th>
                        <th className="pb-4 px-4">Coordinates</th>
                        <th className="pb-4 px-4">Uplink</th>
                        {currentUser?.role === 'super_admin' && <th className="pb-4 pl-4 text-right">Ops</th>}
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {branches
                        .filter(branch => 
                          currentUser?.role === 'super_admin' || branch.id === currentUser?.branch_id
                        )
                        .map((branch) => (
                        <tr key={branch.id} className="border-b border-border hover:bg-brand-muted/5 transition-colors group">
                          <td className="py-4 pr-4">
                            <div className="font-mono text-[10px] text-muted-40 uppercase">SEC-{branch.id.toString().padStart(3, '0')}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-[13px] font-bold text-main group-hover:text-brand-neonblue transition-colors">{branch.name}</div>
                          </td>
                          <td className="py-4 px-4 text-[11px] text-muted-40 uppercase tracking-tight">
                            {branch.location || "Unset"}
                          </td>
                          <td className="py-4 px-4 text-[11px] text-muted-40 font-mono">
                            {branch.phone || "---"}
                          </td>
                          {currentUser?.role === 'super_admin' && (
                            <td className="py-4 pl-4 text-right">
                               <div className="flex justify-end gap-2">
                                 <motion.button 
                                   whileHover={{ scale: 1.05 }}
                                   whileTap={{ scale: 0.95 }}
                                   onClick={() => openEditModal(branch)}
                                   className="btn-ghost px-6 py-2 text-[9px] rounded-full"
                                 >
                                   Reconfigure
                                 </motion.button>
                                 <motion.button 
                                   whileHover={{ scale: 1.05 }}
                                   whileTap={{ scale: 0.95 }}
                                   onClick={() => handleDeleteBranch(branch.id)}
                                   className="px-6 py-2 text-[9px] rounded-full border border-brand-crimson/30 text-brand-crimson hover:bg-brand-crimson hover:text-white transition-all"
                                 >
                                   Decommission
                                 </motion.button>
                               </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <RestockManagement />
            </motion.div>
          )}

        </div>
      </main>

      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-brand-surface border border-border rounded-[32px] p-6 md:p-10 relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-neonblue/10 blur-[80px] pointer-events-none" />
              
              <div className="mb-10">
                <h3 className="text-xl font-rajdhani font-black tracking-[4px] uppercase text-main mb-2">Reconfigure Sector</h3>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Update parameters for {editingBranch?.name}</p>
              </div>

              <form onSubmit={handleUpdateBranch} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">Sector Designation</label>
                   <input 
                     type="text" 
                     required
                     value={branchData.name}
                     onChange={(e) => setBranchData({...branchData, name: e.target.value})}
                     className="w-full bg-main/5 border border-border rounded-2xl py-4 px-6 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">Coordinates</label>
                   <input 
                     type="text" 
                     value={branchData.location}
                     onChange={(e) => setBranchData({...branchData, location: e.target.value})}
                     className="w-full bg-main/5 border border-border rounded-2xl py-4 px-6 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">Uplink</label>
                   <input 
                     type="text" 
                     value={branchData.phone}
                     onChange={(e) => setBranchData({...branchData, phone: e.target.value})}
                     className="w-full bg-main/5 border border-border rounded-2xl py-4 px-6 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all"
                   />
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl border border-border text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main hover:bg-main/5 transition-all"
                  >
                   Cancel
                  </button>
                  <button 
                     type="submit"
                     className="flex-[2] py-4 bg-brand-neonblue hover:bg-blue-700 rounded-2xl text-[10px] font-black uppercase tracking-[3px] text-main shadow-lg shadow-brand-neonblue/20 transition-all active:scale-[0.98]"
                  >
                    Sync Parameters
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
