import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { emitAppError } from "./errorBus";
import { isSupabaseConfigured, supabase, type SupabaseBookRow } from "./supabaseClient";

const resolvedHost =
  typeof window !== "undefined" ? window.location.hostname : "";
const isLocalHost =
  resolvedHost === "localhost" || resolvedHost === "127.0.0.1";

const DEFAULT_API_URL = isLocalHost
  ? "http://localhost:8081"
  : "https://masuki-books-backend.onrender.com";

const envApiUrl = import.meta.env.VITE_API_URL?.trim();
const RAW_API_URL =
  envApiUrl && envApiUrl.length > 0 ? envApiUrl : DEFAULT_API_URL;
const API_URL = RAW_API_URL.replace(/\/+$/, "").replace(
  /^http:\/\/(masuki-books-backend\.onrender\.com)(\/|$)/i,
  "https://$1$2"
);
const SUPABASE_BOOKS_TABLE =
  import.meta.env.VITE_SUPABASE_BOOKS_TABLE?.trim() || "books";
const ENABLE_SUPABASE_CATALOG =
  import.meta.env.VITE_ENABLE_SUPABASE_CATALOG === "true";
const SUPABASE_BOOKS_DISABLED_KEY = "masuki_supabase_books_disabled";

const READ_CACHE_TTL_MS = 45_000;

/** Dispatched after 401 so React auth state can reset without importing the hook from here. */
export const SESSION_INVALID_EVENT = "masuki:session-invalid";

export class ApiError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

type MetaConfig = InternalAxiosRequestConfig & {
  metadata?: { rid: string; t0: number };
  __retryCount?: number;
};

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

const TOKEN_KEY = "masuki_access_token";
const USER_KEY = "masuki_user";

/** After a 401 storm, block authenticated routes until the user signs in again. */
let authSessionInvalidated = false;

export function resetAuthSessionGate(): void {
  authSessionInvalidated = false;
}

export function isAuthSessionGateActive(): boolean {
  return authSessionInvalidated;
}

const ttlCache = new Map<string, { exp: number; data: unknown }>();

function ttlGet<T>(key: string): T | undefined {
  const e = ttlCache.get(key);
  if (!e || Date.now() > e.exp) {
    ttlCache.delete(key);
    return undefined;
  }
  return e.data as T;
}

function ttlSet(key: string, data: unknown, ttlMs: number): void {
  ttlCache.set(key, { exp: Date.now() + ttlMs, data });
}

/** Clears TTL cache and in-flight dedupe map (call after mutations). */
export function invalidateReadableCaches(): void {
  ttlCache.clear();
  const g = globalThis as unknown as { __masukiDedupe?: Map<string, Promise<unknown>> };
  g.__masukiDedupe?.clear();
}

/** @internal Vitest */
export function __testClearCaches(): void {
  invalidateReadableCaches();
  try {
    localStorage.removeItem(SUPABASE_BOOKS_DISABLED_KEY);
  } catch {
    /* ignore */
  }
}

