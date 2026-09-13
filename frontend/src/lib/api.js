const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes("pcalley.shop")) {
      return "https://api.pcalley.shop";
    }
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return process.env.NEXT_PUBLIC_API_BASE_URL?.trim()?.replace(/\/$/, "") || "http://localhost:5000";
    }
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      return process.env.NEXT_PUBLIC_API_BASE_URL.trim().replace(/\/$/, "");
    }
    // Fallback for local network devices (tablets/phones on LAN)
    return `${window.location.protocol}//${hostname}:5000`;
  }
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return rawBaseUrl ? rawBaseUrl.replace(/\/$/, "") : "https://api.pcalley.shop";
};

const getSocketUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes("pcalley.shop")) {
      return "https://api.pcalley.shop";
    }
  }
  return (process.env.NEXT_PUBLIC_SOCKET_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:5000").replace(/\/$/, "");
};

const API_BASE_URL = getBaseUrl();
const SOCKET_BASE_URL = getSocketUrl();

const apiUrl = (path) => {
  if (!path || typeof path !== "string") return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = getBaseUrl();
  return `${base}${normalizedPath}`;
};

// Debounce flag to prevent redirect loops and duplicate session expired alerts
let isHandlingSessionExpiry = false;

/**
 * Centralized session expiry handler
 * Clears stale client auth state and redirects to login with preserved destination
 */
const handleSessionExpired = () => {
  if (typeof window === "undefined") return;

  // Always clear client credentials immediately
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch (e) {}

  if (isHandlingSessionExpiry) return;
  isHandlingSessionExpiry = true;

  const currentPath = window.location.pathname + window.location.search;
  const isPublicPage = currentPath === "/" || 
                       currentPath.startsWith("/?") || 
                       currentPath.startsWith("/forgot-password") || 
                       currentPath.startsWith("/register");

  if (!isPublicPage) {
    try {
      sessionStorage.setItem("auth_notice", "Session expired. Please log in again.");
    } catch (e) {}

    // Redirect to login preserving the intended destination
    window.location.href = `/?redirect=${encodeURIComponent(currentPath)}`;
  }

  // Reset debounce lock after short window to prevent locking future requests
  setTimeout(() => {
    isHandlingSessionExpiry = false;
  }, 2000);
};

const resetSessionExpiryLock = () => {
  isHandlingSessionExpiry = false;
};

/**
 * User-friendly API error message formatter
 * Differentiates network failures, server errors (5xx), forbidden (403), and session expiry (401).
 * Never labels server or network errors as session expired.
 */
const getApiErrorMessage = (error, fallback = "An unexpected error occurred.") => {
  if (!error) return fallback;

  // 1. Network Failure / Offline (MUST come first to never mislabel network as session expired)
  if (
    error.name === "TypeError" &&
    String(error.message || "").toLowerCase().includes("fetch")
  ) {
    return "Unable to connect to server. Please check your network connection.";
  }

  const errorMsg = String(
    error.message ||
    (typeof error === "string" ? error : "") ||
    ""
  ).toLowerCase();

  if (
    errorMsg.includes("networkerror") ||
    errorMsg.includes("failed to fetch") ||
    errorMsg.includes("net::err") ||
    errorMsg.includes("network request failed") ||
    errorMsg.includes("econnrefused") ||
    errorMsg.includes("etimedout")
  ) {
    return "Unable to connect to server. Please check your network connection.";
  }

  // 2. Server-side 5xx errors (MUST be checked before auth to never mislabel server error as session expired)
  const status = error.status || error.response?.status;
  if (status >= 500) {
    return "The server encountered an error. Please try again in a moment.";
  }
  if (
    errorMsg.includes("internal server error") ||
    errorMsg.includes("server error (50") ||
    errorMsg.includes("status 50")
  ) {
    return "The server encountered an error. Please try again in a moment.";
  }

  // 3. Forbidden Role Access (HTTP 403)
  if (status === 403) {
    return "Access denied: You do not have permission to perform this action.";
  }
  if (
    errorMsg.includes("access denied") ||
    errorMsg.includes("insufficient permission") ||
    errorMsg.includes("forbidden")
  ) {
    return "Access denied: You do not have permission to perform this action.";
  }

  // 4. Expired Session / Unauthorized (HTTP 401 or token invalid strings)
  if (status === 401) {
    return "Session expired. Please log in again.";
  }

  const rawMessage =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.data?.message ||
    error.message ||
    (typeof error === "string" ? error : null);

  if (rawMessage && typeof rawMessage === "string") {
    const lower = rawMessage.toLowerCase();
    // Catch confusing technical authentication and token errors
    if (
      lower.includes("jwt expired") ||
      lower.includes("invalid token") ||
      lower.includes("invalid signature") ||
      lower.includes("jwt malformed") ||
      lower.includes("token missing") ||
      lower.includes("token invalid or expired") ||
      lower.includes("session_invalid") ||
      lower.includes("session_expired") ||
      lower.includes("session has been revoked") ||
      lower.includes("session expired")
    ) {
      return "Session expired. Please log in again.";
    }

    // Never show raw technical database or server exceptions
    if (
      lower.includes("sequelizenameerror") ||
      lower.includes("syntaxerror") ||
      lower.includes("referenceerror") ||
      lower.includes("sql")
    ) {
      return "The server encountered an error. Please try again in a moment.";
    }

    return rawMessage;
  }

  return fallback;
};

