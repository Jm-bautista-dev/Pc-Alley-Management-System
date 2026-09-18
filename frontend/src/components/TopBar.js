"use client";

import { useState, useEffect } from "react";
import { Bell, User, ChevronDown, LogOut, Sun, Moon, Menu, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import NotificationsPanel from "./NotificationsPanel";
import Breadcrumb from "./Breadcrumb";
import { useTheme } from "@/context/ThemeContext";
import { useLayout } from "@/context/LayoutContext";
import { useNotifications } from "@/context/NotificationContext";

import { logoutUser } from "@/lib/api";

const TopBar = ({ title }) => {
  const { theme, toggleTheme } = useTheme();
  const { isMobile, isSidebarOpen, setIsSidebarOpen } = useLayout();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const displayName = user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.username || "Admin");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
  };

  const getInitials = (name) => {
    if (!name) return "AD";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!isProfileOpen) return;
    const handler = (e) => {
      if (!e.target.closest("[data-profile-dropdown]")) setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isProfileOpen]);

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-[#1a172e] border-b border-[#2e2a4a] text-white sticky top-0 z-40 shadow-sm">

      {/* ── Left: mobile toggle + breadcrumb ── */}
      <div className="flex items-center gap-3 min-w-0">
        {isMobile && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#24203d] border border-[#373258] text-slate-200 hover:text-white hover:bg-[#2d284d] transition-colors"
          >
            <Menu size={16} />
          </button>
        )}
        <Breadcrumb defaultTitle={title} />
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-1.5">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#24203d] border border-[#373258] text-slate-200 hover:text-white hover:bg-[#2d284d] transition-colors shadow-sm"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={theme}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.1 }}
              className="flex items-center justify-center text-slate-200"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </motion.span>
          </AnimatePresence>
        </button>

        {/* Divider */}
        <span className="w-px h-5 bg-[#2e2a4a] mx-1 hidden md:block" />

        {/* Notifications */}
        <button
          onClick={() => setIsNotificationsOpen(true)}
          title="Notifications"
          className={`
            relative w-9 h-9 flex items-center justify-center rounded-lg border transition-colors shadow-sm
            ${unreadCount > 0
              ? "bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25"
              : "bg-[#24203d] border-[#373258] text-slate-200 hover:text-white hover:bg-[#2d284d]"
            }
          `}
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <span className="w-px h-5 bg-[#2e2a4a] mx-1 hidden md:block" />

        {/* Profile */}
        <div className="relative" data-profile-dropdown>
          <button
            onClick={() => setIsProfileOpen((v) => !v)}
            className="flex items-center gap-2 h-9 pl-2 pr-2.5 rounded-lg bg-[#24203d] border border-[#373258] text-slate-100 hover:bg-[#2d284d] transition-colors shadow-sm"
          >
            {/* Avatar */}
            <span className="w-6 h-6 rounded-md bg-brand-neonblue/20 border border-brand-neonblue/30 flex items-center justify-center text-[10px] font-bold text-brand-neonblue shrink-0">
              {getInitials(displayName)}
            </span>
            <span className="text-sm font-medium hidden md:block max-w-[96px] truncate text-slate-200">
              {displayName}
            </span>
            <ChevronDown
              size={12}
              className={`text-slate-400 shrink-0 transition-transform duration-150 ${isProfileOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 mt-1.5 w-48 bg-[#24203d] border border-[#373258] rounded-xl shadow-2xl z-50 overflow-hidden text-slate-200"
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-[#373258]">
                  <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate capitalize">{(user?.role || "admin").replace("_", " ")}</p>
                </div>

                {/* Menu items */}
                <div className="p-1">
                  <button
                    onClick={() => { setIsProfileOpen(false); router.push("/profile"); }}
                    className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors"
                  >
                    <User size={14} className="shrink-0 text-slate-400" />
                    Profile
                  </button>
                  <button
                    onClick={() => { setIsProfileOpen(false); router.push("/settings"); }}
                    className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors"
                  >
                    <Settings size={14} className="shrink-0 text-slate-400" />
                    Settings
                  </button>
                  <div className="h-px bg-[#373258] my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={14} className="shrink-0" />
                    Log Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </header>
  );
};

export default TopBar;
