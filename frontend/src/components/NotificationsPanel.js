"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Bell, CheckCheck, Trash2,
  AlertTriangle, CheckCircle2, Info, Package, ShoppingBag, Zap,
} from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { apiUrl } from "@/lib/api";
import { showSuccess, showError, showInfo, showWarning, showConfirm, showModal } from "@/context/ModalContext";
import { useRouter } from "next/navigation";

// Map notification type → icon + color
const TYPE_CONFIG = {
  alert:           { icon: AlertTriangle,  color: "text-rose-500",   bg: "bg-rose-50   dark:bg-rose-500/10",   border: "border-rose-200   dark:border-rose-500/20"   },
  error:           { icon: AlertTriangle,  color: "text-rose-500",   bg: "bg-rose-50   dark:bg-rose-500/10",   border: "border-rose-200   dark:border-rose-500/20"   },
  success:         { icon: CheckCircle2,   color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20" },
  info:            { icon: Info,           color: "text-brand-neonblue", bg: "bg-brand-neonblue/10", border: "border-brand-neonblue/20" },
  restock_request: { icon: Package,        color: "text-amber-500",   bg: "bg-amber-50  dark:bg-amber-500/10",  border: "border-amber-200  dark:border-amber-500/20"  },
  low_stock:       { icon: ShoppingBag,    color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/20" },
};

const getConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.info;

const safeString = (val, fallback = "") => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") {
    try {
      return val.message || val.title || JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  const str = String(val).trim();
  return str || fallback;
};

const sanitizeHtml = (htmlStr) => {
  if (typeof htmlStr !== "string") return htmlStr;
  return htmlStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

function renderContent(text, fallback = "No details provided.") {
  const rawText = safeString(text, fallback);
  const clean = sanitizeHtml(rawText);
  const parts = clean.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-bold text-main">{part}</strong>;
    }
    return part;
  });
}

export default function NotificationsPanel({ isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll, refresh } = useNotifications();
  const router = useRouter();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Refresh when panel opens
  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen]);

  const handleQuickApprove = async (note) => {
    const id = note.link?.split("id=")[1];
    if (!id) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/restock-requests/${id}/approve`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess("Restock approved — inventory updated");
        markAsRead(note.id);
        refresh();
      } else {
        const err = await res.json();
        showError(err.message || "Approval failed");
      }
    } catch (_) {
      showError("Network error");
    }
  };

  const handleNavigate = (note) => {
    if (note.link) router.push(note.link);
    markAsRead(note.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-brand-surface border-l border-border shadow-2xl z-[101] flex flex-col"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-brand-bgbase border border-border text-muted">
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-main">Notifications</h2>
                  <p className="text-xs text-muted">
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllAsRead}
                      title="Mark all as read"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-main hover:bg-brand-bgbase border border-transparent hover:border-border"
                    >
                      <CheckCheck size={14} />
                    </button>
                    <button
                      onClick={clearAll}
                      title="Clear all"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-400/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-400/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-main hover:bg-brand-bgbase border border-transparent hover:border-border"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── List ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 px-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-brand-bgbase border border-border flex items-center justify-center text-muted mb-4">
                    <Zap size={28} strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-semibold text-main">No notifications</p>
                  <p className="text-xs text-muted mt-1">You're all caught up. Activity will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((note) => {
                    const cfg = getConfig(note.type);
                    const Icon = cfg.icon;
                    const isRestock = note.type === "restock_request";
                    const cleanTitle = safeString(note.title, "System Alert");

                    return (
                      <div
                        key={note.id}
                        className={`px-5 py-4 transition-colors ${note.read ? "opacity-60" : "bg-brand-surface"} hover:bg-brand-bgbase`}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                            <Icon size={15} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-semibold leading-tight ${note.read ? "text-muted" : "text-main"}`}>
                                {renderContent(cleanTitle, "System Alert")}
                              </p>
                              <span className="text-xs text-muted shrink-0">{note.time}</span>
                            </div>

                            <p className="text-xs text-muted mt-1 leading-relaxed">
                              {renderContent(note.message, "No details provided.")}
                            </p>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-2.5">
                              {/* Restock quick-approve (only for super_admin, unread) */}
                              {isRestock && !note.read && (
                                <>
                                  <button
                                    onClick={() => handleQuickApprove(note)}
                                    className="h-7 px-3 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleNavigate(note)}
                                    className="h-7 px-3 rounded-lg border border-border text-xs font-medium text-muted hover:text-main hover:bg-brand-bgbase"
                                  >
                                    View
                                  </button>
                                </>
                              )}

                              {/* Link button for non-restock with a link */}
                              {!isRestock && note.link && !note.read && (
                                <button
                                  onClick={() => handleNavigate(note)}
                                  className="h-7 px-3 rounded-lg border border-border text-xs font-medium text-muted hover:text-main hover:bg-brand-bgbase"
                                >
                                  View
                                </button>
                              )}

                              {/* Mark read */}
                              {!note.read && !isRestock && (
                                <button
                                  onClick={() => markAsRead(note.id)}
                                  className="h-7 px-3 rounded-lg border border-border text-xs font-medium text-muted hover:text-main hover:bg-brand-bgbase"
                                >
                                  Mark read
                                </button>
                              )}

                              {/* Dismiss */}
                              {!isRestock && (
                                <button
                                  onClick={() => removeNotification(note.id)}
                                  className="h-7 px-2 rounded-lg text-xs text-muted hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-400/10 ml-auto"
                                  title="Dismiss"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-muted">Live — updates every 15s</span>
              </div>
              <button
                onClick={refresh}
                className="text-xs text-muted hover:text-main font-medium"
              >
                Refresh
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
