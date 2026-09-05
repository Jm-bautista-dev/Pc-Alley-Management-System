"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ShieldAlert, LogOut, RefreshCw } from "lucide-react";
import { logoutUser } from "@/lib/api";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_WINDOW_MS = 2 * 60 * 1000;      // 2 minutes before timeout

export default function SessionWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);

  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef(null);

  // Check if current route is public (e.g. login or forgot password)
  const isPublicRoute = pathname === "/" || pathname === "/forgot-password" || pathname === "/register";

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  const handleLogout = useCallback(() => {
    setShowWarning(false);
    logoutUser();
  }, []);

  const handleStaySignedIn = () => {
    resetActivity();
    setShowWarning(false);
  };

  useEffect(() => {
    if (isPublicRoute) return;

    // Check if user is logged in
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    // Throttled activity listener
    let throttleTimeout = null;
    const onUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
          if (!showWarning) {
            lastActivityRef.current = Date.now();
          }
        }, 1000);
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach(event => window.addEventListener(event, onUserActivity, { passive: true }));

    // Heartbeat interval to check inactivity
    timerRef.current = setInterval(() => {
      const tokenCheck = localStorage.getItem("token");
      if (!tokenCheck) {
        clearInterval(timerRef.current);
        return;
      }

      const elapsed = Date.now() - lastActivityRef.current;
      const timeLeft = INACTIVITY_TIMEOUT_MS - elapsed;

      if (timeLeft <= 0) {
        // Expired -> logout immediately
        clearInterval(timerRef.current);
        handleLogout();
      } else if (timeLeft <= WARNING_WINDOW_MS) {
        // Warning window
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, Math.ceil(timeLeft / 1000)));
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, onUserActivity));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPublicRoute, showWarning, handleLogout]);

  if (isPublicRoute || !showWarning) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-brand-surface border border-border/80 rounded-2xl p-6 shadow-2xl text-main relative overflow-hidden"
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500 animate-pulse" />

          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-500 shrink-0">
              <Clock size={24} className="animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Security Warning</span>
              <h3 className="font-rajdhani font-black text-xl uppercase tracking-wide text-main">Session Expiring Soon</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                You have been inactive. For your security, your session will automatically close in:
              </p>
            </div>
          </div>

          <div className="my-6 p-4 rounded-xl bg-brand-bgbase/60 border border-border/40 text-center">
            <span className="font-rajdhani font-black text-4xl text-yellow-400 tracking-wider">
              {formattedTime}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-brand-surface hover:bg-brand-bgbase text-xs font-bold uppercase tracking-wider text-muted hover:text-main flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut size={14} /> Log Out
            </button>
            <button
              type="button"
              onClick={handleStaySignedIn}
              className="flex-1 py-2.5 px-4 rounded-xl bg-brand-neonblue hover:bg-brand-neonblue/90 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-neonblue/20"
            >
              <RefreshCw size={14} /> Stay Signed In
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
