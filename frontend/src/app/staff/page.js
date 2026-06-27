"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  UserPlus,
  Search,
  MoreVertical,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";
import { useNotifications } from "@/context/NotificationContext";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";

export default function StaffPage() {
  const { addNotification } = useNotifications();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const availableRoles = currentUser?.role === "super_admin"
    ? [
      { value: "employee", label: "Staff" },
      { value: "branch_admin", label: "Manager" }
    ]
    : [
      { value: "employee", label: "Staff" }
    ];
  const isSuperAdmin = currentUser?.role === "super_admin";
  const pageTitle = isSuperAdmin ? "PERSONNEL REGISTRY" : "STAFF REGISTRY";
  const createLabel = isSuperAdmin ? "Register Personnel" : "Register Staff";
  const visibleUsers = isSuperAdmin
    ? users.filter((user) => user.role !== "super_admin")
    : users.filter((user) => user.role === "employee");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setCurrentUser(storedUser);

    if (storedUser?.role === "employee") {
      window.location.href = "/dashboard";
      return;
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (currentUser?.role === "super_admin") {
      fetchData();
    }
  }, [selectedBranch]);

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
    const token = localStorage.getItem("token");
    const usersUrl = selectedBranch
      ? `/api/auth/users?branch_id=${selectedBranch}`
      : "/api/auth/users";
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([
        fetch(apiUrl(usersUrl), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/branches"), { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const uData = await uRes.json();
      const bData = await bRes.json();

      if (uRes.ok) setUsers(Array.isArray(uData) ? uData : (uData.data || []));
      if (bRes.ok) setBranches(bData);
    } catch (err) {
      console.error("Staff registry fetch failed:", err);
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

  const openProvisionModal = () => {
    resetProvisionForm();
    setIsModalOpen(true);
  };

  const handleProvision = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!branches.length) {
      alert("No branches available yet. Create a branch first before registering staff.");
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
      alert("Please enter the staff member's first name.");
      return;
    }

    if (!payload.last_name) {
      alert("Please enter the staff member's last name.");
      return;
    }

    if (!payload.username) {
      alert("Please enter a username for the staff account.");
      return;
    }

    if (provisionData.password !== provisionData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (!payload.password || payload.password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (!payload.branch_id || Number.isNaN(payload.branch_id)) {
      alert("Please assign a branch for the staff account.");
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
        setIsModalOpen(false);
        resetProvisionForm();
        const staffDisplayName = `${payload.first_name} ${payload.last_name}`;
        addNotification({
          type: "success",
          title: payload.role === "branch_admin" ? "Manager Registered" : "Staff Registered",
          message: `${staffDisplayName} was created for ${branches.find((branch) => branch.id === payload.branch_id)?.name || "the selected branch"}.`,
        });
        showSuccess(`${payload.role === "branch_admin" ? "Manager" : "Staff"} account created`);
        fetchData();
      } else if (data.errors && Array.isArray(data.errors)) {
        const msgs = data.errors.map((entry) => Object.values(entry)[0]).join("\n");
        addNotification({
          type: "alert",
          title: "Registration Validation Failed",
          message: msgs,
        });
        showError("Validation failed");
      } else {
        addNotification({
          type: "alert",
          title: "Registration Failed",
          message: data.message || "Failed to register staff account.",
        });
        showError(data.message || "Failed to register staff account.");
      }
    } catch (err) {
      console.error("Staff registration failed:", err);
      addNotification({
        type: "alert",
        title: "Network Connection Error",
        message: "Could not reach the backend while registering personnel.",
      });
      showError("Network connection error");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Are you sure you want to terminate this personnel account?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/auth/users/${userId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showSuccess("Account terminated successfully");
        fetchData();
      } else {
        showError("Failed to terminate account");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = visibleUsers.filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      user.username.toLowerCase().includes(query) ||
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query) ||
      user.Branch?.name?.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title={pageTitle} />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-brand-surface border border-border rounded-2xl p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-2">
                {isSuperAdmin ? "Visible Personnel" : "Visible Staff"}
              </p>
              <p className="text-3xl font-rajdhani font-black text-main">{visibleUsers.length}</p>
            </div>
            <div className="bg-brand-surface border border-border rounded-2xl p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-2">Authority</p>
              <p className="text-lg font-black text-main">
                {currentUser?.role === "branch_admin" ? "Branch Manager" : "Super Admin"}
              </p>
            </div>
            <div className="bg-brand-surface border border-border rounded-2xl p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-main/40 mb-2">Scope</p>
              <p className="text-lg font-black text-main">
                {currentUser?.role === "branch_admin" ? (currentUser?.branch_name || "Assigned Branch") : "All Branches"}
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-surface border border-border rounded-2xl p-6 lg:p-8 shadow-sm"
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
              <div className="relative group w-full md:max-w-md">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-neonblue transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isSuperAdmin ? "Search personnel name, username, role, or branch..." : "Search staff name, username, or branch..."}
                  className="w-full bg-brand-bgbase border border-border rounded-xl py-2.5 pl-11 pr-4 text-xs text-main focus:outline-none focus:border-brand-neonblue/30 transition-all font-bold"
                />
              </div>

              {isSuperAdmin && (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full md:w-56 bg-brand-bgbase border border-border rounded-xl py-2.5 px-4 text-xs text-main focus:outline-none focus:border-brand-neonblue/30 transition-all font-bold"
                >
                  <option value="" className="bg-brand-surface">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id} className="bg-brand-surface">
                      {branch.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={openProvisionModal}
                className="btn-premium h-11 w-full md:w-auto px-8 rounded-full"
              >
                <UserPlus size={18} /> {createLabel}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-main/40 border-b border-border">
                    <th className="pb-4 pr-4">{isSuperAdmin ? "Personnel ID" : "Staff ID"}</th>
                    <th className="pb-4 px-4">Full Name</th>
                    <th className="pb-4 px-4">Username</th>
                    <th className="pb-4 px-4">Role</th>
                    <th className="pb-4 px-4">Branch</th>
                    <th className="pb-4 pl-4 text-right">Ops</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-24 text-center text-[10px] font-black uppercase tracking-[4px] text-main/20 animate-pulse">
                        Syncing Staff Registry...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-24 text-center text-[10px] font-bold uppercase tracking-[4px] text-muted">
                        No Staff Accounts Found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((staff) => (
                      <tr key={staff.id} className="border-b border-border hover:bg-brand-muted/5 transition-colors">
                        <td className="py-4 pr-4 font-mono text-[10px] text-muted/40 uppercase">
                          STF-{staff.id.toString().padStart(4, "0")}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-brand-surface border border-border flex items-center justify-center text-[10px] font-bold text-muted uppercase">
                              {(staff.first_name ? `${staff.first_name} ${staff.last_name}` : staff.username).substring(0, 2)}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-main">{staff.first_name ? `${staff.first_name} ${staff.last_name}` : "No name"}</p>
                              <p className="text-[10px] text-main/30 font-black uppercase tracking-widest">
                                {staff.role === "branch_admin" ? "Branch Manager" : "Branch Staff"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-[11px] text-muted">
                          {staff.username}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${staff.role === "branch_admin"
                              ? "bg-brand-neonblue/10 border-brand-neonblue/20 text-brand-neonblue"
                              : "bg-orange-400/10 border-orange-400/20 text-orange-400"
                            }`}>
                            {staff.role === "branch_admin" ? "Manager" : "Staff"}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-[11px] font-bold text-main">
                            <Building2 size={14} className="text-muted" />
                            {staff.Branch?.name || "Unassigned"}
                          </div>
                        </td>
                        <td className="py-4 pl-4 text-right">
                          <button onClick={() => handleDeleteUser(staff.id)} className="p-2.5 bg-brand-surface border border-border rounded-xl text-muted hover:text-main transition-all shadow-sm">
                            <MoreVertical size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                resetProvisionForm();
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-brand-surface border border-border rounded-[32px] p-6 md:p-10 relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-crimson/10 blur-[80px] pointer-events-none" />

              <div className="mb-10">
                <h3 className="text-xl font-rajdhani font-black tracking-[4px] uppercase text-main mb-2">
                  {isSuperAdmin ? "Personnel Registration" : "Staff Registration"}
                </h3>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                  {isSuperAdmin ? "Create a new manager or staff account" : "Create a new staff account for branch operations"}
                </p>
              </div>

              <form onSubmit={handleProvision} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">First Name</label>
                    <input
                      type="text"
                      required
                      value={provisionData.first_name}
                      onChange={(e) => setProvisionData({ ...provisionData, first_name: e.target.value })}
                      className="w-full bg-brand-bgbase border border-border rounded-2xl py-4 px-6 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all"
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">Last Name</label>
                    <input
                      type="text"
                      required
                      value={provisionData.last_name}
                      onChange={(e) => setProvisionData({ ...provisionData, last_name: e.target.value })}
                      className="w-full bg-brand-bgbase border border-border rounded-2xl py-4 px-6 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">Username</label>
                  <input
                    type="text"
                    required
                    value={provisionData.username}
                    onChange={(e) => setProvisionData({ ...provisionData, username: e.target.value })}
                    className="w-full bg-brand-bgbase border border-border rounded-2xl py-4 px-6 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all"
                    placeholder="staff_branch@pcalley.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={provisionData.password}
                      onChange={(e) => setProvisionData({ ...provisionData, password: e.target.value })}
                      className="w-full bg-brand-bgbase border border-border rounded-2xl py-4 pl-6 pr-12 text-sm text-main focus:outline-none focus:border-brand-crimson transition-all"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={provisionData.confirmPassword || ""}
                      onChange={(e) => setProvisionData({ ...provisionData, confirmPassword: e.target.value })}
                      className="w-full bg-brand-bgbase border border-border rounded-2xl py-4 pl-6 pr-12 text-sm text-main focus:outline-none focus:border-brand-crimson transition-all"
                      placeholder="Repeat password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">Role</label>
                  <select
                    value={provisionData.role}
                    onChange={(e) => setProvisionData({ ...provisionData, role: e.target.value })}
                    disabled={!isSuperAdmin}
                    className="w-full bg-brand-bgbase border border-border rounded-2xl py-4 px-6 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all appearance-none disabled:opacity-70"
                  >
                    {availableRoles.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value} className="bg-brand-surface">
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[3px] text-muted ml-2">Branch</label>
                  <select
                    value={currentUser?.role === "branch_admin" ? currentUser.branch_id : provisionData.branch_id}
                    onChange={(e) => setProvisionData({ ...provisionData, branch_id: e.target.value })}
                    disabled={currentUser?.role === "branch_admin"}
                    className="w-full bg-brand-bgbase border border-border rounded-2xl py-4 px-6 text-sm text-main focus:outline-none focus:border-brand-neonblue transition-all appearance-none"
                    required
                  >
                    {currentUser?.role !== "branch_admin" && (
                      <option value="" disabled className="bg-brand-surface">Select Branch</option>
                    )}
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id} className="bg-brand-surface">
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetProvisionForm();
                    }}
                    className="flex-1 py-4 rounded-full border border-border text-[10px] font-black uppercase tracking-[3px] text-muted hover:text-main hover:bg-brand-muted/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-4 bg-brand-crimson hover:bg-red-700 rounded-full text-[10px] font-black uppercase tracking-[3px] text-main shadow-lg shadow-brand-crimson/20 transition-all active:scale-[0.98]"
                  >
                    {createLabel}
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