function isSupabaseBooksFetchDisabled(): boolean {
  const g = globalThis as unknown as { __masukiSkipSupabaseBooks?: boolean };
  if (g.__masukiSkipSupabaseBooks) return true;
  try {
    return localStorage.getItem(SUPABASE_BOOKS_DISABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function disableSupabaseBooksFetch(): void {
  const g = globalThis as unknown as { __masukiSkipSupabaseBooks?: boolean };
  g.__masukiSkipSupabaseBooks = true;
  try {
    localStorage.setItem(SUPABASE_BOOKS_DISABLED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    // Clear legacy persistence to avoid auto-login across fresh runs.
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

export interface StoredUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  try {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    // Clear legacy persistence to avoid auto-login across fresh runs.
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

function allowRequestWhileSessionInvalidated(config: MetaConfig): boolean {
  const url = config.url ?? "";
  const m = (config.method ?? "get").toLowerCase();
  if (url.includes("/auth/login") || url.includes("/auth/register")) return true;
  if (url.includes("/auth/admin/login")) return true;
  if (url.includes("/api/library/public") && m === "get") return true;
  if (url.includes("/api/subscriptions/plans") && m === "get") return true;
  return false;
}

function notifySessionInvalid(source: string): void {
  authSessionInvalidated = true;
  clearStoredToken();
  emitAppError({
    topic: "auth",
    message: "Session expired or unauthorized. Please sign in again.",
    cause: source,
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_INVALID_EVENT));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetryAxiosError(error: AxiosError): boolean {
  const status = error.response?.status;
  if (status === 401 || status === 403) return false;
  if (status != null && status >= 400 && status < 500) return false;
  if (status != null && status >= 500) return true;
  const code = error.code;
  if (code === "ECONNABORTED" || code === "ERR_NETWORK") return true;
  if (!error.response && error.message === "Network Error") return true;
  return false;
}

function summarizePayload(config: MetaConfig): string | undefined {
  try {
    const d = config.data;
    if (d == null) return undefined;
    if (typeof d === "string") return `len=${d.length}`;
    return JSON.stringify(d).slice(0, 200);
  } catch {
    return undefined;
  }
}

api.interceptors.request.use((config) => {
  const c = config as MetaConfig;
  if (authSessionInvalidated && !allowRequestWhileSessionInvalidated(c)) {
    return Promise.reject(
      new ApiError("Session expired. Please sign in again.", "SESSION_EXPIRED")
    );
  }

  const rid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `rid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  c.metadata = { rid, t0: typeof performance !== "undefined" ? performance.now() : 0 };
  c.headers.set("X-Request-Id", rid);

  const token = getStoredToken();
  if (token) {
    c.headers.Authorization = `Bearer ${token}`;
  }

  // Allow browser/XHR to set multipart boundaries for FormData payloads.
  if (typeof FormData !== "undefined" && c.data instanceof FormData) {
    c.headers.delete("Content-Type");
  }

  return c;
});

function isApiEnvelope(body: unknown): body is ApiResponse<unknown> {
  return (
    body !== null &&
    typeof body === "object" &&
    "success" in body &&
    typeof (body as ApiResponse<unknown>).success === "boolean"
  );
}

function formatEnvelopeError(body: ApiResponse<unknown>): string {
  const base = body.message?.trim() || "Request failed";
  const payload = body.data;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const entries = Object.entries(payload as Record<string, unknown>)
      .filter(([, v]) => typeof v === "string" && String(v).trim().length > 0)
      .map(([k, v]) => `${k}: ${String(v).trim()}`);
    if (entries.length > 0) return `${base} (${entries.join(", ")})`;
  }
  return base;
}

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<ApiResponse<unknown>>;
    const body = ax.response?.data;
    if (isApiEnvelope(body)) return formatEnvelopeError(body);
    if (body && typeof body === "object" && "message" in body) {
      const m = (body as { message?: string }).message;
      if (m) return m;
    }
    return ax.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Validates Masuki `ApiResponse<T>` bodies. Call after a successful HTTP status.
 */
export function unwrapApiResponse<T>(body: unknown): T {
  if (!isApiEnvelope(body)) {
    throw new ApiError("Invalid API response envelope", "INVALID_ENVELOPE");
  }
  if (body.success !== true) {
    throw new ApiError(body.message ?? "Request failed", "API_UNSUCCESSFUL");
  }
  return body.data as T;
}

function assertSuccessFromAxiosData(data: unknown): void {
  if (isApiEnvelope(data) && data.success !== true) {
    throw new ApiError(formatEnvelopeError(data), "API_UNSUCCESSFUL");
  }
}

api.interceptors.response.use(
  (response: AxiosResponse) => {
    assertSuccessFromAxiosData(response.data);
    const c = response.config as MetaConfig;
    const m = c.metadata;
    if (m && typeof performance !== "undefined") {
      const ms = (performance.now() - m.t0).toFixed(0);
      console.info(
        `[api] ${(c.method ?? "?").toUpperCase()} ${c.baseURL ?? ""}${c.url ?? ""} ${ms}ms rid=${m.rid}`
      );
    }
    return response;
  },
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const ax = error as AxiosError<ApiResponse<unknown>>;
      const cfg = ax.config as MetaConfig | undefined;
      const rid = cfg?.metadata?.rid;
      const endpoint = cfg ? `${cfg.baseURL ?? ""}${cfg.url ?? ""}` : undefined;
      const method = cfg?.method?.toUpperCase();

      if (shouldRetryAxiosError(ax) && cfg) {
        const n = cfg.__retryCount ?? 0;
        if (n < 2) {
          cfg.__retryCount = n + 1;
          const backoff = 100 * 2 ** cfg.__retryCount;
          await sleep(backoff);
          return api.request(cfg);
        }
      }

      if (ax.response?.status === 401) {
        notifySessionInvalid("401");
      } else {
        emitAppError({
          topic: "api",
          message: extractErrorMessage(error),
          endpoint,
          method,
          requestId: rid,
          payloadSummary: cfg ? summarizePayload(cfg) : undefined,
        });
      }
    }

    return Promise.reject(
      error instanceof ApiError
        ? error
        : new Error(extractErrorMessage(error))
    );
  }
);

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface PagedResult<T> {
  content: T[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
}

function normalizeSpringPage<T>(page: SpringPage<T>): PagedResult<T> {
  return {
    content: Array.isArray(page.content) ? page.content : [],
    page: page.number ?? 0,
    size: page.size ?? 0,
    totalPages: page.totalPages ?? 0,
    totalElements: page.totalElements ?? 0,
    first: page.first ?? true,
    last: page.last ?? true,
  };
}

export interface PublicLibraryRow {
  publicLibraryId?: string;
  productId: string;
  title: string;
  author: string;
  fileUrl?: string;
  visibility?: string;
  isFeatured?: boolean;
  notes?: string;
  editable?: boolean;
  categoryName?: string;
  price?: number;
}

export interface LibraryRow {
  userLibraryId?: string;
  productId: string;
  title: string;
  author: string;
  coverImageUrl?: string;
  fileUrl?: string;
  fileFormat?: string;
  accessType?: string;
  acquiredAt?: string;
  expiresAt?: string;
  status?: string;
  currentPage?: number;
  totalPages?: number;
  readingPercentage?: number;
  lastReadAt?: string;
}

export interface CartItemRow {
  cartItemId: string;
  productId: string;
  productTitle: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  inStock: boolean;
}

export interface CartRow {
  cartId: string;
  items: CartItemRow[];
  subtotal: number;
  totalItems: number;
}

export interface CategoryRow {
  categoryId: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
  bookCount?: number;
}

/**
 * Backend issues a single JWT (`accessToken`). There is no refresh-token endpoint
 * in the reference API; expiry is handled via 401 + session gate + re-login.
 */
export interface AuthPayload {
  accessToken: string;
  tokenType: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  expiresAt?: string;
}

export interface ProductRow {
  productId: string;
  categoryId?: string;
  categoryName?: string;
  sku?: string;
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  description?: string;
  language?: string;
  format?: string;
  pages?: number;
  publicationDate?: string;
  price?: number;
  compareAtPrice?: number;
  status?: string;
  stockQuantity?: number;
  inStock?: boolean;
  averageRating?: number;
  imageUrls?: string[];
  createdAt?: string;
  contentType?: string;
  fileKey?: string;
  fileUrl?: string;
  fileFormat?: string;
  fileSizeBytes?: number;
  totalPages?: number;
  previewPages?: number;
  downloadable?: boolean;
  maxDownloads?: number;
}

export interface SubscriptionPlanRow {
  subscriptionId: string;
  planName: string;
  accessPercentage?: number;
  description?: string;
  price: number;
  durationDays?: number;
  isPlan?: boolean;
  status?: string;
  startedAt?: string;
  expiresAt?: string;
  autoRenew?: boolean;
}

export interface AdminOrderRow {
  orderId: string;
  orderNumber?: string;
  status?: string;
  orderType?: string;
  totalAmount?: number;
  currency?: string;
  createdAt?: string;
  guestEmail?: string;
  userId?: string;
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
  userName?: string;
  user?: {
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  items?: Array<{
    orderItemId?: string;
    productId?: string;
    productTitle?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
  }>;
}

export interface SubscriptionStatusRow {
  active: boolean;
  planName?: string;
  accessPercentage?: number;
  status?: string;
  startedAt?: string;
  expiresAt?: string;
  totalPublicBooks?: number;
  usedBooks?: number;
  allowedBooks?: number;
  limitExceeded?: boolean;
}

/** Deduplicate concurrent identical work (short-lived). Exported for tests. */
export function dedupeRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const g = globalThis as unknown as { __masukiDedupe?: Map<string, Promise<unknown>> };
  if (!g.__masukiDedupe) g.__masukiDedupe = new Map();
  const map = g.__masukiDedupe;
  const existing = map.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = factory().finally(() => {
    map.delete(key);
  });
  map.set(key, p);
  return p;
}

export async function postRegister(body: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  piiConsent?: boolean;
}): Promise<AuthPayload> {
  try {
    const { data } = await api.post<ApiResponse<AuthPayload>>("/auth/register", {
      ...body,
      piiConsent: body.piiConsent ?? true,
    });
    const auth = unwrapApiResponse<AuthPayload>(data);
    invalidateReadableCaches();
    return auth;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function postLogin(
  identifier: string,
  password: string
): Promise<AuthPayload> {
  try {
    const { data } = await api.post<ApiResponse<AuthPayload>>("/auth/login", {
      identifier: identifier.trim(),
      password,
    });
    const auth = unwrapApiResponse<AuthPayload>(data);
    resetAuthSessionGate();
    return auth;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function postAdminLogin(
  identifier: string,
  password: string
): Promise<AuthPayload> {
  try {
    const { data } = await api.post<ApiResponse<AuthPayload>>(
      "/auth/admin/login",
      { identifier: identifier.trim(), password }
    );
    const auth = unwrapApiResponse<AuthPayload>(data);
    resetAuthSessionGate();
    return auth;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getPublicLibrary(): Promise<PublicLibraryRow[]> {
  const cacheKey = "GET:/api/library/public";
  const hit = ttlGet<PublicLibraryRow[]>(cacheKey);
  if (hit) return hit;

  try {
    return dedupeRequest(cacheKey, async () => {
      const { data } = await api.get<ApiResponse<PublicLibraryRow[]>>(
        "/api/library/public"
      );
      const list = unwrapApiResponse<PublicLibraryRow[]>(data);
      const out = Array.isArray(list) ? list : [];
      ttlSet(cacheKey, out, READ_CACHE_TTL_MS);
      return out;
    });
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

async function fetchSupabaseBooks(): Promise<SupabaseBookRow[]> {
  if (!ENABLE_SUPABASE_CATALOG) return [];
  if (!isSupabaseConfigured) return [];
  if (isSupabaseBooksFetchDisabled()) {
    return [];
  }
  try {
    const { data, error } = await supabase
      .from(SUPABASE_BOOKS_TABLE)
      .select("id,title,author,file_url,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SupabaseBookRow[];
  } catch (e) {
    const msg = extractErrorMessage(e);
    if (
      msg.includes("Could not find the table") ||
      msg.includes("relation") && msg.includes("does not exist")
    ) {
      disableSupabaseBooksFetch();
      console.warn(
        `[catalog] Supabase table \"${SUPABASE_BOOKS_TABLE}\" not found; falling back to backend catalog only.`
      );
      return [];
    }
    console.warn("[catalog] Supabase books fetch failed:", extractErrorMessage(e));
    return [];
  }
}

function stableProductId(row: PublicLibraryRow): string {
  return String(row.productId ?? "").trim() || "";
}

export async function fetchMergedPublicCatalog(opts?: {
  skipCache?: boolean;
}): Promise<PublicLibraryRow[]> {
  const cacheKey = "merged:catalog:v2";
  if (!opts?.skipCache) {
    const hit = ttlGet<PublicLibraryRow[]>(cacheKey);
    if (hit) return hit;
  }

  try {
    return dedupeRequest(cacheKey, async () => {
      const backendRows = await getPublicLibrary().catch(
        () => [] as PublicLibraryRow[]
      );
      const supabaseRows = await fetchSupabaseBooks();

      const fromSupabase: PublicLibraryRow[] = supabaseRows.map((row) => ({
        productId: row.id,
        title: row.title ?? "",
        author: row.author ?? "",
        fileUrl: row.file_url,
      }));

      const merged = new Map<string, PublicLibraryRow>();

      for (const b of backendRows) {
        const id = stableProductId(b);
        if (!id) continue;
        merged.set(id, { ...b, productId: id });
      }

      for (const s of fromSupabase) {
        const id = stableProductId(s);
        if (!id) continue;
        const existing = merged.get(id);
        if (!existing) {
          merged.set(id, { ...s, productId: id });
          continue;
        }

        const existingFileUrl = String(existing.fileUrl ?? "").trim();
        const supabaseFileUrl = String(s.fileUrl ?? "").trim();

        merged.set(id, {
          ...existing,
          // Preserve backend fields, but fill gaps with Supabase catalog values.
          title: existing.title || s.title,
          author: existing.author || s.author,
          fileUrl: existingFileUrl || supabaseFileUrl || existing.fileUrl,
        });
      }

      const out = Array.from(merged.values());
      ttlSet(cacheKey, out, READ_CACHE_TTL_MS);
      return out;
    });
  } catch (e) {
    console.warn("[catalog] merge failed:", extractErrorMessage(e));
    return [];
  }
}

export async function getUserLibraryPaged(
  page = 0,
  size = 20
): Promise<PagedResult<LibraryRow>> {
  try {
    const { data } = await api.get<ApiResponse<SpringPage<LibraryRow>>>(
      "/user/library",
      { params: { page, size } }
    );
    const spring = unwrapApiResponse<SpringPage<LibraryRow>>(data);
    return normalizeSpringPage(spring);
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getUserLibraryPage(
  page = 0,
  size = 20
): Promise<LibraryRow[]> {
  const p = await getUserLibraryPaged(page, size);
  return p.content;
}

export async function getCart(): Promise<CartRow | null> {
  try {
    const { data } = await api.get<ApiResponse<CartRow>>("/user/cart");
    return unwrapApiResponse<CartRow>(data);
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function addCartItem(
  productId: string,
  quantity = 1
): Promise<CartRow> {
  try {
    const { data } = await api.post<ApiResponse<CartRow>>("/user/cart/items", {
      productId,
      quantity,
    });
    const cart = unwrapApiResponse<CartRow>(data);
    invalidateReadableCaches();
    return cart;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
): Promise<CartRow> {
  try {
    const { data } = await api.put<ApiResponse<CartRow>>(
      `/user/cart/items/${cartItemId}`,
      { quantity }
    );
    const cart = unwrapApiResponse<CartRow>(data);
    invalidateReadableCaches();
    return cart;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function removeCartItem(cartItemId: string): Promise<CartRow> {
  try {
    const { data } = await api.delete<ApiResponse<CartRow>>(
      `/user/cart/items/${cartItemId}`
    );
    const cart = unwrapApiResponse<CartRow>(data);
    invalidateReadableCaches();
    return cart;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export type CheckoutSessionResult = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
};

type CheckoutFlowPayload = {
  publishableKey?: string;
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
};

function parseCheckoutSessionResult(data: unknown): CheckoutSessionResult {
  const result = unwrapApiResponse<CheckoutFlowPayload>(data);
  return {
    keyId: result?.publishableKey ?? "",
    razorpayOrderId: result?.razorpayOrderId ?? "",
    amount: result?.amount ?? 0,
    currency: result?.currency ?? "INR",
  };
}

export async function verifyRazorpayCheckout(body: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<void> {
  try {
    await api.post<ApiResponse<unknown>>("/user/checkout/verify", body);
    invalidateReadableCaches();
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function postCheckout(body: {
  gateway: string;
  paymentMethod: string;
  currency?: string;
  discountCode?: string;
}): Promise<CheckoutSessionResult> {
  try {
    const { data } = await api.post<ApiResponse<CheckoutFlowPayload>>("/user/checkout", body);
    const checkoutResponse = parseCheckoutSessionResult(data);
    invalidateReadableCaches();
    return checkoutResponse;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function postPublicCheckout(body: {
  gateway: string;
  paymentMethod: string;
  currency?: string;
  discountCode?: string;
  items: Array<{ productId: string; quantity: number }>;
}): Promise<CheckoutSessionResult> {
  try {
    const { data } = await api.post<ApiResponse<CheckoutFlowPayload>>("/public/checkout", body);
    const checkoutResponse = parseCheckoutSessionResult(data);
    invalidateReadableCaches();
    return checkoutResponse;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getSubscriptionPlansPublic(): Promise<SubscriptionPlanRow[]> {
  const cacheKey = "GET:/api/subscriptions/plans";
  const hit = ttlGet<SubscriptionPlanRow[]>(cacheKey);
  if (hit) return hit;

  try {
    return dedupeRequest(cacheKey, async () => {
      const { data } = await api.get<ApiResponse<SubscriptionPlanRow[]>>(
        "/api/subscriptions/plans"
      );
      const list = unwrapApiResponse<SubscriptionPlanRow[]>(data);
      const out = Array.isArray(list) ? list : [];
      ttlSet(cacheKey, out, READ_CACHE_TTL_MS);
      return out;
    });
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getMySubscriptionStatus(): Promise<SubscriptionStatusRow> {
  try {
    const { data } = await api.get<ApiResponse<SubscriptionStatusRow>>(
      "/api/subscriptions/status"
    );
    return unwrapApiResponse<SubscriptionStatusRow>(data);
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function postSubscribe(
  planId: string
): Promise<SubscriptionPlanRow> {
  try {
    const { data } = await api.post<ApiResponse<SubscriptionPlanRow>>(
      "/api/subscriptions/subscribe",
      { subscriptionPlanId: planId }
    );
    const row = unwrapApiResponse<SubscriptionPlanRow>(data);
    invalidateReadableCaches();
    return row;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function activateUserSubscription(
  planId: string
): Promise<SubscriptionPlanRow> {
  try {
    const { data } = await api.post<ApiResponse<SubscriptionPlanRow>>(
      "/user/subscriptions/activate",
      { subscriptionPlanId: planId }
    );
    const row = unwrapApiResponse<SubscriptionPlanRow>(data);
    invalidateReadableCaches();
    return row;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getAdminBooksPaged(
  page = 0,
  size = 50,
  status?: string
): Promise<PagedResult<ProductRow>> {
  try {
    const { data } = await api.get<ApiResponse<SpringPage<ProductRow>>>(
      "/admin/books",
      { params: { page, size, status } }
    );
    const spring = unwrapApiResponse<SpringPage<ProductRow>>(data);
    return normalizeSpringPage(spring);
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getUserCategories(): Promise<CategoryRow[]> {
  const role = getStoredUser()?.role?.toUpperCase();
  const isAdmin = role === "ADMIN";
  const endpoint = isAdmin ? "/admin/categories/with-books" : "/user/categories";
  const cacheKey = isAdmin ? "GET:/admin/categories/with-books" : "GET:/user/categories";
  const hit = ttlGet<CategoryRow[]>(cacheKey);
  if (hit) return hit;

  try {
    return dedupeRequest(cacheKey, async () => {
      const { data } = await api.get<ApiResponse<CategoryRow[]>>(endpoint);
      const out = unwrapApiResponse<CategoryRow[]>(data) ?? [];
      ttlSet(cacheKey, out, READ_CACHE_TTL_MS);
      return out;
    });
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getAdminCategories(): Promise<CategoryRow[]> {
  const cacheKey = "GET:/admin/categories/with-books";
  const hit = ttlGet<CategoryRow[]>(cacheKey);
  if (hit) return hit;

  try {
    return dedupeRequest(cacheKey, async () => {
      const { data } = await api.get<ApiResponse<CategoryRow[]>>("/admin/categories/with-books");
      const out = unwrapApiResponse<CategoryRow[]>(data) ?? [];
      ttlSet(cacheKey, out, READ_CACHE_TTL_MS);
      return out;
    });
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function createAdminBook(body: {
  categoryId: string;
  title: string;
  author: string;
  sku: string;
  format: string;
  price: number;
  contentType?: string;
  status?: string;
  description?: string;
  fileUrl?: string;
  fileFormat?: string;
  downloadable?: boolean;
}): Promise<ProductRow> {
  try {
    const { data } = await api.post<ApiResponse<ProductRow>>("/admin/books", {
      ...body,
      contentType: body.contentType ?? "digital",
      status: body.status ?? "published",
    });
    const row = unwrapApiResponse<ProductRow>(data);
    invalidateReadableCaches();
    return row;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function uploadAdminBookFile(
  bookId: string,
  file: File
): Promise<ProductRow> {
  try {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<ApiResponse<ProductRow>>(
      `/admin/books/${bookId}/file`,
      form
    );
    const row = unwrapApiResponse<ProductRow>(data);
    invalidateReadableCaches();
    return row;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function updateAdminBook(
  bookId: string,
  body: {
    categoryId: string;
    title: string;
    author: string;
    sku: string;
    format: string;
    price: number;
    contentType?: string;
    status?: string;
    description?: string;
  }
): Promise<ProductRow> {
  try {
    const { data } = await api.put<ApiResponse<ProductRow>>(
      `/admin/books/${bookId}`,
      {
        ...body,
        contentType: body.contentType ?? "digital",
        status: body.status ?? "published",
      }
    );
    const row = unwrapApiResponse<ProductRow>(data);
    invalidateReadableCaches();
    return row;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function createAdminCategory(body: {
  name: string;
  slug: string;
  description?: string;
  collections?: string;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<CategoryRow> {
  try {
    const { data } = await api.post<ApiResponse<CategoryRow>>("/admin/categories", {
      ...body,
      displayOrder: body.displayOrder ?? 0,
      isActive: body.isActive ?? true,
    });
    const out = unwrapApiResponse<CategoryRow>(data);
    invalidateReadableCaches();
    return out;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function updateAdminCategory(
  categoryId: string,
  updates: Partial<{
    name: string;
    slug: string;
    description: string;
    collections: string;
    displayOrder: number;
    isActive: boolean;
  }>
): Promise<CategoryRow> {
  try {
    const { data } = await api.put<ApiResponse<CategoryRow>>(
      `/admin/categories/${categoryId}`,
      updates
    );
    const out = unwrapApiResponse<CategoryRow>(data);
    invalidateReadableCaches();
    return out;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function deleteAdminCategory(categoryId: string): Promise<void> {
  try {
    await api.delete<ApiResponse<unknown>>(`/admin/categories/${categoryId}`);
    invalidateReadableCaches();
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getAdminOrdersPaged(
  page = 0,
  size = 20,
  status?: string
): Promise<PagedResult<AdminOrderRow>> {
  try {
    const { data } = await api.get<ApiResponse<SpringPage<AdminOrderRow>>>(
      "/admin/orders",
      { params: { page, size, status } }
    );
    const spring = unwrapApiResponse<SpringPage<AdminOrderRow>>(data);
    return normalizeSpringPage(spring);
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function updateAdminOrderStatus(
  orderId: string,
  status: string
): Promise<AdminOrderRow> {
  try {
    const { data } = await api.patch<ApiResponse<AdminOrderRow>>(
      `/admin/orders/${orderId}/status`,
      { status }
    );
    const row = unwrapApiResponse<AdminOrderRow>(data);
    invalidateReadableCaches();
    return row;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getAdminPublicLibrary(): Promise<PublicLibraryRow[]> {
  try {
    const { data } = await api.get<ApiResponse<PublicLibraryRow[]>>(
      "/admin/public-library"
    );
    return unwrapApiResponse<PublicLibraryRow[]>(data) ?? [];
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function upsertAdminPublicLibrary(body: {
  productId: string;
  isFeatured?: boolean;
  visibility?: string;
  notes?: string;
  editable?: boolean;
}): Promise<PublicLibraryRow> {
  try {
    const { data } = await api.post<ApiResponse<PublicLibraryRow>>(
      "/admin/public-library",
      {
        ...body,
        visibility: body.visibility ?? "PUBLIC",
        editable: body.editable ?? true,
      }
    );
    const row = unwrapApiResponse<PublicLibraryRow>(data);
    invalidateReadableCaches();
    return row;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function deleteAdminPublicLibrary(
  publicLibraryId: string
): Promise<void> {
  try {
    await api.delete<ApiResponse<unknown>>(
      `/admin/public-library/${publicLibraryId}`
    );
    invalidateReadableCaches();
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function createAdminSubscriptionPlan(body: {
  planName: string;
  description?: string;
  price: number;
  durationDays: number;
  autoRenew?: boolean;
}): Promise<SubscriptionPlanRow> {
  try {
    const { data } = await api.post<ApiResponse<SubscriptionPlanRow>>(
      "/admin/subscriptions/plans",
      {
        ...body,
        autoRenew: body.autoRenew ?? false,
      }
    );
    const row = unwrapApiResponse<SubscriptionPlanRow>(data);
    invalidateReadableCaches();
    return row;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function deleteAdminBook(bookId: string): Promise<void> {
  try {
    await api.delete<ApiResponse<unknown>>(`/admin/books/${bookId}`);
    invalidateReadableCaches();
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getAdminBooksPage(
  page = 0,
  size = 50,
  status?: string
): Promise<ProductRow[]> {
  const p = await getAdminBooksPaged(page, size, status);
  return p.content;
}

export async function getPublicCategories(): Promise<CategoryRow[]> {
  const cacheKey = "publicCategories";
  const cached = ttlGet<CategoryRow[]>(cacheKey);
  if (cached) return cached;

  const { data } = await api.get("/api/categories");
  const body = data as ApiResponse<CategoryRow[]>;
  const result = body?.data ?? [];
  ttlSet(cacheKey, result, READ_CACHE_TTL_MS);
  return result;
}

export async function searchPublicLibrary(query: string): Promise<PublicLibraryRow[]> {
  const { data } = await api.get("/api/library/public/search", {
    params: { q: query },
  });
  const body = data as ApiResponse<PublicLibraryRow[]>;
  return body?.data ?? [];
}

// --- Contact Form ---

export interface ContactFormBody {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactSubmissionRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  adminReply?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function postContactForm(body: ContactFormBody): Promise<ContactSubmissionRow> {
  try {
    const { data } = await api.post<ApiResponse<ContactSubmissionRow>>("/api/contact", body);
    return unwrapApiResponse<ContactSubmissionRow>(data);
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getAdminContactSubmissions(): Promise<ContactSubmissionRow[]> {
  try {
    const { data } = await api.get<ApiResponse<ContactSubmissionRow[]>>("/admin/contact-submissions");
    return unwrapApiResponse<ContactSubmissionRow[]>(data) ?? [];
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function postAdminContactReply(body: {
  contactSubmissionId: string;
  replyMessage: string;
}): Promise<ContactSubmissionRow> {
  try {
    const { data } = await api.post<ApiResponse<ContactSubmissionRow>>("/admin/contact-submissions/reply", body);
    const row = unwrapApiResponse<ContactSubmissionRow>(data);
    invalidateReadableCaches();
    return row;
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getMyContactSubmissions(): Promise<ContactSubmissionRow[]> {
  try {
    const { data } = await api.get<ApiResponse<ContactSubmissionRow[]>>("/api/contact/my-submissions");
    return unwrapApiResponse<ContactSubmissionRow[]>(data) ?? [];
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

// --- Notifications ---

export interface NotificationRow {
  id: string;
  recipientUserId?: string;
  recipientRole: string;
  type: string;
  title: string;
  message: string;
  referenceId?: string;
  isRead: boolean;
  createdAt?: string;
}

export async function getNotifications(): Promise<NotificationRow[]> {
  try {
    const { data } = await api.get<ApiResponse<NotificationRow[]>>("/api/notifications");
    return unwrapApiResponse<NotificationRow[]>(data) ?? [];
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { data } = await api.get<ApiResponse<{ count: number }>>("/api/notifications/unread-count");
    const result = unwrapApiResponse<{ count: number }>(data);
    return result?.count ?? 0;
  } catch (e) {
    // Don't throw for poll failures
    return 0;
  }
}

export async function markNotificationRead(notificationId: string): Promise<NotificationRow> {
  try {
    const { data } = await api.patch<ApiResponse<NotificationRow>>(`/api/notifications/${notificationId}/read`);
    return unwrapApiResponse<NotificationRow>(data);
  } catch (e) {
    throw e instanceof ApiError ? e : new Error(extractErrorMessage(e));
  }
}

export { API_URL };
export default api;

