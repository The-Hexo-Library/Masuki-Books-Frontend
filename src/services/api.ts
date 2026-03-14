import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8081/api/v1";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Token helpers ──────────────────────────────────────────────
const TOKEN_KEY = "masuki_access_token";
const USER_KEY = "masuki_user";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export interface StoredUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

// ── Request interceptor — attach JWT ───────────────────────────
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — unwrap ApiResponse ──────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { message?: string } | undefined;
      const msg = data?.message ?? error.message;
      return Promise.reject(new Error(msg));
    }
    return Promise.reject(error);
  }
);

// ── Generic helpers ────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export default api;