/**
 * Installs a centralized global fetch interceptor in the browser
 * Ensures ALL outgoing API requests across POS, Dashboard, Inventory, Sales, Customers,
 * Services, Analytics, and Settings automatically include credentials and tokens,
 * and seamlessly handles 401 session expirations consistently without page-by-page logic.
 */
const installGlobalAuthInterceptor = () => {
  if (typeof window === "undefined" || typeof window.fetch !== "function" || window.__pc_auth_interceptor_installed) return;
  window.__pc_auth_interceptor_installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input, init = {}) {
    let url = typeof input === "string" ? input : (input instanceof URL ? input.href : input?.url || "");
    const base = getBaseUrl();
    const isApiRequest = url.includes("/api/") || 
                         url.startsWith(base) || 
                         url.includes("api.pcalley.shop") || 
                         url.includes(":5000");

    let modifiedInit = { ...init };

    if (isApiRequest) {
      const headers = new Headers(init.headers || {});
      const token = localStorage.getItem("token");
      if (token && !headers.has("Authorization") && !headers.has("authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      modifiedInit.headers = headers;
      if (!modifiedInit.credentials) {
        modifiedInit.credentials = "include";
      }
    }

    try {
      const response = await originalFetch(input, modifiedInit);

      if (response.status === 401 && isApiRequest) {
        const isPublicAuthEndpoint = url.includes("/auth/login") || 
                                     url.includes("/auth/forgot-password") || 
                                     url.includes("/auth/verify-reset-token") || 
                                     url.includes("/auth/reset-password");

        if (!isPublicAuthEndpoint) {
          handleSessionExpired();

          // Return a sanitized response so calling code never sees raw "Invalid token"
          return new Response(
            JSON.stringify({
              message: "Session expired. Please log in again.",
              code: "SESSION_EXPIRED",
              valid: false
            }),
            {
              status: 401,
              statusText: "Unauthorized",
              headers: {
                "Content-Type": "application/json",
                "X-Auth-Handled": "session-expired"
              }
            }
          );
        }
      }

      return response;
    } catch (networkError) {
      throw networkError;
    }
  };
};

// Automatically install in browser runtime upon module import
if (typeof window !== "undefined") {
  installGlobalAuthInterceptor();
}

/**
 * Centralized API fetch wrapper with automated auth credentials and session handling
 */
const apiFetch = async (path, options = {}) => {
  const url = apiUrl(path);
  const headers = { ...(options.headers || {}) };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && !headers["Authorization"] && !headers["authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const fetchOptions = {
    ...options,
    credentials: options.credentials || "include",
    headers
  };

  try {
    const response = await fetch(url, fetchOptions);

    // Centralized 401 handling for protected endpoints
    if (response.status === 401) {
      const isLoginOrPublicAuth = path.includes("/auth/login") || 
                                 path.includes("/auth/forgot-password") || 
                                 path.includes("/auth/verify-reset-token") ||
                                 path.includes("/auth/reset-password");
      if (!isLoginOrPublicAuth) {
        handleSessionExpired();
      }
    }

    return response;
  } catch (error) {
    console.warn(`[API] Request failed for ${path}:`, error.message);
    throw error;
  }
};

/**
 * Securely logs out the current user, invalidating session locally and on the server
 */
const logoutUser = async () => {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    await fetch(apiUrl("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }).catch(() => {});
  } catch (e) {}

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = "/";
  }
};

export { 
  API_BASE_URL, 
  SOCKET_BASE_URL, 
  apiUrl, 
  apiFetch, 
  getApiErrorMessage, 
  handleSessionExpired, 
  resetSessionExpiryLock,
  installGlobalAuthInterceptor,
  logoutUser 
};
