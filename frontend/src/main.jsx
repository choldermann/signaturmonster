import React from "react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import { AppProvider } from "./AppContext.jsx"

// Globaler Fetch-Interceptor: Token anhängen + 401 → Logout
const _fetch = window.fetch.bind(window);
window.fetch = async function(resource, config = {}) {
  const token = localStorage.getItem("sm_token");
  if (token && typeof resource === "string" && resource.startsWith("/api/")) {
    config = {
      ...config,
      headers: { ...config.headers, "Authorization": `Bearer ${token}` },
    };
  }
  const response = await _fetch(resource, config);
  if (response.status === 401 && typeof resource === "string" && resource.startsWith("/api/")) {
    const path = resource.replace(/\?.*$/, "");
    // Login-Endpoint selbst nicht auslösen
    if (path !== "/api/auth/login" && path !== "/api/auth/register") {
      localStorage.removeItem("sm_token");
      localStorage.removeItem("sm_user");
      window.location.href = "/";
      return new Promise(() => {}); // blockiert den Aufrufer
    }
  }
  return response;
};

createRoot(document.getElementById("root")).render(<StrictMode><AppProvider><App /></AppProvider></StrictMode>)
