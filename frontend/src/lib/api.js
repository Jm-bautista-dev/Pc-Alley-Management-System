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
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  }
};

export { API_BASE_URL, SOCKET_BASE_URL, apiUrl, getApiErrorMessage, logoutUser };
