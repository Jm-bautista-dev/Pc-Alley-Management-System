"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  UserPlus,
  Search,
  Building2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Mail,
  Phone,
  MapPin,
  Shield,
  Users,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, getApiErrorMessage } from "@/lib/api";
import { useNotifications } from "@/context/NotificationContext";
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";
import toast, { Toaster } from "react-hot-toast";

export default function PersonnelPage() {
  const { addNotification } = useNotifications();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("");
  
  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [activeBranchDetail, setActiveBranchDetail] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(null);

  // Form states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [provisionData, setProvisionData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "employee",
    branch_id: ""
  });
  const [branchData, setBranchData] = useState({
    name: "",
    location: "",
    phone: ""
  });

  const isSuperAdmin = currentUser?.role === "super_admin";
  const availableRoles = isSuperAdmin
    ? [
        { value: "employee", label: "Staff Member" },
        { value: "branch_admin", label: "Branch Manager" }
      ]
    : [
        { value: "employee", label: "Staff Member" }
      ];

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        if (parsed.role === "employee" || parsed.role === "staff") {
          window.location.href = "/sales";
          return;
        }
      } catch (_) {
        window.location.href = "/";
        return;
      }
    } else {
      window.location.href = "/";
      return;
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    setProvisionData((prev) => ({
      ...prev,
      role: availableRoles[0]?.value || "employee",
      branch_id: currentUser.role === "branch_admin"
        ? String(currentUser.branch_id)
        : (prev.branch_id || (branches[0] ? String(branches[0].id) : ""))
    }));
  }, [currentUser, branches]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([
        apiFetch("/api/auth/users"),
        apiFetch("/api/branches")
      ]);

      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(Array.isArray(uData) ? uData : (uData.data || []));
      }
      if (bRes.ok) {
        const bData = await bRes.json();
        setBranches(Array.isArray(bData) ? bData : []);
      }
    } catch (err) {
      console.error("Personnel registry fetch failed:", err);
      toast.error(getApiErrorMessage(err, "Failed to load personnel data."));
    } finally {
      setLoading(false);
    }
  };

  const resetProvisionForm = () => {
    setProvisionData({
      first_name: "",
      last_name: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: availableRoles[0]?.value || "employee",
      branch_id: currentUser?.role === "branch_admin"
        ? String(currentUser.branch_id)
        : (branches[0] ? String(branches[0].id) : "")
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleCopyEmail = (email, e) => {
    if (e) e.stopPropagation();
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast.success(`Copied: ${email}`, { id: "copy-email-toast" });
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleRegisterPersonnel = async (e) => {
    e.preventDefault();

    if (!branches.length) {
      toast.error("No branches available yet. Create a branch first before registering personnel.");
      return;
    }

    const payload = {
      first_name: provisionData.first_name.trim(),
      last_name: provisionData.last_name.trim(),
      role: isSuperAdmin ? provisionData.role : "employee",
      username: provisionData.username.trim().toLowerCase(),
      password: provisionData.password,
      branch_id: currentUser?.role === "branch_admin"
        ? Number(currentUser.branch_id)
        : Number(provisionData.branch_id)
    };

    if (!payload.first_name) {
      toast.error("Please enter first name.");
      return;
    }
    if (/\d/.test(payload.first_name) || !/^[A-Za-z\s.\'-]+$/.test(payload.first_name) || payload.first_name.length < 2 || payload.first_name.length > 50) {
      toast.error("First name can only contain letters, spaces, hyphens, apostrophes, and dots (2-50 chars).");
      return;
    }

    if (!payload.last_name) {
      toast.error("Please enter last name.");
      return;
    }
    if (/\d/.test(payload.last_name) || !/^[A-Za-z\s.\'-]+$/.test(payload.last_name) || payload.last_name.length < 2 || payload.last_name.length > 50) {
      toast.error("Last name can only contain letters, spaces, hyphens, apostrophes, and dots (2-50 chars).");
      return;
    }

    if (!payload.username) {
      toast.error("Please enter a username or email.");
      return;
    }

    if (provisionData.password !== provisionData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!payload.password || payload.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (!payload.branch_id || Number.isNaN(payload.branch_id)) {
      toast.error("Please assign a branch for the account.");
      return;
    }

    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setIsRegisterModalOpen(false);
        resetProvisionForm();
        const displayName = `${payload.first_name} ${payload.last_name}`;
        const branchObj = branches.find((b) => b.id === payload.branch_id);
        addNotification({
          type: "success",
          title: payload.role === "branch_admin" ? "Manager Registered" : "Staff Registered",
          message: `${displayName} provisioned for ${branchObj?.name || "branch"}.`
        });
        showSuccess(
          `${payload.role === "branch_admin" ? "Manager" : "Staff"} account created`,
          `${displayName} was successfully registered and assigned to ${branchObj?.name || "branch"}.`
        );
        fetchData();
      } else if (data.errors && Array.isArray(data.errors)) {
        const msgs = data.errors.map((entry) => Object.values(entry)[0]).join(". ");
        toast.error(msgs || "Validation error during registration.");
      } else {
        toast.error(data.message || "Failed to register personnel.");
      }
    } catch (err) {
      console.error("Staff registration failed:", err);
      toast.error("Network connection error. Could not reach backend.");
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!branchData.name.trim()) {
      toast.error("Branch designation/name is required.");
      return;
    }

    try {
      const res = await apiFetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branchData.name.trim(),
          location: branchData.location.trim(),
          phone: branchData.phone.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        setIsBranchModalOpen(false);
        setBranchData({ name: "", location: "", phone: "" });
        showSuccess("Branch Sector Created", `Branch '${data.name}' has been initialized.`);
        fetchData();
      } else if (data.errors && Array.isArray(data.errors)) {
        const msgs = data.errors.map((entry) => Object.values(entry)[0]).join(". ");
        toast.error(msgs || "Validation error creating branch.");
      } else {
        toast.error(data.message || "Failed to create branch.");
      }
    } catch (err) {
      console.error("Branch Creation Error:", err);
      toast.error("Network error while creating branch.");
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const confirmed = await showConfirm(
      "Terminate Account Authorization",
      `Are you sure you want to terminate the credentials for ${userName || "this user"}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await apiFetch(`/api/auth/users/${userId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showSuccess("Account Terminated", "The personnel credentials have been revoked.");
        fetchData();
      } else {
        const data = await res.json();
        showError(data.message || "Failed to terminate account");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to terminate account.");
    }
  };

  // Branch statistics & personnel mapping
  const branchPillsData = branches.map((branch) => {
    const branchUsers = users.filter((u) => u.branch_id === branch.id);
    const manager = branchUsers.find((u) => u.role === "branch_admin");
    const staffList = branchUsers.filter((u) => u.role === "employee");
    return {
      branch,
      manager,
      staffList,
      totalCount: branchUsers.length
    };
  });

  // Filtered personnel table list
  const visibleUsers = users.filter((u) => {
    // Branch admins only see their branch
    if (currentUser?.role === "branch_admin") {
      return u.branch_id === currentUser.branch_id;
    }
    // Super admin sees all (except super_admin in personnel table)
    if (selectedBranchFilter) {
      return u.branch_id === Number(selectedBranchFilter);
    }
    return true;
  }).filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const username = (u.username || "").toLowerCase();
    const branchName = (u.Branch?.name || "").toLowerCase();
    const roleName = (u.role || "").toLowerCase();
    return fullName.includes(q) || username.includes(q) || branchName.includes(q) || roleName.includes(q);
  });

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title={isSuperAdmin ? "PERSONNEL & BRANCH MATRIX" : "STAFF DIRECTORY"} />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 space-y-8">
          
          {/* Header & Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-brand-crimson rounded-full" />
                <h1 className="text-2xl md:text-3xl font-rajdhani font-black tracking-wider uppercase text-main">
                  {isSuperAdmin ? "Personnel & Sector Management" : "Branch Staff Roster"}
                </h1>
              </div>
              <p className="text-[11px] text-muted font-semibold uppercase tracking-[0.2em] mt-1 ml-4.5">
                {isSuperAdmin
                  ? "Global personnel credential registry, manager allocations, and branch matrix"
                  : `Active personnel assigned to ${currentUser?.branch_name || "your sector"}`}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {isSuperAdmin && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsBranchModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-brand-surface text-main text-xs font-black uppercase tracking-wider hover:border-brand-neonblue hover:text-brand-neonblue transition-all shadow-sm"
                >
                  <Building2 size={15} />
                  Create Branch
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  resetProvisionForm();
                  setIsRegisterModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-crimson hover:bg-red-700 text-main text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-brand-crimson/20 active:scale-95"
              >
                <UserPlus size={15} />
                {isSuperAdmin ? "Register Personnel" : "Register Staff"}
              </motion.button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              BRANCH PILLS SECTION (Interactive Roster Pills)
          ───────────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-surface border border-border rounded-2xl p-5 md:p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Building2 size={16} className="text-brand-neonblue" />
                <h2 className="text-xs font-rajdhani font-bold uppercase tracking-widest text-main">
                  Branch Matrix & Personnel Directory
                </h2>
              </div>
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
                Click any branch pill to view Admin & Staff emails
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-muted uppercase font-bold tracking-widest animate-pulse">
                Loading Branch Directory...
              </div>
            ) : branches.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted font-bold uppercase tracking-widest">
                No branch sectors configured.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {branchPillsData.map(({ branch, manager, staffList, totalCount }) => {
                  const isUserBranch = currentUser?.role === "branch_admin" && branch.id === currentUser.branch_id;
                  return (
                    <motion.button
                      key={branch.id}
                      type="button"
                      whileHover={{ scale: 1.015, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveBranchDetail({ branch, manager, staffList })}
                      className={`group text-left p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between min-h-[105px] ${
                        isUserBranch
                          ? "bg-brand-neonblue/5 border-brand-neonblue/40 shadow-sm"
                          : "bg-brand-bgbase/60 border-border hover:border-brand-neonblue/50 hover:bg-brand-surface"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black uppercase font-rajdhani tracking-wider text-main truncate group-hover:text-brand-neonblue transition-colors">
                            {branch.name}
                          </p>
                          <p className="text-[10px] text-muted flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={10} className="shrink-0 text-muted/60" />
                            {branch.location || "Central Sector"}
                          </p>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-surface border border-border text-muted group-hover:border-brand-neonblue/30 group-hover:text-main transition-colors">
                          {totalCount} {totalCount === 1 ? "Person" : "Personnel"}
                        </span>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[10px]">
                        <span className="text-muted font-semibold truncate">
                          {manager ? (
                            <span className="text-brand-neonblue font-bold">
                              Mgr: {manager.first_name ? `${manager.first_name} ${manager.last_name?.[0] || ""}.` : manager.username}
                            </span>
                          ) : (
                            <span className="text-muted/60 italic">No Manager</span>
                          )}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted group-hover:text-main flex items-center gap-1 shrink-0">
                          View Roster <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ─────────────────────────────────────────────────────────────
              PERSONNEL TABLE SECTION
          ───────────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-brand-surface border border-border rounded-2xl p-5 md:p-6 lg:p-8 shadow-sm"
          >
            {/* Table Filter / Search Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-4 bg-brand-neonblue rounded-full" />
                <h3 className="text-sm font-rajdhani font-bold uppercase tracking-wider text-main">
                  {isSuperAdmin ? "Personnel Credentials & Access Roster" : "Branch Personnel Roster"}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[220px]">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search personnel, email, role..."
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-2 pl-9 pr-4 text-xs text-main placeholder:text-muted focus:outline-none focus:border-brand-neonblue transition-all"
                  />
                </div>

                {/* Branch Dropdown Filter (Super Admin only) */}
                {isSuperAdmin && (
                  <select
                    value={selectedBranchFilter}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                    className="bg-brand-bgbase border border-border rounded-xl py-2 px-3 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all"
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-main/50 border-b border-border">
                    <th className="pb-3.5 pr-4">ID</th>
                    <th className="pb-3.5 px-4">Personnel Name</th>
                    <th className="pb-3.5 px-4">Username / Email</th>
                    <th className="pb-3.5 px-4">Role Designation</th>
                    <th className="pb-3.5 px-4">Branch Sector</th>
                    <th className="pb-3.5 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-20 text-center text-xs font-bold uppercase tracking-widest text-muted animate-pulse">
                        Syncing Personnel Registry...
                      </td>
                    </tr>
                  ) : visibleUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center text-xs font-bold uppercase tracking-widest text-muted">
                        No personnel accounts matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    visibleUsers.map((user) => {
                      const isSelf = user.id === currentUser?.id;
                      const displayName = user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.username;
                      const isManager = user.role === "branch_admin";
                      const isSuper = user.role === "super_admin";

                      return (
                        <tr key={user.id} className="border-b border-border/70 hover:bg-brand-bgbase/40 transition-colors">
                          <td className="py-4 pr-4 font-mono text-[10px] text-muted/60">
                            STF-{user.id.toString().padStart(4, "0")}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase border ${
                                isSuper
                                  ? "bg-brand-crimson/10 border-brand-crimson/30 text-brand-crimson"
                                  : isManager
                                  ? "bg-brand-neonblue/10 border-brand-neonblue/30 text-brand-neonblue"
                                  : "bg-brand-surface border-border text-muted"
                              }`}>
                                {displayName.substring(0, 2)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-main">
                                  {displayName}
                                  {isSelf && <span className="ml-2 text-[9px] text-brand-neonblue font-bold uppercase">(You)</span>}
                                </p>
                                <p className="text-[10px] text-muted uppercase tracking-wider">
                                  {isSuper ? "Global Administrator" : isManager ? "Branch Manager" : "Branch Staff"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-muted">
                            <div className="flex items-center gap-2 group/email">
                              <span>{user.username}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyEmail(user.username, e)}
                                title="Copy Email"
                                className="opacity-0 group-hover/email:opacity-100 text-muted hover:text-main transition-opacity p-1"
                              >
                                {copiedEmail === user.username ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              isSuper
                                ? "bg-brand-crimson/10 border-brand-crimson/30 text-brand-crimson"
                                : isManager
                                ? "bg-brand-neonblue/10 border-brand-neonblue/30 text-brand-neonblue"
                                : "bg-amber-400/10 border-amber-400/30 text-amber-400"
                            }`}>
                              {isSuper ? <Shield size={10} /> : isManager ? <Users size={10} /> : <UserPlus size={10} />}
                              {isSuper ? "Super Admin" : isManager ? "Manager" : "Staff"}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 text-xs text-main font-semibold">
                              <Building2 size={13} className="text-muted shrink-0" />
                              <span className="truncate">{user.Branch?.name || "Central Core / All"}</span>
                            </div>
                          </td>
                          <td className="py-4 pl-4 text-right">
                            {!isSelf && (isSuperAdmin || (currentUser?.role === "branch_admin" && user.role === "employee")) && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteUser(user.id, displayName)}
                                className="p-2 rounded-lg bg-brand-surface border border-border text-muted hover:text-brand-crimson hover:border-brand-crimson/40 transition-colors"
                                title="Terminate Credentials"
                              >
                                <Trash2 size={14} />
                              </motion.button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: BRANCH PERSONNEL DIRECTORY (Admin & Staff Emails)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeBranchDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveBranchDetail(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-brand-surface border border-border rounded-[28px] p-6 md:p-8 relative z-10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Branch Header */}
              <div className="pb-5 border-b border-border flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-brand-neonblue" />
                    <h3 className="text-lg md:text-xl font-rajdhani font-black uppercase tracking-wider text-main">
                      {activeBranchDetail.branch.name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted mt-1">
                    {activeBranchDetail.branch.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {activeBranchDetail.branch.location}
                      </span>
                    )}
                    {activeBranchDetail.branch.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {activeBranchDetail.branch.phone}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveBranchDetail(null)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-brand-bgbase text-xs font-bold text-muted hover:text-main transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Modal Body: Manager & Staff Lists */}
              <div className="overflow-y-auto py-5 space-y-6 custom-scrollbar flex-1">
                
                {/* Branch Manager Section */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[2px] text-brand-neonblue mb-3 flex items-center gap-1.5">
                    <Shield size={12} /> Branch Administrator / Manager
                  </h4>

                  {activeBranchDetail.manager ? (
                    <div className="p-4 rounded-xl bg-brand-bgbase border border-brand-neonblue/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-neonblue/10 border border-brand-neonblue/30 text-brand-neonblue flex items-center justify-center font-bold text-sm uppercase">
                          {(activeBranchDetail.manager.first_name || activeBranchDetail.manager.username).substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-main">
                            {activeBranchDetail.manager.first_name
                              ? `${activeBranchDetail.manager.first_name} ${activeBranchDetail.manager.last_name || ""}`
                              : activeBranchDetail.manager.username}
                          </p>
                          <span className="text-[9px] font-black uppercase tracking-wider text-brand-neonblue">
                            Authorized Manager
                          </span>
                        </div>
                      </div>

                      {/* Manager Email with Copy */}
                      <div className="flex items-center gap-2 bg-brand-surface border border-border px-3 py-2 rounded-lg">
                        <Mail size={13} className="text-muted shrink-0" />
                        <span className="font-mono text-xs text-main truncate select-all">
                          {activeBranchDetail.manager.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(activeBranchDetail.manager.username)}
                          title="Copy Email"
                          className="text-muted hover:text-brand-neonblue p-1 transition-colors"
                        >
                          {copiedEmail === activeBranchDetail.manager.username ? (
                            <Check size={13} className="text-emerald-500" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-brand-bgbase border border-border text-center text-xs text-muted font-medium">
                      No Branch Manager assigned yet to this sector.
                    </div>
                  )}
                </div>

                {/* Branch Staff Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[2px] text-muted flex items-center gap-1.5">
                      <Users size={12} /> Staff Members ({activeBranchDetail.staffList.length})
                    </h4>
                  </div>

                  {activeBranchDetail.staffList.length === 0 ? (
                    <div className="p-5 rounded-xl bg-brand-bgbase border border-border text-center text-xs text-muted font-medium">
                      No staff members assigned to this branch yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeBranchDetail.staffList.map((staff) => {
                        const name = staff.first_name
                          ? `${staff.first_name} ${staff.last_name || ""}`.trim()
                          : staff.username;

                        return (
                          <div
                            key={staff.id}
                            className="p-3.5 rounded-xl bg-brand-bgbase border border-border hover:border-brand-neonblue/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-brand-surface border border-border text-muted flex items-center justify-center font-bold text-xs uppercase">
                                {name.substring(0, 2)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-main">{name}</p>
                                <span className="text-[9px] font-mono text-muted/60">
                                  STF-{staff.id.toString().padStart(4, "0")}
                                </span>
                              </div>
                            </div>

                            {/* Staff Email with Copy Button */}
                            <div className="flex items-center gap-2 bg-brand-surface border border-border px-3 py-1.5 rounded-lg">
                              <Mail size={12} className="text-muted shrink-0" />
                              <span className="font-mono text-xs text-muted select-all truncate">
                                {staff.username}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyEmail(staff.username)}
                                title="Copy Email"
                                className="text-muted hover:text-main p-1 transition-colors"
                              >
                                {copiedEmail === staff.username ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: CREATE BRANCH (Super Admin Only)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isBranchModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBranchModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-brand-surface border border-border rounded-[28px] p-6 md:p-8 relative z-10 shadow-2xl"
            >
              <div className="mb-6">
                <div className="flex items-center gap-2 text-brand-neonblue mb-1">
                  <Building2 size={20} />
                  <h3 className="text-lg font-rajdhani font-black uppercase tracking-wider text-main">
                    Create Branch Sector
                  </h3>
                </div>
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider">
                  Initialize a new operational branch in the central matrix
                </p>
              </div>

              <form onSubmit={handleCreateBranch} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">
                    Branch Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={branchData.name}
                    onChange={(e) => setBranchData({ ...branchData, name: e.target.value })}
                    placeholder="e.g. Sta. Cruz Sector Hub"
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main placeholder:text-muted focus:outline-none focus:border-brand-neonblue transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">
                    Location / Address
                  </label>
                  <input
                    type="text"
                    value={branchData.location}
                    onChange={(e) => setBranchData({ ...branchData, location: e.target.value })}
                    placeholder="e.g. Ground Floor, Plaza Bldg, Sta. Cruz"
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main placeholder:text-muted focus:outline-none focus:border-brand-neonblue transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">
                    Contact Phone / Uplink
                  </label>
                  <input
                    type="text"
                    value={branchData.phone}
                    onChange={(e) => setBranchData({ ...branchData, phone: e.target.value })}
                    placeholder="e.g. +63 912 345 6789"
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main placeholder:text-muted focus:outline-none focus:border-brand-neonblue transition-all"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBranchModalOpen(false)}
                    className="flex-1 py-3 rounded-full border border-border text-[10px] font-black uppercase tracking-widest text-muted hover:text-main transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[1.5] py-3 bg-brand-neonblue hover:bg-cyan-400 text-brand-navy rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-98"
                  >
                    Initialize Sector
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: REGISTER PERSONNEL (Staff & Managers)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRegisterModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-brand-surface border border-border rounded-[28px] p-6 md:p-8 relative z-10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="mb-6">
                <h3 className="text-xl font-rajdhani font-black tracking-wider uppercase text-main mb-1">
                  {isSuperAdmin ? "Personnel Registration" : "Staff Registration"}
                </h3>
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider">
                  {isSuperAdmin
                    ? "Provision credentials for a new Manager or Staff member"
                    : `Register a staff member for ${currentUser?.branch_name || "your branch"}`}
                </p>
              </div>

              <form onSubmit={handleRegisterPersonnel} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={provisionData.first_name}
                      onChange={(e) => setProvisionData({ ...provisionData, first_name: e.target.value })}
                      className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main placeholder:text-muted focus:outline-none focus:border-brand-neonblue transition-all"
                      placeholder="e.g. Maria"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={provisionData.last_name}
                      onChange={(e) => setProvisionData({ ...provisionData, last_name: e.target.value })}
                      className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main placeholder:text-muted focus:outline-none focus:border-brand-neonblue transition-all"
                      placeholder="e.g. Clara"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Username / Login Email *</label>
                  <input
                    type="text"
                    required
                    value={provisionData.username}
                    onChange={(e) => setProvisionData({ ...provisionData, username: e.target.value })}
                    className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main placeholder:text-muted focus:outline-none focus:border-brand-neonblue transition-all"
                    placeholder="staff_stacruz@pcalley.com"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={provisionData.password}
                        onChange={(e) => setProvisionData({ ...provisionData, password: e.target.value })}
                        className="w-full bg-brand-bgbase border border-border rounded-xl py-3 pl-4 pr-10 text-xs text-main placeholder:text-muted focus:outline-none focus:border-brand-crimson transition-all"
                        placeholder="Min 6 chars"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={provisionData.confirmPassword}
                        onChange={(e) => setProvisionData({ ...provisionData, confirmPassword: e.target.value })}
                        className="w-full bg-brand-bgbase border border-border rounded-xl py-3 pl-4 pr-10 text-xs text-main placeholder:text-muted focus:outline-none focus:border-brand-crimson transition-all"
                        placeholder="Repeat password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main"
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Role Designation</label>
                    <select
                      value={provisionData.role}
                      onChange={(e) => setProvisionData({ ...provisionData, role: e.target.value })}
                      disabled={!isSuperAdmin}
                      className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all appearance-none disabled:opacity-75"
                    >
                      {availableRoles.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted ml-1">Branch Sector</label>
                    <select
                      value={currentUser?.role === "branch_admin" ? currentUser.branch_id : provisionData.branch_id}
                      onChange={(e) => setProvisionData({ ...provisionData, branch_id: e.target.value })}
                      disabled={currentUser?.role === "branch_admin"}
                      className="w-full bg-brand-bgbase border border-border rounded-xl py-3 px-4 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all appearance-none disabled:opacity-75"
                      required
                    >
                      {currentUser?.role !== "branch_admin" && (
                        <option value="" disabled>Select Branch</option>
                      )}
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterModalOpen(false);
                      resetProvisionForm();
                    }}
                    className="flex-1 py-3 rounded-full border border-border text-[10px] font-black uppercase tracking-widest text-muted hover:text-main transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[1.8] py-3 bg-brand-crimson hover:bg-red-700 text-main rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-98"
                  >
                    Provision Account
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
