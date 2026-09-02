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

export { API_BASE_URL, apiUrl, getApiErrorMessage };
