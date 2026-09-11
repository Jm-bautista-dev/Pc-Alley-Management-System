"use client";

import { useEffect } from "react";
import { isTokenExpired, handleSessionExpired, resetSessionModalLock } from "@/lib/session";

/**
 * AuthListener
 *
 * Runs client-side at the root layout to provide:
 * 1. Multi-tab session synchronization (via BroadcastChannel).
 * 2. Immediate tab-focus check for expired tokens when user returns.
 */
export default function AuthListener() {
  useEffect(() => {
    // 1. Multi-tab synchronization
    let channel = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel("pc_alley_auth_channel");
        channel.onmessage = (event) => {
          const type = event?.data?.type;
          if (type === "SESSION_EXPIRED") {
            handleSessionExpired();
          } else if (type === "LOGIN_SUCCESS") {
            resetSessionModalLock();
          }
        };
      } catch (_) {}
    }

    // 2. Active tab check on focus or visibility change
    const checkActiveToken = () => {
      if (typeof window === "undefined") return;
      // Don't run check on login page
      if (window.location.pathname === "/") return;

      const token = localStorage.getItem("token");
      if (token) {
        const expiredStatus = isTokenExpired(token);
        if (expiredStatus === true) {
          handleSessionExpired();
        }
      }
    };

    window.addEventListener("focus", checkActiveToken);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkActiveToken();
      }
    });

    return () => {
      window.removeEventListener("focus", checkActiveToken);
      if (channel) {
        try {
          channel.close();
        } catch (_) {}
      }
    };
  }, []);

  return null;
}
