export type AppRole = "user" | "admin";

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  role: AppRole;
  phone?: string;
  avatarUrl?: string;
}
