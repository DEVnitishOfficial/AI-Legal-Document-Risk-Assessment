import axios from "axios";
import { isSessionError, SESSION_EXPIRED_EVENT } from "./apiError";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// A saved token the server no longer accepts (expired, or the account is gone): drop it and
// tell the app once, so the person lands on sign-in with an explanation instead of every
// screen failing separately.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isSessionError(error) && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export default API;