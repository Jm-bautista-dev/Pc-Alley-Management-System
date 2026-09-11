"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  Users,
  UserPlus,
  Building2,
  MapPin,
  Phone,
  Mail,
  Search,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  UserCheck,
  Plus,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Filter,
  Layers,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";

function PersonnelPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedBranchForModal, setSelectedBranchForModal] = useState(null);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [activeBranchFilter, setActiveBranchFilter] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(null);

  // Forms
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [branchFormData, setBranchFormData] = useState({
    name: "",
    location: "",
    phone: ""
  });
  const [userFormData, setUserFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "employee",
    branch_id: ""
  });

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isBranchAdmin = currentUser?.role === "branch_admin";

  const availableRoles = isSuperAdmin
    ? [
        { value: "employee", label: "Staff" },
        { value: "branch_admin", label: "Manager" }
      ]
    : [{ value: "employee", label: "Staff" }];

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setCurrentUser(storedUser);

    if (!storedUser) {
      window.location.href = "/";
      return;
    }

    if (storedUser?.role === "employee") {
      window.location.href = "/sales";
      return;
    }

    fetchData();
  }, []);

  // Handle URL params e.g. ?create=user or ?create=branch
  useEffect(() => {
    const createParam = searchParams.get("create");
    if (createParam === "user" || createParam === "1") {
      openCreateUserModal();
      router.replace("/personnel");
    } else if (createParam === "branch" && isSuperAdmin) {
      setIsCreateBranchModalOpen(true);
      router.replace("/personnel");
    }
  }, [searchParams, isSuperAdmin]);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([
        fetch(apiUrl("/api/auth/users?limit=1000"), {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include"
        }),
        fetch(apiUrl("/api/branches"), {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include"
        })
      ]);

      const uData = await uRes.json();
      const bData = await bRes.json();

      if (uRes.ok) {
        setUsers(Array.isArray(uData) ? uData : uData.data || []);
      }
      if (bRes.ok) {
        setBranches(Array.isArray(bData) ? bData : []);
      }
    } catch (err) {
      console.error("Failed to load personnel data:", err);
      showError("Could not retrieve personnel records");
    } finally {
      setLoading(false);
    }
  };

  // Branch Pill Statistics
  const branchStats = useMemo(() => {
    const statsMap = {};
    branches.forEach((branch) => {
      const branchUsers = users.filter(
        (u) => Number(u.branch_id) === Number(branch.id)
      );
      const admins = branchUsers.filter(
        (u) => u.role === "branch_admin" || u.role === "super_admin"
      );
      const staff = branchUsers.filter(
        (u) => u.role === "employee" || u.role === "staff"
      );
      statsMap[branch.id] = {
        total: branchUsers.length,
        adminsCount: admins.length,
        staffCount: staff.length,
        admins,
        staff
      };
    });
    return statsMap;
  }, [branches, users]);

  // Click on Branch Pill -> Open Branch Email Modal
  const handleBranchPillClick = (branch) => {
    setSelectedBranchForModal(branch);
    setIsBranchModalOpen(true);
  };

  const handleCopyEmail = (email, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Reset & Open User Modal
  const resetUserForm = (defaultBranchId = "") => {
    setUserFormData({
      first_name: "",
      last_name: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: availableRoles[0]?.value || "employee",
      branch_id:
        currentUser?.role === "branch_admin"
          ? String(currentUser.branch_id)
          : defaultBranchId || (branches[0] ? String(branches[0].id) : "")
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const openCreateUserModal = (defaultBranchId = "") => {
    resetUserForm(defaultBranchId);
    setIsCreateUserModalOpen(true);
  };

  // Create Branch Handler
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    const name = branchFormData.name.trim();
    if (!name) {
      showError("Branch name is required.");
      return;
    }
    if (name.length < 2 || name.length > 100) {
      showError("Branch name must be between 2 and 100 characters.");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          location: branchFormData.location ? branchFormData.location.trim() : "",
          phone: branchFormData.phone ? branchFormData.phone.trim() : ""
        })
      });

      if (res.ok) {
        setIsCreateBranchModalOpen(false);
        setBranchFormData({ name: "", location: "", phone: "" });
        showSuccess("Branch created successfully!");
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.message || err.error || "Failed to create branch.");
      }
    } catch (err) {
      console.error("Branch Creation Error:", err);
      showError("Network connection error");
    }
  };

  // Create User Handler
  const handleCreateUser = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!branches.length) {
      showError("No branches available yet. Create a branch first before registering users.");
      return;
    }

    const payload = {
      first_name: userFormData.first_name.trim(),
      last_name: userFormData.last_name.trim(),
      username: userFormData.username.trim().toLowerCase(),
      password: userFormData.password,
      role: isSuperAdmin ? userFormData.role : "employee",
      branch_id:
        currentUser?.role === "branch_admin"
          ? Number(currentUser.branch_id)
          : Number(userFormData.branch_id)
    };

    if (!payload.first_name) {
      showError("Please enter the user's first name.");
      return;
    }
    if (
      /\d/.test(payload.first_name) ||
      !/^[A-Za-z\s.'-]+$/.test(payload.first_name) ||
      payload.first_name.length < 2 ||
      payload.first_name.length > 50
    ) {
      showError(
        "First name can only contain letters, spaces, hyphens, apostrophes, and dots (2-50 chars, no numbers)."
      );
      return;
    }

    if (!payload.last_name) {
      showError("Please enter the user's last name.");
      return;
    }
    if (
      /\d/.test(payload.last_name) ||
      !/^[A-Za-z\s.'-]+$/.test(payload.last_name) ||
      payload.last_name.length < 2 ||
      payload.last_name.length > 50
    ) {
      showError(
        "Last name can only contain letters, spaces, hyphens, apostrophes, and dots (2-50 chars, no numbers)."
      );
      return;
    }

    if (!payload.username) {
      showError("Please enter an email address / username for the user.");
      return;
    }
    if (payload.username.length < 3 || payload.username.length > 50) {
      showError("Username / email must be between 3 and 50 characters.");
      return;
    }

    if (userFormData.password !== userFormData.confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    if (!payload.password || payload.password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    if (!payload.branch_id || Number.isNaN(payload.branch_id)) {
      showError("Please assign a branch for the user account.");
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setIsCreateUserModalOpen(false);
        resetUserForm();
        showSuccess(
          `${payload.role === "branch_admin" ? "Manager" : "Staff"} account created successfully!`
        );
        fetchData();
      } else if (data.errors && Array.isArray(data.errors)) {
        const msgs = data.errors
          .map((entry) => entry.msg || Object.values(entry)[0])
          .filter(Boolean)
          .join("\n");
        showError(msgs || "Validation failed");
      } else {
        showError(data.message || "Failed to create user account");
      }
    } catch (err) {
      console.error("User Creation Error:", err);
      showError("Network connection error");
    }
  };

  // Filtered personnel list for the directory table
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Branch filter
      if (activeBranchFilter && Number(u.branch_id) !== Number(activeBranchFilter)) {
        return false;
      }
      // Role filter
      if (filterRole === "admin" && u.role !== "branch_admin" && u.role !== "super_admin") {
        return false;
      }
      if (filterRole === "staff" && u.role !== "employee" && u.role !== "staff") {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
        const username = (u.username || "").toLowerCase();
        const branchName = (u.Branch?.name || "").toLowerCase();
        return (
          fullName.includes(query) ||
          username.includes(query) ||
          branchName.includes(query)
        );
      }
      return true;
    });
  }, [users, activeBranchFilter, filterRole, searchQuery]);

  // Data for the currently open branch modal
  const currentModalBranchStats = selectedBranchForModal
    ? branchStats[selectedBranchForModal.id] || { admins: [], staff: [] }
    : { admins: [], staff: [] };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="PERSONNEL & BRANCHES" />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          {/* Header Action Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-brand-neonblue shadow-[0_0_8px_#00F2FF]" />
                <span className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue">
                  Directory & Access Control
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-rajdhani font-black uppercase text-main tracking-wide">
                Personnel Management
              </h1>
              <p className="text-xs text-muted font-medium mt-1">
                Browse branch personnel, view assigned Admin & Staff email addresses, and manage accounts.
              </p>
            </div>

            {/* Action Buttons: Moved from System Admin */}
            <div className="flex flex-wrap items-center gap-3">
              {isSuperAdmin && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsCreateBranchModalOpen(true)}
                  className="btn-ghost h-11 px-5 rounded-full flex items-center gap-2 text-xs font-bold shadow-sm"
                >
                  <Building2 size={16} className="text-brand-neonblue" />
                  <span>Create Branch</span>
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openCreateUserModal()}
                className="btn-premium h-11 px-6 rounded-full flex items-center gap-2 text-xs font-bold shadow-md shadow-brand-crimson/20"
              >
                <UserPlus size={16} />
                <span>Create User</span>
              </motion.button>
            </div>
          </div>

          {/* Branch Pills Section */}
          <div className="bg-brand-surface border border-border rounded-2xl p-5 md:p-6 mb-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-1 h-4 bg-brand-neonblue rounded-full" />
                <h2 className="text-sm font-rajdhani font-bold uppercase tracking-wider text-main flex items-center gap-2">
                  <Building2 size={16} className="text-brand-neonblue" />
                  <span>Available Branches</span>
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-main/5 text-muted">
                  {branches.length} {branches.length === 1 ? "Branch" : "Branches"}
                </span>
              </div>
              <p className="text-[11px] text-muted flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-neonblue/70" />
                Click a branch pill to view assigned Admin & Staff emails
              </p>
            </div>

            {/* Branch Pills List */}
            {loading ? (
              <div className="py-8 text-center text-xs font-mono uppercase tracking-widest text-muted/60 animate-pulse">
                Loading available branches...
              </div>
            ) : branches.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-muted font-bold uppercase tracking-widest mb-3">
                  No Branches Registered Yet
                </p>
                {isSuperAdmin && (
                  <button
                    onClick={() => setIsCreateBranchModalOpen(true)}
                    className="btn-ghost text-xs px-4 py-2 rounded-full"
                  >
                    + Create First Branch
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 pt-1">
                {branches.map((branch) => {
                  const stat = branchStats[branch.id] || { total: 0, adminsCount: 0, staffCount: 0 };
                  const isFiltered = activeBranchFilter === branch.id;

                  return (
                    <motion.div
                      key={branch.id}
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      className="relative group"
                    >
                      <button
                        onClick={() => handleBranchPillClick(branch)}
                        className={`
                          flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all cursor-pointer shadow-sm
                          ${
                            isFiltered
                              ? "bg-brand-neonblue/15 border-brand-neonblue text-main ring-2 ring-brand-neonblue/20"
                              : "bg-brand-bgbase/80 hover:bg-brand-surface border-border hover:border-brand-neonblue/50 text-main"
                          }
                        `}
                        title={`Click to view Admin & Staff emails for ${branch.name}`}
                      >
                        <div className="w-7 h-7 rounded-full bg-brand-surface border border-border flex items-center justify-center text-brand-neonblue shrink-0 group-hover:border-brand-neonblue/40 transition-colors">
                          <Building2 size={13} />
                        </div>

                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold tracking-tight text-main group-hover:text-brand-neonblue transition-colors">
                              {branch.name}
                            </span>
                            {branch.location && (
                              <span className="text-[10px] text-muted/60 truncate max-w-[110px] hidden sm:inline">
                                • {branch.location}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-mono text-muted/80 uppercase">
                              {stat.adminsCount} {stat.adminsCount === 1 ? "Admin" : "Admins"}
                            </span>
                            <span className="text-[9px] text-muted/40">•</span>
                            <span className="text-[9px] font-mono text-muted/80 uppercase">
                              {stat.staffCount} Staff
                            </span>
                          </div>
                        </div>

                        <span className="ml-1.5 px-2 py-0.5 rounded-full bg-brand-surface border border-border text-[10px] font-mono font-bold text-main/80 group-hover:border-brand-neonblue/30 transition-colors">
                          {stat.total}
                        </span>
                      </button>

                      {/* Quick filter toggle button on pill edge */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBranchFilter(isFiltered ? null : branch.id);
                        }}
                        title={isFiltered ? "Clear branch table filter" : "Filter directory table to this branch"}
                        className={`
                          absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border text-[9px] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100
                          ${
                            isFiltered
                              ? "bg-brand-neonblue text-black border-brand-neonblue opacity-100"
                              : "bg-brand-surface border-border text-muted hover:text-main"
                          }
                        `}
                      >
                        <Filter size={10} />
                      </button>
                    </motion.div>
                  );
                })}

                {activeBranchFilter && (
                  <button
                    onClick={() => setActiveBranchFilter(null)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-border hover:border-brand-crimson/50 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-brand-crimson transition-all"
                  >
                    <X size={12} />
                    <span>Clear Filter</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Personnel Directory Overview Section */}
          <div className="bg-brand-surface border border-border rounded-2xl p-5 md:p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-4 bg-brand-neonpurple rounded-full" />
                <h2 className="text-sm font-rajdhani font-bold uppercase tracking-wider text-main">
                  Personnel Directory
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-main/5 text-muted">
                  {filteredUsers.length} {filteredUsers.length === 1 ? "Account" : "Accounts"}
                </span>
                {activeBranchFilter && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-neonblue/10 border border-brand-neonblue/20 text-brand-neonblue">
                    Branch: {branches.find((b) => b.id === activeBranchFilter)?.name}
                  </span>
                )}
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email, branch..."
                    className="w-full bg-brand-bgbase border border-border rounded-full py-2 pl-9 pr-4 text-xs text-main placeholder:text-muted/60 focus:outline-none focus:border-brand-neonblue transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-brand-bgbase border border-border rounded-full py-2 px-4 text-xs text-main focus:outline-none focus:border-brand-neonblue transition-all appearance-none cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admins & Managers</option>
                  <option value="staff">Staff Associates</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-main/40 border-b border-border">
                    <th className="pb-3 pr-4">User</th>
                    <th className="pb-3 px-4">Email Address</th>
                    <th className="pb-3 px-4">Role</th>
                    <th className="pb-3 px-4">Assigned Branch</th>
                    <th className="pb-3 pl-4 text-right">Branch Quick View</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-16 text-center text-[10px] font-black uppercase tracking-[4px] text-main/20 animate-pulse"
                      >
                        Loading Personnel Directory...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-16 text-center text-xs font-bold uppercase tracking-wider text-muted"
                      >
                        No Personnel Found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const userEmail = user.email || user.username;
                      const userBranch =
                        branches.find((b) => b.id === user.branch_id) || user.Branch;

                      return (
                        <tr
                          key={user.id}
                          className="border-b border-border hover:bg-brand-muted/5 transition-colors group"
                        >
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold uppercase border ${
                                  user.role === "super_admin"
                                    ? "bg-brand-crimson/10 border-brand-crimson/30 text-brand-crimson"
                                    : user.role === "branch_admin"
                                    ? "bg-brand-neonblue/10 border-brand-neonblue/30 text-brand-neonblue"
                                    : "bg-brand-neonpurple/10 border-brand-neonpurple/30 text-brand-neonpurple"
                                }`}
                              >
                                {(user.first_name?.[0] || user.username?.[0] || "U").toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-main group-hover:text-brand-neonblue transition-colors">
                                  {user.first_name && user.last_name
                                    ? `${user.first_name} ${user.last_name}`
                                    : user.username}
                                </h4>
                                <p className="text-[9px] font-mono text-muted/60 uppercase">
                                  UID-{user.id.toString().padStart(4, "0")}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-main/90 font-medium">
                                {userEmail}
                              </span>
                              <button
                                onClick={(e) => handleCopyEmail(userEmail, e)}
                                title="Copy Email"
                                className="p-1 rounded text-muted hover:text-brand-neonblue hover:bg-brand-surface transition-colors"
                              >
                                {copiedEmail === userEmail ? (
                                  <Check size={12} className="text-green-400" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                                user.role === "super_admin"
                                  ? "bg-brand-crimson/10 border-brand-crimson/20 text-brand-crimson"
                                  : user.role === "branch_admin"
                                  ? "bg-brand-neonblue/10 border-brand-neonblue/20 text-brand-neonblue"
                                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              }`}
                            >
                              {user.role === "super_admin"
                                ? "Super Admin"
                                : user.role === "branch_admin"
                                ? "Manager"
                                : "Staff"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-xs text-muted/80">
                            {userBranch ? userBranch.name : "Central Core"}
                          </td>

                          <td className="py-3.5 pl-4 text-right">
                            {userBranch && (
                              <button
                                onClick={() => handleBranchPillClick(userBranch)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-surface border border-border text-[10px] font-bold text-muted hover:text-brand-neonblue hover:border-brand-neonblue/40 transition-all"
                              >
                                <Building2 size={11} />
                                <span>View Branch</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* BRANCH PERSONNEL MODAL: Displays Email Addresses of Admin & Staff        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isBranchModalOpen && selectedBranchForModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBranchModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-brand-surface border border-border rounded-[32px] p-6 md:p-8 relative z-10 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Decorative background glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-neonblue/10 blur-[90px] pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-border/80 relative">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-neonblue shadow-[0_0_8px_#00F2FF]" />
                    <span className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue">
                      Branch Personnel Roster
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-rajdhani font-black uppercase text-main tracking-wider flex items-center gap-2.5">
                    <Building2 size={22} className="text-brand-neonblue" />
                    <span>{selectedBranchForModal.name}</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted">
                    {selectedBranchForModal.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-muted/70" />
                        {selectedBranchForModal.location}
                      </span>
                    )}
                    {selectedBranchForModal.phone && (
                      <span className="flex items-center gap-1.5 font-mono">
                        <Phone size={13} className="text-muted/70" />
                        {selectedBranchForModal.phone}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setIsBranchModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-brand-bgbase border border-border flex items-center justify-center text-muted hover:text-main hover:border-brand-neonblue/40 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="flex-1 overflow-y-auto py-6 space-y-8 custom-scrollbar">
                {/* 1. Branch Administrators Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-brand-neonblue/10 border border-brand-neonblue/20 flex items-center justify-center text-brand-neonblue">
                        <ShieldCheck size={14} />
                      </div>
                      <h4 className="text-xs font-rajdhani font-bold uppercase tracking-wider text-main">
                        Branch Administrators / Managers
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-neonblue/10 text-brand-neonblue border border-brand-neonblue/20">
                      {currentModalBranchStats.admins.length}{" "}
                      {currentModalBranchStats.admins.length === 1 ? "Admin" : "Admins"}
                    </span>
                  </div>

                  {currentModalBranchStats.admins.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-brand-bgbase/60 border border-border/60 text-center">
                      <p className="text-xs text-muted font-medium">
                        No Administrator or Manager is currently assigned to this branch.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentModalBranchStats.admins.map((admin) => {
                        const email = admin.email || admin.username;
                        const fullName =
                          admin.first_name && admin.last_name
                            ? `${admin.first_name} ${admin.last_name}`
                            : admin.username;

                        return (
                          <div
                            key={admin.id}
                            className="p-4 rounded-2xl bg-brand-bgbase/80 border border-border hover:border-brand-neonblue/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-brand-neonblue/10 border border-brand-neonblue/30 flex items-center justify-center text-brand-neonblue font-bold text-xs uppercase shrink-0">
                                {(admin.first_name?.[0] || admin.username?.[0] || "A").toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-bold text-main">{fullName}</h5>
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-brand-neonblue/10 text-brand-neonblue border border-brand-neonblue/20">
                                    {admin.role === "super_admin" ? "Super Admin" : "Manager"}
                                  </span>
                                </div>
                                <p className="text-[10px] font-mono text-muted/60 mt-0.5">
                                  UID-{admin.id.toString().padStart(4, "0")}
                                </p>
                              </div>
                            </div>

                            {/* Email Display with Copy */}
                            <div className="flex items-center gap-2 bg-brand-surface px-3 py-2 rounded-xl border border-border/80">
                              <Mail size={13} className="text-brand-neonblue shrink-0" />
                              <span className="font-mono text-xs font-bold text-main select-all">
                                {email}
                              </span>
                              <button
                                onClick={(e) => handleCopyEmail(email, e)}
                                className="ml-1 p-1 rounded hover:bg-brand-bgbase text-muted hover:text-brand-neonblue transition-colors"
                                title="Copy Email Address"
                              >
                                {copiedEmail === email ? (
                                  <Check size={13} className="text-green-400" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Branch Staff Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Users size={14} />
                      </div>
                      <h4 className="text-xs font-rajdhani font-bold uppercase tracking-wider text-main">
                        Staff Associates
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {currentModalBranchStats.staff.length}{" "}
                      {currentModalBranchStats.staff.length === 1 ? "Staff" : "Staff"}
                    </span>
                  </div>

                  {currentModalBranchStats.staff.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-brand-bgbase/60 border border-border/60 text-center">
                      <p className="text-xs text-muted font-medium">
                        No Staff members are currently assigned to this branch.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentModalBranchStats.staff.map((staff) => {
                        const email = staff.email || staff.username;
                        const fullName =
                          staff.first_name && staff.last_name
                            ? `${staff.first_name} ${staff.last_name}`
                            : staff.username;

                        return (
                          <div
                            key={staff.id}
                            className="p-4 rounded-2xl bg-brand-bgbase/80 border border-border hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase shrink-0">
                                {(staff.first_name?.[0] || staff.username?.[0] || "S").toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-bold text-main">{fullName}</h5>
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Staff
                                  </span>
                                </div>
                                <p className="text-[10px] font-mono text-muted/60 mt-0.5">
                                  UID-{staff.id.toString().padStart(4, "0")}
                                </p>
                              </div>
                            </div>

                            {/* Email Display with Copy */}
                            <div className="flex items-center gap-2 bg-brand-surface px-3 py-2 rounded-xl border border-border/80">
                              <Mail size={13} className="text-emerald-400 shrink-0" />
                              <span className="font-mono text-xs font-bold text-main select-all">
                                {email}
                              </span>
                              <button
                                onClick={(e) => handleCopyEmail(email, e)}
                                className="ml-1 p-1 rounded hover:bg-brand-bgbase text-muted hover:text-emerald-400 transition-colors"
                                title="Copy Email Address"
                              >
                                {copiedEmail === email ? (
                                  <Check size={13} className="text-green-400" />
                                ) : (
                                  <Copy size={13} />
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

              {/* Modal Footer */}
              <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-muted font-medium">
                  Total {currentModalBranchStats.admins.length + currentModalBranchStats.staff.length} personnel assigned to {selectedBranchForModal.name}
                </p>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const bId = selectedBranchForModal.id;
                      setIsBranchModalOpen(false);
                      openCreateUserModal(String(bId));
                    }}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-brand-surface border border-brand-neonblue/30 text-brand-neonblue hover:bg-brand-neonblue/10 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <UserPlus size={13} />
                    <span>Add User to Branch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBranchModalOpen(false)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full border border-border text-xs font-bold text-muted hover:text-main hover:bg-brand-bgbase transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* CREATE BRANCH MODAL: Moved from System Admin                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCreateBranchModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateBranchModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-brand-surface border border-border rounded-[32px] p-6 md:p-10 relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-neonblue/10 blur-[80px] pointer-events-none" />

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={18} className="text-brand-neonblue" />
                  <span className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue">
                    Branch Setup
                  </span>
                </div>
                <h3 className="text-xl font-rajdhani font-black tracking-[3px] uppercase text-main mb-1">
                  Create New Branch
                </h3>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                  Deploy a new physical branch in the system
                </p>
              </div>

              <form onSubmit={handleCreateBranch} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={branchFormData.name}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, name: e.target.value })
                    }
                    className="w-full bg-brand-bgbase border border-border rounded-2xl py-3.5 px-5 text-sm text-main placeholder:text-muted/60 focus:outline-none focus:border-brand-neonblue transition-all"
                    placeholder="e.g. Branch D - Northern Spire"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">
                    Branch Address / Location
                  </label>
                  <input
                    type="text"
                    value={branchFormData.location}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, location: e.target.value })
                    }
                    className="w-full bg-brand-bgbase border border-border rounded-2xl py-3.5 px-5 text-sm text-main placeholder:text-muted/60 focus:outline-none focus:border-brand-neonblue transition-all"
                    placeholder="e.g. Business District, Quezon City"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">
                    Branch Phone Number
                  </label>
                  <input
                    type="text"
                    value={branchFormData.phone}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, phone: e.target.value })
                    }
                    className="w-full bg-brand-bgbase border border-border rounded-2xl py-3.5 px-5 text-sm text-main placeholder:text-muted/60 focus:outline-none focus:border-brand-neonblue transition-all"
                    placeholder="e.g. 0917-000-0000"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateBranchModalOpen(false)}
                    className="flex-1 py-3.5 rounded-full border border-border text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main hover:bg-brand-bgbase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3.5 bg-brand-neonblue hover:bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-[3px] text-black shadow-lg shadow-brand-neonblue/20 transition-all active:scale-[0.98]"
                  >
                    Create Branch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* CREATE USER MODAL: Moved from System Admin                                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCreateUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateUserModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-brand-surface border border-border rounded-[32px] p-6 md:p-8 relative z-10 shadow-2xl overflow-hidden my-8"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-crimson/10 blur-[80px] pointer-events-none" />

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus size={18} className="text-brand-crimson" />
                  <span className="text-[10px] font-black uppercase tracking-[3px] text-brand-crimson">
                    User Provisioning
                  </span>
                </div>
                <h3 className="text-xl font-rajdhani font-black tracking-[3px] uppercase text-main mb-1">
                  Create User Account
                </h3>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                  Register a new Manager or Staff account
                </p>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                {/* First and Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={userFormData.first_name}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, first_name: e.target.value })
                      }
                      className="w-full bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main placeholder:text-muted/60 focus:outline-none focus:border-brand-neonblue transition-all"
                      placeholder="e.g. Maria"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={userFormData.last_name}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, last_name: e.target.value })
                      }
                      className="w-full bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main placeholder:text-muted/60 focus:outline-none focus:border-brand-neonblue transition-all"
                      placeholder="e.g. Santos"
                    />
                  </div>
                </div>

                {/* Email / Username */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">
                    Email Address / Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormData.username}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, username: e.target.value })
                    }
                    className="w-full bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main placeholder:text-muted/60 focus:outline-none focus:border-brand-neonblue transition-all"
                    placeholder="e.g. msantos@pcalley.com"
                  />
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">
                      Password (min 6) *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={userFormData.password}
                        onChange={(e) =>
                          setUserFormData({ ...userFormData, password: e.target.value })
                        }
                        className="w-full bg-brand-bgbase border border-border rounded-2xl py-3 pl-4 pr-10 text-sm text-main focus:outline-none focus:border-brand-crimson transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={userFormData.confirmPassword}
                        onChange={(e) =>
                          setUserFormData({
                            ...userFormData,
                            confirmPassword: e.target.value
                          })
                        }
                        className="w-full bg-brand-bgbase border border-border rounded-2xl py-3 pl-4 pr-10 text-sm text-main focus:outline-none focus:border-brand-crimson transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role and Branch Assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">
                      Designated Role
                    </label>
                    <select
                      value={userFormData.role}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, role: e.target.value })
                      }
                      className="w-full bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all cursor-pointer"
                    >
                      {availableRoles.map((roleOption) => (
                        <option
                          key={roleOption.value}
                          value={roleOption.value}
                          className="bg-brand-surface"
                        >
                          {roleOption.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">
                      Branch Assignment *
                    </label>
                    <select
                      value={
                        currentUser?.role === "branch_admin"
                          ? currentUser.branch_id
                          : userFormData.branch_id
                      }
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, branch_id: e.target.value })
                      }
                      disabled={currentUser?.role === "branch_admin"}
                      required
                      className="w-full bg-brand-bgbase border border-border rounded-2xl py-3 px-4 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all cursor-pointer disabled:opacity-60"
                    >
                      {currentUser?.role !== "branch_admin" && (
                        <option value="" disabled className="bg-brand-surface">
                          Select Branch
                        </option>
                      )}
                      {branches.map((b) => (
                        <option key={b.id} value={b.id} className="bg-brand-surface">
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateUserModalOpen(false);
                      resetUserForm();
                    }}
                    className="flex-1 py-3.5 rounded-full border border-border text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main hover:bg-brand-bgbase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3.5 bg-brand-crimson hover:bg-red-600 rounded-full text-[10px] font-black uppercase tracking-[3px] text-white shadow-lg shadow-brand-crimson/20 transition-all active:scale-[0.98]"
                  >
                    Register Account
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

export default function PersonnelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-brand-bgbase text-main">
          <div className="text-[10px] font-black uppercase tracking-[4px] animate-pulse">
            Loading Personnel Core...
          </div>
        </div>
      }
    >
      <PersonnelPageContent />
    </Suspense>
  );
}
