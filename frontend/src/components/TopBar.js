"use client";

import { useState, useEffect } from "react";
import { Bell, User, ChevronDown, LogOut, Sun, Moon, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import NotificationsPanel from "./NotificationsPanel";
import Breadcrumb from "./Breadcrumb";
import { useTheme } from "@/context/ThemeContext";
import { useLayout } from "@/context/LayoutContext";
import { useNotifications } from "@/context/NotificationContext";

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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
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
    <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-brand-surface border-b border-border sticky top-0 z-40">

      {/* ── Left: mobile toggle + breadcrumb ── */}
      <div className="flex items-center gap-3 min-w-0">
        {isMobile && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-bgbase border border-border text-muted hover:text-main hover:bg-brand-hover"
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
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-bgbase border border-border text-muted hover:text-main hover:bg-brand-hover"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={theme}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.1 }}
              className="flex items-center justify-center"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </motion.span>
          </AnimatePresence>
        </button>

        {/* Divider */}
        <span className="w-px h-5 bg-border mx-1 hidden md:block" />

        {/* Notifications */}
        <button
          onClick={() => setIsNotificationsOpen(true)}
          title="Notifications"
          className={`
            relative w-9 h-9 flex items-center justify-center rounded-lg border
            ${unreadCount > 0
              ? "bg-rose-50 border-rose-200 text-rose-400 dark:bg-rose-400/10 dark:border-rose-400/20"
              : "bg-brand-bgbase border-border text-muted hover:text-main hover:bg-brand-hover"
            }
          `}
        >
          <Bell size={15} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <span className="w-px h-5 bg-border mx-1 hidden md:block" />

        {/* Profile */}
        <div className="relative" data-profile-dropdown>
          <button
            onClick={() => setIsProfileOpen((v) => !v)}
            className="flex items-center gap-2 h-9 pl-2 pr-2.5 rounded-lg bg-brand-bgbase border border-border text-main hover:bg-brand-hover"
          >
            {/* Avatar */}
            <span className="w-6 h-6 rounded-md bg-brand-neonblue/20 border border-brand-neonblue/30 flex items-center justify-center text-[10px] font-bold text-brand-neonblue shrink-0">
              {getInitials(displayName)}
            </span>
            <span className="text-sm font-medium hidden md:block max-w-[96px] truncate">
              {displayName}
            </span>
            <ChevronDown
              size={12}
              className={`text-muted shrink-0 transition-transform duration-150 ${isProfileOpen ? "rotate-180" : ""}`}
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
                className="absolute right-0 mt-1.5 w-48 bg-brand-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden"
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-main truncate">{displayName}</p>
                  <p className="text-xs text-muted mt-0.5 truncate capitalize">{(user?.role || "admin").replace("_", " ")}</p>
                </div>

                {/* Menu items */}
                <div className="p-1">
                  <button
                    onClick={() => { setIsProfileOpen(false); router.push("/profile"); }}
                    className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm font-medium text-muted hover:text-main hover:bg-brand-bgbase"
                  >
                    <User size={14} className="shrink-0" />
                    Profile
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-400/10"
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
