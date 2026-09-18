"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  User,
  Shield,
  Lock,
  Bell,
  Palette,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2,
  Save,
  RefreshCw,
  Sun,
  Moon,
  Laptop,
  Check,
  Smartphone,
  ShieldAlert,
  Mail,
  BadgeCheck,
  Server
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { showSuccess, showError, showInfo } from "@/context/ModalContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { apiUrl, handleSessionExpired } from "@/lib/api";

export default function SettingsPage() {
  const { user: authUser, isChecking } = useAuthGuard();
  const { theme, toggleTheme } = useTheme();

  // Active internal settings tab
  const [activeTab, setActiveTab] = useState("profile");

  // User & Profile State
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    role: "",
    phone: ""
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security / Password State
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);



  // Notification Preferences State
  const [notificationPrefs, setNotificationPrefs] = useState({
    stockAlerts: true,
    salesReports: true,
    securityAlerts: true,
    emailDigest: false,
    soundEffects: true,
    systemUpdates: true
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Appearance & Display State
  const [displayDensity, setDisplayDensity] = useState("comfortable"); // comfortable | compact
  const [enableAnimations, setEnableAnimations] = useState(true);

  // Branch / Business Settings State (Role-gated)
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [branchData, setBranchData] = useState({
    name: "",
    location: "",
    phone: "",
    tin: "123-456-789-000",
    receiptHeader: "PC ALLEY COMPUTER TRADING",
    receiptFooter: "Thank you for shopping at PC Alley! Keep this receipt for warranty claims."
  });
  const [isSavingBranch, setIsSavingBranch] = useState(false);

  // Load User Data & Saved Settings
  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        setCurrentUser(parsed);
        const email =
          parsed.email ||
          (parsed.username && !parsed.username.includes("@")
            ? `${parsed.username}@pcalley.com`
            : parsed.username || "");
        setProfileData({
          firstName: parsed.first_name || "",
          lastName: parsed.last_name || "",
          username: parsed.username || "",
          email: email,
          role: parsed.role || "staff",
          phone: parsed.phone || "+63 912 345 6789"
        });

        // Initialize branch if available
        if (parsed.branch_id) {
          setSelectedBranchId(String(parsed.branch_id));
        }
      } catch (err) {
        console.error("Error parsing user data:", err);
      }
    }

    // Load persisted local settings
    try {
      const savedNotifs = localStorage.getItem("pcalley_notification_prefs");
      if (savedNotifs) setNotificationPrefs(JSON.parse(savedNotifs));

      const savedDensity = localStorage.getItem("pcalley_display_density");
      if (savedDensity) setDisplayDensity(savedDensity);

      const savedAnim = localStorage.getItem("pcalley_animations_enabled");
      if (savedAnim !== null) setEnableAnimations(savedAnim === "true");


    } catch (e) {
      console.warn("Could not read local preferences", e);
    }
  }, []);

  // Fetch Branches for Super Admin & Branch Admin
  useEffect(() => {
    if (!currentUser) return;
    const canManageBranch =
      currentUser.role === "super_admin" || currentUser.role === "branch_admin";
    if (canManageBranch) {
      const token = localStorage.getItem("token");
      fetch(apiUrl("/api/branches"), {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setBranches(data);
            const userBranch =
              data.find((b) => b.id === currentUser.branch_id) || data[0];
            if (userBranch) {
              setSelectedBranchId(String(userBranch.id));
              setBranchData((prev) => ({
                ...prev,
                name: userBranch.name || "",
                location: userBranch.location || "",
                phone: userBranch.phone || ""
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  // Handle switching branch selection (for super admin)
  const handleBranchSelectChange = (branchId) => {
    setSelectedBranchId(branchId);
    const branch = branches.find((b) => String(b.id) === String(branchId));
    if (branch) {
      setBranchData((prev) => ({
        ...prev,
        name: branch.name || "",
        location: branch.location || "",
        phone: branch.phone || ""
      }));
    }
  };

  // 1. Profile Save Handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileData.firstName.trim()) {
      showError("First name cannot be empty");
      return;
    }
    if (!profileData.lastName.trim()) {
      showError("Last name cannot be empty");
      return;
    }
    if (/\d/.test(profileData.firstName) || /\d/.test(profileData.lastName)) {
      showError("Names cannot contain numbers");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      handleSessionExpired();
      return;
    }

    setIsSavingProfile(true);
    showInfo("Updating profile details...", { id: "profile-update" });

    try {
      const res = await fetch(apiUrl("/api/auth/profile"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: profileData.firstName.trim(),
          last_name: profileData.lastName.trim()
        })
      });
      const data = await res.json();

      if (res.ok) {
        showSuccess("Profile updated successfully", { id: "profile-update" });
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        storedUser.first_name = profileData.firstName.trim();
        storedUser.last_name = profileData.lastName.trim();
        storedUser.full_name = `${profileData.firstName.trim()} ${profileData.lastName.trim()}`;
        localStorage.setItem("user", JSON.stringify(storedUser));
        setCurrentUser(storedUser);
      } else {
        showError(data.message || "Failed to update profile", { id: "profile-update" });
      }
    } catch (err) {
      showError("Network connection error. Please try again.", { id: "profile-update" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 2. Password Save Handler
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      showError("All password fields are required");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError("New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showError("New password must be at least 6 characters");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      handleSessionExpired();
      return;
    }
    setIsSavingPassword(true);
    showInfo("Updating security credentials...", { id: "password-update" });

    try {
      const res = await fetch(apiUrl("/api/auth/change-password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const data = await res.json();

      if (res.ok) {
        showSuccess("Password changed successfully", { id: "password-update" });
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } else {
        showError(data.message || "Failed to update password", { id: "password-update" });
      }
    } catch (err) {
      showError("Network connection error. Please verify backend connectivity.", {
        id: "password-update"
      });
    } finally {
      setIsSavingPassword(false);
    }
  };



  // 4. Notification Preferences Save
  const handleSaveNotifications = () => {
    setIsSavingNotifications(true);
    localStorage.setItem(
      "pcalley_notification_prefs",
      JSON.stringify(notificationPrefs)
    );
    setTimeout(() => {
      setIsSavingNotifications(false);
      showSuccess("Notification preferences saved successfully");
    }, 400);
  };

  // 5. Appearance Density & Animations Save
  const handleSetDisplayDensity = (density) => {
    setDisplayDensity(density);
    localStorage.setItem("pcalley_display_density", density);
    showSuccess(`Display density updated to ${density}`);
  };

  const handleToggleAnimations = () => {
    const nextVal = !enableAnimations;
    setEnableAnimations(nextVal);
    localStorage.setItem("pcalley_animations_enabled", String(nextVal));
    showSuccess(`UI animations ${nextVal ? "enabled" : "reduced"}`);
  };

  // 6. Branch & Business Settings Save
  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchData.name.trim()) {
      showError("Branch name is required");
      return;
    }

    const token = localStorage.getItem("token");
    setIsSavingBranch(true);
    showInfo("Updating business profile...", { id: "branch-update" });

    try {
      if (selectedBranchId && currentUser?.role === "super_admin") {
        const res = await fetch(apiUrl(`/api/branches/${selectedBranchId}`), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: branchData.name.trim(),
            location: branchData.location.trim(),
            phone: branchData.phone.trim()
          })
        });

        if (res.ok) {
          const updated = await res.json();
          showSuccess("Branch information updated in registry", { id: "branch-update" });
          setBranches((prev) =>
            prev.map((b) => (b.id === updated.id ? updated : b))
          );
        } else {
          const errData = await res.json();
          showError(errData.message || "Failed to update branch", { id: "branch-update" });
        }
      } else {
        // Local business info for non-super admin or store branding
        localStorage.setItem(
          "pcalley_branch_custom_branding",
          JSON.stringify(branchData)
        );
        showSuccess("Business profile updated successfully", { id: "branch-update" });
      }
    } catch (err) {
      showError("Network error while updating branch details", { id: "branch-update" });
    } finally {
      setIsSavingBranch(false);
    }
  };

  // Permissions & Role Helpers
  const userRole = currentUser?.role || "employee";
  const isSuperAdmin = userRole === "super_admin";
  const isBranchAdmin = userRole === "branch_admin";
  const canAccessBranchSettings = isSuperAdmin || isBranchAdmin;

  const roleBadgeTitle =
    {
      super_admin: "Super Admin",
      branch_admin: "Branch Manager",
      employee: "Staff Associate",
      staff: "Staff Associate"
    }[userRole] || "Administrator";

  const initials = (
    profileData.firstName
      ? `${profileData.firstName[0]}${profileData.lastName?.[0] || ""}`
      : profileData.username || "AD"
  )
    .substring(0, 2)
    .toUpperCase();

  // Navigation Items Definition
  const navigationItems = [
    {
      id: "profile",
      label: "Profile / Account",
      icon: User,
      desc: "Personal information & credentials"
    },
    {
      id: "security",
      label: "Security & Password",
      icon: Lock,
      desc: "Access keys & session integrity"
    },

    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      desc: "Alert preferences & channel routing"
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: Palette,
      desc: "Theme, density & visual aesthetics"
    },
    ...(canAccessBranchSettings
      ? [
          {
            id: "branch",
            label: "Branch & Business",
            icon: Building2,
            desc: "Store profile & invoice headers"
          }
        ]
      : [])
  ];

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 25;
    if (pass.length >= 10) score += 25;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);
  const getStrengthLabel = (score) => {
    if (score <= 25) return { label: "Weak", color: "bg-rose-500 text-rose-500" };
    if (score <= 50) return { label: "Fair", color: "bg-amber-500 text-amber-500" };
    if (score <= 75) return { label: "Good", color: "bg-blue-500 text-blue-500" };
    return { label: "Strong", color: "bg-emerald-500 text-emerald-500" };
  };
  const strengthInfo = getStrengthLabel(passwordStrength);

  if (isChecking) {
    return (
      <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans items-center justify-center">
        <div className="flex items-center gap-3 text-muted">
          <RefreshCw className="animate-spin text-brand-neonblue" size={20} />
          <span className="text-sm font-medium">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SYSTEM SETTINGS" />

        {/* Full-width scrollable content workspace */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-10 custom-scrollbar relative z-10 w-full">
          {/* Header Banner */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-rajdhani font-black tracking-wide text-main uppercase">
                  Settings & Preferences
                </h1>
                <p className="text-xs sm:text-sm text-muted mt-1">
                  Manage your personal account, security configuration, system behaviors, and operational preferences.
                </p>
              </div>

              {/* Status / Environment pill */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-main/5 border border-border text-xs font-semibold text-muted">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Environment · v4.1.0
                </span>
              </div>
            </div>
          </div>

          {/* Internal Navigation Bar (Mobile / Tablet Horizontal Tabs) */}
          <div className="lg:hidden mb-6 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center gap-2 min-w-max border-b border-border pb-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                      isActive
                        ? "bg-brand-crimson text-white shadow-sm"
                        : "bg-brand-surface border border-border text-muted hover:text-main hover:bg-brand-hover"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main 2-Column Dashboard Layout on Desktop */}
          <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 items-start w-full">
            {/* ── Left Column: Dedicated Internal Settings Navigation (Desktop) ── */}
            <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-0">
              <div className="bg-brand-surface border border-border rounded-2xl p-3 shadow-sm space-y-1">
                <div className="px-3 py-2">
                  <span className="text-[10px] font-bold tracking-[2px] uppercase text-muted">
                    Workspace Navigation
                  </span>
                </div>

                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all group ${
                        isActive
                          ? "bg-brand-crimson text-white shadow-md shadow-brand-crimson/20"
                          : "text-muted hover:text-main hover:bg-main/5"
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-main/5 text-muted group-hover:text-main group-hover:bg-main/10"
                        }`}
                      >
                        <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-bold leading-tight truncate ${
                            isActive ? "text-white" : "text-main"
                          }`}
                        >
                          {item.label}
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 truncate ${
                            isActive ? "text-white/80" : "text-muted"
                          }`}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {/* System Diagnostics Box in Nav */}
                <div className="pt-4 mt-3 border-t border-border px-3 pb-1">
                  <div className="bg-main/5 rounded-xl p-3 border border-border/60">
                    <div className="flex items-center gap-2 text-muted mb-1.5">
                      <Server size={14} className="text-brand-neonblue" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        Node Synchronizer
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-main">
                      <span>Server Engine</span>
                      <span className="text-emerald-500 font-mono text-[11px]">Ready (200 OK)</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted mt-1">
                      <span>Latency: ~24ms</span>
                      <span>TLS 1.3 Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* ── Right Column: Dynamic Tab Content Area (100% full content width) ── */}
            <div className="flex-1 min-w-0 w-full">
              <AnimatePresence mode="wait">
                {/* 1. PROFILE & ACCOUNT TAB */}
                {activeTab === "profile" && (
                  <motion.div
                    key="tab-profile"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* User Hero Overview Card */}
                    <div className="bg-brand-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="relative group">
                          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-brand-crimson to-brand-neonpurple flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-lg">
                            {initials}
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-brand-surface flex items-center justify-center text-white" title="Account active">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        </div>

                        <div className="flex-1 text-center sm:text-left min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-main tracking-tight">
                              {profileData.firstName} {profileData.lastName || profileData.username}
                            </h2>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-crimson/10 text-brand-crimson self-center sm:self-auto">
                              <BadgeCheck size={12} />
                              {roleBadgeTitle}
                            </span>
                          </div>

                          <p className="text-xs text-muted mb-4">
                            System Principal Operator · User ID: #{currentUser?.id || "8829"} · Registered Employee
                          </p>

                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-main/5 border border-border text-xs text-muted">
                              <Mail size={13} className="text-brand-neonblue" />
                              {profileData.email}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-main/5 border border-border text-xs text-muted">
                              <Shield size={13} className="text-brand-neonpurple" />
                              Role: {userRole}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Profile Information Form Card */}
                    <div className="bg-brand-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
                      <div className="border-b border-border pb-4 mb-6">
                        <h3 className="text-base font-bold text-main">Personal Information</h3>
                        <p className="text-xs text-muted mt-0.5">
                          Update your public name and view your registered organizational credentials.
                        </p>
                      </div>

                      <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* First Name */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main flex items-center justify-between">
                              First Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={profileData.firstName}
                              onChange={(e) =>
                                setProfileData({ ...profileData, firstName: e.target.value })
                              }
                              placeholder="e.g. John"
                              className="w-full h-11 px-3.5 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue focus:ring-2 focus:ring-brand-neonblue/20 outline-none transition-all"
                              required
                            />
                            <p className="text-[11px] text-muted">Only letters, hyphens, and spaces allowed.</p>
                          </div>

                          {/* Last Name */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main flex items-center justify-between">
                              Last Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={profileData.lastName}
                              onChange={(e) =>
                                setProfileData({ ...profileData, lastName: e.target.value })
                              }
                              placeholder="e.g. Doe"
                              className="w-full h-11 px-3.5 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue focus:ring-2 focus:ring-brand-neonblue/20 outline-none transition-all"
                              required
                            />
                            <p className="text-[11px] text-muted">Family or legal surname.</p>
                          </div>

                          {/* Username (Read only) */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main">
                              System Username
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={profileData.username}
                                disabled
                                className="w-full h-11 px-3.5 bg-main/5 border border-border rounded-xl text-muted text-sm cursor-not-allowed opacity-80"
                              />
                            </div>
                            <p className="text-[11px] text-muted">Internal access identifier. Managed by system admin.</p>
                          </div>

                          {/* Email Address (Read only) */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main">
                              Email Address
                            </label>
                            <input
                              type="email"
                              value={profileData.email}
                              disabled
                              className="w-full h-11 px-3.5 bg-main/5 border border-border rounded-xl text-muted text-sm cursor-not-allowed opacity-80"
                            />
                            <p className="text-[11px] text-muted">Primary communication address associated with account.</p>
                          </div>

                          {/* Contact Phone */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main">
                              Contact Phone Number
                            </label>
                            <input
                              type="text"
                              value={profileData.phone}
                              onChange={(e) =>
                                setProfileData({ ...profileData, phone: e.target.value })
                              }
                              placeholder="+63 9XX XXX XXXX"
                              className="w-full h-11 px-3.5 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue focus:ring-2 focus:ring-brand-neonblue/20 outline-none transition-all"
                            />
                            <p className="text-[11px] text-muted">Used for critical security and shift dispatch alerts.</p>
                          </div>

                          {/* Assigned Role */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main">
                              Access Role & Privileges
                            </label>
                            <input
                              type="text"
                              value={roleBadgeTitle}
                              disabled
                              className="w-full h-11 px-3.5 bg-main/5 border border-border rounded-xl text-muted text-sm cursor-not-allowed font-medium opacity-80"
                            />
                            <p className="text-[11px] text-muted">Determines access permissions across modules.</p>
                          </div>
                        </div>

                        {/* Save Action Bar */}
                        <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const stored = JSON.parse(localStorage.getItem("user") || "{}");
                              setProfileData((prev) => ({
                                ...prev,
                                firstName: stored.first_name || "",
                                lastName: stored.last_name || ""
                              }));
                            }}
                            className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted hover:text-main hover:bg-brand-hover transition-colors"
                          >
                            Discard
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingProfile}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-crimson hover:bg-brand-crimson/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm shadow-brand-crimson/20 disabled:opacity-60"
                          >
                            {isSavingProfile ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save size={14} />
                                Save Profile
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}

                {/* 2. SECURITY & PASSWORD TAB */}
                {activeTab === "security" && (
                  <motion.div
                    key="tab-security"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Password Update Card */}
                    <div className="bg-brand-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
                      <div className="border-b border-border pb-4 mb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <Lock size={18} className="text-brand-crimson" />
                          <h3 className="text-base font-bold text-main">Update Access Password</h3>
                        </div>
                        <p className="text-xs text-muted">
                          Ensure your account is using a long, randomized password to stay secure.
                        </p>
                      </div>

                      <form onSubmit={handleSavePassword} className="space-y-6 max-w-2xl">
                        {/* Current Password */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-main flex items-center justify-between">
                            Current Password <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? "text" : "password"}
                              value={passwordData.currentPassword}
                              onChange={(e) =>
                                setPasswordData({ ...passwordData, currentPassword: e.target.value })
                              }
                              placeholder="Enter current password"
                              className="w-full h-11 pl-3.5 pr-11 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue focus:ring-2 focus:ring-brand-neonblue/20 outline-none transition-all"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
                            >
                              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* New Password & Confirm Password in 2-Column Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main flex items-center justify-between">
                              New Password <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? "text" : "password"}
                                value={passwordData.newPassword}
                                onChange={(e) =>
                                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                                }
                                placeholder="Min. 6 characters"
                                className="w-full h-11 pl-3.5 pr-11 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue focus:ring-2 focus:ring-brand-neonblue/20 outline-none transition-all"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
                              >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main flex items-center justify-between">
                              Confirm New Password <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={passwordData.confirmPassword}
                                onChange={(e) =>
                                  setPasswordData({
                                    ...passwordData,
                                    confirmPassword: e.target.value
                                  })
                                }
                                placeholder="Re-type new password"
                                className="w-full h-11 pl-3.5 pr-11 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue focus:ring-2 focus:ring-brand-neonblue/20 outline-none transition-all"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
                              >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Password Requirements Checklist & Strength Bar */}
                        {passwordData.newPassword && (
                          <div className="p-4 rounded-xl bg-main/5 border border-border space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-muted">Password Strength:</span>
                              <span className={`font-bold ${strengthInfo.color}`}>
                                {strengthInfo.label}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${strengthInfo.color.split(" ")[0]}`}
                                style={{ width: `${passwordStrength}%` }}
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2
                                  size={13}
                                  className={
                                    passwordData.newPassword.length >= 6
                                      ? "text-emerald-500"
                                      : "text-muted"
                                  }
                                />
                                <span className={passwordData.newPassword.length >= 6 ? "text-main" : "text-muted"}>
                                  At least 6 characters
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2
                                  size={13}
                                  className={
                                    passwordData.newPassword &&
                                    passwordData.newPassword === passwordData.confirmPassword
                                      ? "text-emerald-500"
                                      : "text-muted"
                                  }
                                />
                                <span
                                  className={
                                    passwordData.newPassword &&
                                    passwordData.newPassword === passwordData.confirmPassword
                                      ? "text-main"
                                      : "text-muted"
                                  }
                                >
                                  Passwords match
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setPasswordData({
                                currentPassword: "",
                                newPassword: "",
                                confirmPassword: ""
                              })
                            }
                            className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted hover:text-main hover:bg-brand-hover transition-colors"
                          >
                            Clear
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingPassword}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-crimson hover:bg-brand-crimson/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm shadow-brand-crimson/20 disabled:opacity-60"
                          >
                            {isSavingPassword ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Lock size={14} />
                                Update Password
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Active Sessions & Security Log Card */}
                    <div className="bg-brand-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
                      <div className="border-b border-border pb-4 mb-5 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-main">Active Sessions & Devices</h3>
                          <p className="text-xs text-muted mt-0.5">
                            Devices currently logged into this PC Alley terminal or back-office system.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-brand-bgbase border border-border">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-brand-neonblue/10 border border-brand-neonblue/20 flex items-center justify-center text-brand-neonblue">
                              <Laptop size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-main">
                                  Current Device (Windows NT · Web Terminal)
                                </p>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-500">
                                  This Session
                                </span>
                              </div>
                              <p className="text-[11px] text-muted">
                                IP: 127.0.0.1 (Localhost) · Signed in via JWT Token
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-emerald-500 hidden sm:block">Active Now</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}



                {/* 4. NOTIFICATIONS TAB */}
                {activeTab === "notifications" && (
                  <motion.div
                    key="tab-notifications"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <div className="bg-brand-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
                      <div className="border-b border-border pb-4 mb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <Bell size={18} className="text-brand-neonblue" />
                          <h3 className="text-base font-bold text-main">Notification Channels & Triggers</h3>
                        </div>
                        <p className="text-xs text-muted">
                          Choose what alerts appear in your notification tray, auditory cues, and email digest.
                        </p>
                      </div>

                      <div className="space-y-4">
                        {[
                          {
                            key: "stockAlerts",
                            title: "Inventory & Low Stock Warnings",
                            desc: "Instant push notification when an SKU falls below threshold or restock is approved."
                          },
                          {
                            key: "salesReports",
                            title: "Daily Sales & Revenue Summaries",
                            desc: "End-of-day store performance reports and target achievement notifications."
                          },
                          {
                            key: "securityAlerts",
                            title: "Security & Account Events",
                            desc: "High-priority alerts for new device logins, password resets, or permission changes."
                          },
                          {
                            key: "soundEffects",
                            title: "Terminal Audio Chimes",
                            desc: "Auditory confirmation on successful barcode scan, order finalization, or error alerts."
                          },
                          {
                            key: "emailDigest",
                            title: "Weekly Email Performance Digest",
                            desc: "Send an analytical summary of weekly sales and inventory turnover to registered email."
                          },
                          {
                            key: "systemUpdates",
                            title: "PC Alley System & Database Notices",
                            desc: "Updates regarding scheduled maintenance, data sync cycles, or new feature deployments."
                          }
                        ].map((item) => (
                          <div
                            key={item.key}
                            className="p-4 sm:p-5 rounded-xl bg-brand-bgbase border border-border flex items-center justify-between gap-4"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-main">{item.title}</p>
                              <p className="text-[11px] text-muted">{item.desc}</p>
                            </div>
                            <div
                              onClick={() =>
                                setNotificationPrefs({
                                  ...notificationPrefs,
                                  [item.key]: !notificationPrefs[item.key]
                                })
                              }
                              className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 ${
                                notificationPrefs[item.key]
                                  ? "bg-brand-crimson"
                                  : "bg-main/10"
                              }`}
                            >
                              <div
                                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${
                                  notificationPrefs[item.key] ? "right-1" : "left-1"
                                }`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-6 mt-6 border-t border-border flex items-center justify-end">
                        <button
                          type="button"
                          onClick={handleSaveNotifications}
                          disabled={isSavingNotifications}
                          className="flex items-center gap-2 px-6 py-2.5 bg-brand-crimson hover:bg-brand-crimson/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm shadow-brand-crimson/20 disabled:opacity-60"
                        >
                          {isSavingNotifications ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              Save Preferences
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 5. APPEARANCE & DISPLAY TAB */}
                {activeTab === "appearance" && (
                  <motion.div
                    key="tab-appearance"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <div className="bg-brand-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
                      <div className="border-b border-border pb-4 mb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <Palette size={18} className="text-brand-neonpurple" />
                          <h3 className="text-base font-bold text-main">Theme & Visual Appearance</h3>
                        </div>
                        <p className="text-xs text-muted">
                          Customize color scheme, interface density, and aesthetic controls.
                        </p>
                      </div>

                      {/* Theme Cards Selector */}
                      <div className="space-y-3 mb-8">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted">
                          Color Theme Mode
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Light Theme Card */}
                          <div
                            onClick={() => {
                              if (theme === "dark") toggleTheme();
                            }}
                            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                              theme !== "dark"
                                ? "bg-brand-crimson/5 border-brand-crimson shadow-sm"
                                : "bg-brand-bgbase border-border hover:border-brand-crimson/40"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                  <Sun size={18} />
                                </div>
                                <span className="text-sm font-bold text-main">Pastel Light</span>
                              </div>
                              {theme !== "dark" && (
                                <CheckCircle2 size={18} className="text-brand-crimson" />
                              )}
                            </div>
                            <p className="text-xs text-muted">
                              Soft lavender background (#F4F0FB) with crisp white cards for well-lit environments.
                            </p>
                          </div>

                          {/* Dark Theme Card */}
                          <div
                            onClick={() => {
                              if (theme !== "dark") toggleTheme();
                            }}
                            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                              theme === "dark"
                                ? "bg-brand-crimson/5 border-brand-crimson shadow-sm"
                                : "bg-brand-bgbase border-border hover:border-brand-crimson/40"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                  <Moon size={18} />
                                </div>
                                <span className="text-sm font-bold text-main">Midnight Purple Dark</span>
                              </div>
                              {theme === "dark" && (
                                <CheckCircle2 size={18} className="text-brand-crimson" />
                              )}
                            </div>
                            <p className="text-xs text-muted">
                              Deep navy-purple base (#1C192D) with high-contrast pastel accents for low-light ease.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Display Density Selector */}
                      <div className="space-y-3 mb-8">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted">
                          Interface Row Density
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div
                            onClick={() => handleSetDisplayDensity("comfortable")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              displayDensity === "comfortable"
                                ? "bg-brand-crimson/5 border-brand-crimson"
                                : "bg-brand-bgbase border-border hover:border-border/80"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-main">Comfortable (Standard)</span>
                              {displayDensity === "comfortable" && (
                                <Check size={16} className="text-brand-crimson" />
                              )}
                            </div>
                            <p className="text-[11px] text-muted mt-1">
                              More breathing room, higher padding on table rows and buttons.
                            </p>
                          </div>

                          <div
                            onClick={() => handleSetDisplayDensity("compact")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              displayDensity === "compact"
                                ? "bg-brand-crimson/5 border-brand-crimson"
                                : "bg-brand-bgbase border-border hover:border-border/80"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-main">Compact (Data-Dense)</span>
                              {displayDensity === "compact" && (
                                <Check size={16} className="text-brand-crimson" />
                              )}
                            </div>
                            <p className="text-[11px] text-muted mt-1">
                              Optimized for high-volume POS and large inventory tables.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* UI Micro-Animations Toggle */}
                      <div className="p-4 sm:p-5 rounded-xl bg-brand-bgbase border border-border flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-main">Interface Transitions & Animations</p>
                          <p className="text-[11px] text-muted">
                            Framer Motion smooth card entrances and drawer transitions.
                          </p>
                        </div>
                        <div
                          onClick={handleToggleAnimations}
                          className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 ${
                            enableAnimations ? "bg-brand-crimson" : "bg-main/10"
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${
                              enableAnimations ? "right-1" : "left-1"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 6. BRANCH & BUSINESS SETTINGS TAB (Role-Gated) */}
                {activeTab === "branch" && canAccessBranchSettings && (
                  <motion.div
                    key="tab-branch"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <div className="bg-brand-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
                      <div className="border-b border-border pb-4 mb-6">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 size={18} className="text-brand-crimson" />
                          <h3 className="text-base font-bold text-main">Branch & Business Configuration</h3>
                        </div>
                        <p className="text-xs text-muted">
                          Manage store contact information, official receipts, and tax headers.
                        </p>
                      </div>

                      {/* Super Admin Branch Switcher */}
                      {isSuperAdmin && branches.length > 0 && (
                        <div className="mb-6 p-4 rounded-xl bg-brand-bgbase border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-xs font-bold text-main">Select Branch to Configure:</span>
                            <p className="text-[11px] text-muted">Super Admin mode: switch between branch records.</p>
                          </div>
                          <select
                            value={selectedBranchId}
                            onChange={(e) => handleBranchSelectChange(e.target.value)}
                            className="h-10 px-3 bg-brand-surface border border-border rounded-xl text-xs font-semibold text-main focus:border-brand-neonblue outline-none"
                          >
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name} (#{b.id})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <form onSubmit={handleSaveBranch} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          {/* Store Name */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main flex items-center justify-between">
                              Branch / Store Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={branchData.name}
                              onChange={(e) =>
                                setBranchData({ ...branchData, name: e.target.value })
                              }
                              placeholder="e.g. PC Alley - Main Branch"
                              className="w-full h-11 px-3.5 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue outline-none"
                              required
                            />
                          </div>

                          {/* Branch Phone */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main">Contact Hotline</label>
                            <input
                              type="text"
                              value={branchData.phone}
                              onChange={(e) =>
                                setBranchData({ ...branchData, phone: e.target.value })
                              }
                              placeholder="e.g. +63 917 123 4567"
                              className="w-full h-11 px-3.5 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue outline-none"
                            />
                          </div>

                          {/* Branch Location */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-semibold text-main">Physical Store Address</label>
                            <input
                              type="text"
                              value={branchData.location}
                              onChange={(e) =>
                                setBranchData({ ...branchData, location: e.target.value })
                              }
                              placeholder="e.g. Unit 2B, Tech Hub Plaza, EDSA, Metro Manila"
                              className="w-full h-11 px-3.5 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue outline-none"
                            />
                          </div>

                          {/* Tax Identification (TIN) */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main">BIR / Tax ID (TIN)</label>
                            <input
                              type="text"
                              value={branchData.tin}
                              onChange={(e) =>
                                setBranchData({ ...branchData, tin: e.target.value })
                              }
                              placeholder="000-000-000-000"
                              className="w-full h-11 px-3.5 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue outline-none"
                            />
                          </div>

                          {/* Receipt Header Text */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main">Receipt Header Tagline</label>
                            <input
                              type="text"
                              value={branchData.receiptHeader}
                              onChange={(e) =>
                                setBranchData({ ...branchData, receiptHeader: e.target.value })
                              }
                              placeholder="Official Receipt Headline"
                              className="w-full h-11 px-3.5 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue outline-none"
                            />
                          </div>

                          {/* Receipt Footer Notes */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-semibold text-main">Receipt Footer & Warranty Note</label>
                            <textarea
                              rows={2}
                              value={branchData.receiptFooter}
                              onChange={(e) =>
                                setBranchData({ ...branchData, receiptFooter: e.target.value })
                              }
                              placeholder="Message printed at the bottom of customer receipts"
                              className="w-full p-3 bg-brand-bgbase border border-border rounded-xl text-main text-sm focus:border-brand-neonblue outline-none resize-none"
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-border flex items-center justify-end">
                          <button
                            type="submit"
                            disabled={isSavingBranch}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-crimson hover:bg-brand-crimson/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm shadow-brand-crimson/20 disabled:opacity-60"
                          >
                            {isSavingBranch ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save size={14} />
                                Save Business Settings
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>


    </div>
  );
}
