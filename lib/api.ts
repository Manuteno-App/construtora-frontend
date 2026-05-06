import axios, { InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send HttpOnly cookies automatically
});

// We store the access token outside React state so interceptors can read it
// without hook restrictions. AuthProvider calls setApiAccessToken on login/refresh.
let _accessToken: string | null = null;

export function setApiAccessToken(token: string | null) {
  _accessToken = token;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (_accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

let _isRefreshing = false;
let _refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  _refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  _refreshSubscribers.forEach((cb) => cb(token));
  _refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Attempt silent refresh once on 401, except for auth endpoints themselves
    if (
      error?.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/")
    ) {
      if (_isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      try {
        const { data } = await api.post<{ accessToken: string }>("/auth/refresh");
        _accessToken = data.accessToken;
        onTokenRefreshed(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        _accessToken = null;
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(new Error("Sessão expirada. Faça login novamente."));
      } finally {
        _isRefreshing = false;
      }
    }

    const message: string =
      error?.response?.data?.message ??
      error?.message ??
      "Erro inesperado. Tente novamente.";
    return Promise.reject(new Error(message));
  },
);

export default api;

