import axios from "axios";
import { accessToken, endSession } from "./auth-session";

function isApi(input: string) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base || typeof window === "undefined") return false;
  const api = new URL(base, window.location.origin);
  const url = new URL(input, window.location.origin);
  return url.origin === api.origin && (url.pathname === api.pathname || url.pathname.startsWith(api.pathname.replace(/\/$/, "") + "/"));
}
export async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = input instanceof Request ? input.url : String(input);
  if (!isApi(url) || url.includes("/auth/config/")) return fetch(input, init);
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  const token = await accessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else headers.delete("Authorization");
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) endSession();
  return response;
}
// Legacy helpers use default axios. Replace caller-provided bearer headers after refresh.
let installed = false;
export function installAxiosAuth() {
  if (installed) return;
  installed = true;
  axios.interceptors.request.use(async config => {
    const url = config.baseURL ? new URL(config.url || "", config.baseURL).href : config.url || "";
    if (isApi(url) && !url.includes("/auth/config/")) {
      const token = await accessToken();
      if (token) config.headers.set("Authorization", `Bearer ${token}`);
      else config.headers.delete("Authorization");
    }
    return config;
  });
  axios.interceptors.response.use(response => response, error => {
    if (error.response?.status === 401 && isApi(error.config?.url || "")) endSession();
    return Promise.reject(error);
  });
}
