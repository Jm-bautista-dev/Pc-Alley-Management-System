import { showModal } from "@/context/ModalContext";

/**
 * Concurrency guard to ensure multiple concurrent expired requests
 * only trigger the session expiration dialog once.
 */
let isSessionModalActive = false;

/**
 * Multi-tab synchronization channel
 */
const getAuthChannel = () => {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      return new BroadcastChannel("pc_alley_auth_channel");
    } catch (_) {
      return null;
    }
  }
  return null;
};

/**
 * Resets the session modal lock.
 * Called upon clicking "Sign in again", completing login, or navigation reset.
 */
export function resetSessionModalLock() {
  isSessionModalActive = false;
}

/**
 * Inspects a JWT token for expiration.
 *
 * @param {string|null} token
 * @param {number} clockSkewSeconds - Buffer in seconds to avoid client-server race conditions (default 10s)
 * @returns {boolean|null}
 *   - false: Valid token with future expiration
 *   - true:  Valid token with past expiration (including clock skew buffer)
 *   - null:  Malformed, unreadable, or missing exp claim
 */
export function isTokenExpired(token, clockSkewSeconds = 10) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const decoded = JSON.parse(jsonPayload);

    if (typeof decoded.exp !== "number") {
      return null;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    // If current time + buffer is >= exp, consider expired
    return currentTime + clockSkewSeconds >= decoded.exp;
  } catch (_) {
    return null;
  }
}

/**
 * Defensively resolves and validates redirect paths.
 * Prevents open-redirect attacks (e.g., //evil.com, javascript:, external origins).
 * Ensures destination complies with user role permissions.
 *
 * @param {string|null} targetUrl
 * @param {string|null} userRole - 'super_admin' | 'branch_admin' | 'employee' | 'staff'
 * @returns {string} Safe relative path
 */
export function getSafeRedirect(targetUrl, userRole = null) {
  const normalizedRole = String(userRole || "").toLowerCase();
  const defaultRoute =
    normalizedRole === "employee" || normalizedRole === "staff"
      ? "/sales"
      : "/dashboard";

  if (!targetUrl || typeof targetUrl !== "string") {
    return defaultRoute;
  }

  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const parsed = new URL(targetUrl, origin);

    // Reject cross-origin redirects
    if (parsed.origin !== origin) {
      return defaultRoute;
    }

    // Must be a relative path starting with a single '/'
    const fullPath = parsed.pathname + parsed.search + parsed.hash;
    if (!fullPath.startsWith("/") || fullPath.startsWith("//")) {
      return defaultRoute;
    }

    // Role-based authorization check
    const lowerPath = parsed.pathname.toLowerCase();

    // Staff/Employees cannot access admin, dashboard, or sensitive management sections
    if (
      (normalizedRole === "employee" || normalizedRole === "staff") &&
      (lowerPath.startsWith("/dashboard") ||
        lowerPath.startsWith("/admin") ||
        lowerPath.startsWith("/settings") ||
        lowerPath.startsWith("/staff") ||
        lowerPath.startsWith("/hrm"))
    ) {
      return "/sales";
    }

    // Branch admins cannot access super-admin specific sections
    if (
      normalizedRole === "branch_admin" &&
      (lowerPath.startsWith("/admin") || lowerPath.startsWith("/roles"))
    ) {
      return "/dashboard";
    }

    return fullPath;
  } catch (_) {
    return defaultRoute;
  }
}

/**
 * Targeted form state preservation helpers.
 * Excludes sensitive fields (passwords, tokens) and non-serializable objects (files).
 */
export function saveFormDraft(formId, data) {
  if (!formId || !data || typeof window === "undefined") return;

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    // Exclude sensitive credentials and passwords
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("token") ||
      lowerKey.includes("secret")
    ) {
      continue;
    }
    // Exclude file inputs or non-serializable objects
    if (value instanceof File || value instanceof FileList) {
      continue;
    }
    sanitized[key] = value;
  }

  try {
    sessionStorage.setItem(
      `form_draft_${formId}`,
      JSON.stringify({
        data: sanitized,
        timestamp: Date.now(),
      })
    );
  } catch (_) {}
}

export function getFormDraft(formId) {
  if (!formId || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`form_draft_${formId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data || null;
  } catch (_) {
    return null;
  }
}

export function clearFormDraft(formId) {
  if (!formId || typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(`form_draft_${formId}`);
  } catch (_) {}
}

/**
 * Snapshots any form explicitly tagged with [data-preserve-form].
 */
function snapshotTargetedForms() {
  if (typeof document === "undefined") return;

  try {
    const taggedForms = document.querySelectorAll("form[data-preserve-form]");
    taggedForms.forEach((form) => {
      const formId =
        form.getAttribute("data-preserve-form") ||
        form.id ||
        window.location.pathname;
      const formData = new FormData(form);
      const entries = {};

      formData.forEach((val, key) => {
        const lowerKey = key.toLowerCase();
        if (
          !lowerKey.includes("password") &&
          !lowerKey.includes("token") &&
          !(val instanceof File)
        ) {
          entries[key] = val;
        }
      });

      if (Object.keys(entries).length > 0) {
        saveFormDraft(formId, entries);
      }
    });
  } catch (_) {}
}

/**
 * Handles session expiration.
 * Idempotent: checks and sets lock immediately before any storage or UI changes.
 */
export function handleSessionExpired() {
  // 1. Idempotency & Concurrency Lock: must happen FIRST
  if (isSessionModalActive) {
    return;
  }
  isSessionModalActive = true;

  if (typeof window === "undefined") {
    return;
  }

  // 2. Save current destination to sessionStorage
  const currentPath = window.location.pathname + window.location.search;
  // Don't save root / login page as destination
  if (window.location.pathname !== "/") {
    try {
      sessionStorage.setItem("session_redirect", currentPath);
    } catch (_) {}
  }

  // 3. Snapshot any explicitly targeted forms
  snapshotTargetedForms();

  // 4. Clear auth credentials from localStorage
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch (_) {}

  // 5. Notify other tabs via BroadcastChannel or storage event
  try {
    const channel = getAuthChannel();
    if (channel) {
      channel.postMessage({ type: "SESSION_EXPIRED" });
      channel.close();
    }
  } catch (_) {}

  // 6. Show the non-dismissible modal with single CTA "Sign in again"
  showModal({
    type: "warning",
    title: "Your session has expired",
    message: "For your security, please sign in again to continue.",
    dismissible: false,
    closeOnOverlay: false,
    closeOnEscape: false,
    actions: [
      {
        label: "Sign in again",
        variant: "primary",
        onClick: () => {
          resetSessionModalLock();
          const savedRedirect =
            sessionStorage.getItem("session_redirect") || currentPath;
          const redirectParam =
            savedRedirect && savedRedirect !== "/"
              ? `?redirect=${encodeURIComponent(savedRedirect)}`
              : "";
          window.location.href = `/${redirectParam}`;
        },
      },
    ],
  });
}
