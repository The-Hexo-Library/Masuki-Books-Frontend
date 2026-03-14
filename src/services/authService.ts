import type { AppRole, AppUser } from "../types/auth";
import api, {
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearStoredToken,
  type ApiResponse,
  type StoredUser,
} from "./api";

// ── Backend auth response shape ───────────────────────────────
interface AuthResponse {
  accessToken: string;
  tokenType: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  expiresAt: string;
}

function mapRole(role: string): AppRole {
  const r = role.toLowerCase();
  if (r === "admin" || r === "superadmin" || r === "moderator") return "admin";
  return "user";
}

function toAppUser(auth: AuthResponse | StoredUser): AppUser {
  return {
    id: auth.userId,
    email: auth.email,
    fullName: `${auth.firstName} ${auth.lastName}`.trim(),
    firstName: auth.firstName,
    lastName: auth.lastName,
    role: mapRole(auth.role),
  };
}

// ── Public API ────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string
): Promise<AppUser> {
  const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/login", {
    identifier: email,
    password,
  });

  const auth = data.data;
  setStoredToken(auth.accessToken);
  setStoredUser({
    userId: auth.userId,
    email: auth.email,
    firstName: auth.firstName,
    lastName: auth.lastName,
    role: auth.role,
  });

  return toAppUser(auth);
}

export async function signUp(
  fullName: string,
  email: string,
  password: string,
  phone: string
): Promise<void> {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ") || firstName;

  await api.post<ApiResponse<AuthResponse>>("/auth/register", {
    email,
    password,
    firstName,
    lastName,
    phoneNumber: phone || undefined,
    piiConsent: true,
  });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  // Try stored user first for instant restore
  const stored = getStoredUser();
  if (stored) return toAppUser(stored);

  // Fallback: call /users/me
  try {
    const { data } = await api.get<ApiResponse<Record<string, unknown>>>("/users/me");
    const u = data.data;
    const user: AppUser = {
      id: String(u.userId ?? u.id ?? ""),
      email: String(u.email ?? ""),
      fullName: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      firstName: String(u.firstName ?? ""),
      lastName: String(u.lastName ?? ""),
      role: mapRole(String(u.role ?? "user")),
      phone: u.phoneNumber ? String(u.phoneNumber) : undefined,
    };
    setStoredUser({
      userId: user.id,
      email: user.email,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      role: String(u.role ?? "user"),
    });
    return user;
  } catch {
    // Token expired or invalid
    clearStoredToken();
    return null;
  }
}

export async function signOut(): Promise<void> {
  clearStoredToken();
}

/**
 * Auth changes subscription — for JWT we simply return a no-op.
 * The app restores state from localStorage on load.
 */
export function subscribeToAuthChanges(
  _callback: (user: AppUser | null) => void
): () => void {
  return () => undefined;
}

/** Placeholder — OTP is handled by the backend / not applicable with JWT */
export async function sendEmailOtpSupabase(_email: string): Promise<void> {
  // Backend doesn't have OTP endpoint — no-op for now
}

/** Placeholder — OTP verification */
export async function verifyEmailOtpSupabase(
  _email: string,
  _token: string
): Promise<boolean> {
  return true; // Accept any code in demo mode
}

/** Fetch user profile from backend */
export async function fetchUserProfile(): Promise<AppUser | null> {
  try {
    const { data } = await api.get<ApiResponse<Record<string, unknown>>>("/users/me");
    const u = data.data;
    return {
      id: String(u.userId ?? u.id ?? ""),
      email: String(u.email ?? ""),
      fullName: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      firstName: String(u.firstName ?? ""),
      lastName: String(u.lastName ?? ""),
      role: mapRole(String(u.role ?? "user")),
      phone: u.phoneNumber ? String(u.phoneNumber) : undefined,
    };
  } catch {
    return null;
  }
}

/** Update user profile */
export async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}): Promise<void> {
  await api.patch("/users/me", data);
}

/** Change password */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  await api.post("/users/me/change-password", { oldPassword, newPassword });
}
