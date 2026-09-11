import { handleSessionExpired } from "./session";

const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname.includes("pcalley.shop")) {
      return "https://api.pcalley.shop";
    }
  }
  return "";
};

const apiUrl = (path) => {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

const getApiErrorMessage = (error, fallbackMessage) => {
  if (error?.name === "TypeError") {
    return "Backend server is offline. Start the backend server, then refresh this page.";
  }
  return fallbackMessage;
};

/**
 * Inspects a response and data payload for explicit TOKEN_EXPIRED indicators.
 * Only triggers the session expiration modal if the response is genuinely expired.
 *
 * @param {Response} res
 * @param {any} data
 * @returns {boolean} Whether the response indicated session expiration
 */
const handleAuthResponse = (res, data) => {
  if (!res) return false;

  const is401Expired =
    res.status === 401 &&
    (data?.code === "TOKEN_EXPIRED" ||
      (typeof data?.message === "string" &&
        data.message.toLowerCase().includes("session has expired")));

  // Backward compatibility check for legacy 403 status with expired token message
  const isLegacy403Expired =
    res.status === 403 &&
    typeof data?.message === "string" &&
    data.message.toLowerCase().includes("token") &&
    data.message.toLowerCase().includes("expired");

  if (is401Expired || isLegacy403Expired) {
    handleSessionExpired();
    return true;
  }

  return false;
};

/**
 * Centralized API fetch wrapper.
 * Automatically attaches Authorization header and intercepts TOKEN_EXPIRED responses.
 *
 * @param {string} path - Relative API route (e.g. '/api/inventory') or full URL
 * @param {RequestInit} [options] - Standard fetch options
 * @returns {Promise<Response>}
 */
const apiFetch = async (path, options = {}) => {
  const url = path.startsWith("http") ? path : apiUrl(path);
  const headers = new Headers(options.headers || {});

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && !headers.has("Authorization") && !headers.has("authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Check for authentication expiration on 401 and legacy 403
  if (res.status === 401 || res.status === 403) {
    try {
      const clone = res.clone();
      const body = await clone.json();
      handleAuthResponse(res, body);
    } catch (_) {
      // Body is non-JSON or already read; let consumer handle
    }
  }

  return res;
};

const API_BASE_URL = getApiBaseUrl();

export {
  API_BASE_URL,
  apiUrl,
  getApiErrorMessage,
  getApiBaseUrl,
  handleAuthResponse,
  apiFetch,
};

