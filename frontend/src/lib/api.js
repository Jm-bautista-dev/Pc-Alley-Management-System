const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = rawBaseUrl
  ? rawBaseUrl.replace(/\/$/, "")
  : "";

const apiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const getApiErrorMessage = (error, fallbackMessage) => {
  if (error?.name === "TypeError") {
    return "Backend server is offline. Start the backend server, then refresh this page.";
  }

  return fallbackMessage;
};

export { API_BASE_URL, apiUrl, getApiErrorMessage };
