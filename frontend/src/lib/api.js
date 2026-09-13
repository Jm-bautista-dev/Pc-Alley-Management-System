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
  if (typeof window === "undefined" || isHandlingSessionExpiry) return;
  isHandlingSessionExpiry = true;

  // Clear client credentials
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch (e) {}

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
  } else {
    // If already on login page, reset handling lock after short timeout
    setTimeout(() => {
      isHandlingSessionExpiry = false;
    }, 1000);
  }
};

/**
 * User-friendly API error message formatter
 * Differentiates session expiry, unauthorized, forbidden, server error, and network failure
 */
const getApiErrorMessage = (error, fallback = "An unexpected error occurred.") => {
  if (!error) return fallback;

  // Network or offline failure
  if (error.name === "TypeError" && String(error.message || "").toLowerCase().includes("fetch")) {
    return "Unable to connect to server. Please check your network connection.";
  }
  if (String(error.message || "").toLowerCase().includes("networkerror") || String(error.message || "").toLowerCase().includes("failed to fetch")) {
    return "Unable to connect to server. Please check your network connection.";
  }

  // Response status-based differentiation
  const status = error.status || error.response?.status;
  if (status === 401) {
    return "Session expired. Please log in again.";
  }
  if (status === 403) {
    return "Access denied: You do not have permission to perform this action.";
  }
  if (status >= 500) {
    return "The server encountered an error. Please try again in a moment.";
  }

  // Check response body message
  const rawMessage = error.response?.data?.message || 
                     error.response?.data?.error || 
                     error.message || 
                     (typeof error === "string" ? error : null);

  if (rawMessage && typeof rawMessage === "string") {
    const lower = rawMessage.toLowerCase();
    // Catch confusing technical authentication errors
    if (lower.includes("jwt expired") || 
        lower.includes("invalid token") || 
        lower.includes("invalid signature") || 
        lower.includes("token missing") ||
        lower.includes("token invalid or expired") ||
        lower.includes("session_invalid") ||
        lower.includes("session has been revoked")) {
      return "Session expired. Please log in again.";
    }

    if (lower.includes("econnrefused") || lower.includes("etimedout")) {
      return "Server connection timed out. Please try again shortly.";
    }

    return rawMessage;
  }

  return fallback;
};

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
  logoutUser 
};
