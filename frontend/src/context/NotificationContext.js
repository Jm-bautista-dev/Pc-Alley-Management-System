"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

const NotificationContext = createContext();

const formatRelativeTime = (dateInput) => {
  if (!dateInput) return "just now";
  const ts = typeof dateInput === "number" ? dateInput : new Date(dateInput).getTime();
  if (isNaN(ts)) return "just now";
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1)  return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const intervalRef = useRef(null);

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/api/notifications"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(
          data.map((n) => {
            const titleVal = n.title && typeof n.title === 'object' ? (n.title.title || n.title.message || JSON.stringify(n.title)) : n.title;
            const msgVal = n.message && typeof n.message === 'object' ? (n.message.message || JSON.stringify(n.message)) : n.message;
            return {
              ...n,
              title: titleVal ? String(titleVal).trim() : "Notification",
              message: msgVal ? String(msgVal).trim() : "No message content",
              read: n.is_read || n.isRead || false,
            };
          })
        );
      }
    } catch (_) {
      // silently fail — no network = no notifications
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 15 seconds so notifications feel live
    intervalRef.current = setInterval(fetchNotifications, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Local-only activity item for non-blocking system updates.
  const addNotification = ({ type = "info", title, message }) => {
    const now = new Date().toISOString();
    const titleVal = title && typeof title === 'object' ? (title.title || title.message || JSON.stringify(title)) : title;
    const msgVal = message && typeof message === 'object' ? (message.message || JSON.stringify(message)) : message;
    setNotifications((prev) =>
      [
        { 
          id: `local-${Date.now()}`, 
          type, 
          title: titleVal ? String(titleVal).trim() : "Notification", 
          message: msgVal ? String(msgVal).trim() : "No message content", 
          createdAt: now, 
          read: false 
        }, 
        ...prev
      ].slice(0, 50)
    );
  };

  const markAsRead = async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n))
    );
    if (String(id).startsWith("local-")) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(apiUrl(`/api/notifications/${id}/read`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {}
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => n.type === 'restock_request' ? n : { ...n, read: true, is_read: true }));
    const token = localStorage.getItem("token");
    try {
      await fetch(apiUrl("/api/notifications/read-all"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {}
  };

  const removeNotification = async (id) => {
    // Optimistic remove
    setNotifications((prev) => prev.filter((n) => n.id !== id || n.type === 'restock_request'));
    if (String(id).startsWith("local-")) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(apiUrl(`/api/notifications/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {}
  };

  const clearAll = async () => {
    setNotifications((prev) => prev.filter(n => n.type === 'restock_request'));
    const token = localStorage.getItem("token");
    try {
      await fetch(apiUrl("/api/notifications/clear-all"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {}
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const hydratedNotifications = notifications.map((n) => ({
    ...n,
    time: formatRelativeTime(n.createdAt),
  }));

  return (
    <NotificationContext.Provider
      value={{
        notifications: hydratedNotifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
}
