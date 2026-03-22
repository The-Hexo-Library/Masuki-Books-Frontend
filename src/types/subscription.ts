export interface SubscriptionPlan {
  subscriptionId: string;
  planName: string;
  accessPercentage: number;
  description: string;
  price: number;
  durationDays: number;
  isPlan: boolean;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startedAt?: string;
  expiresAt?: string;
  autoRenew: boolean;
}

export interface SubscriptionStatus {
  active: boolean;
  planName: string;
  accessPercentage: number;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startedAt?: string;
  expiresAt?: string;
  totalPublicBooks: number;
  usedBooks: number;
  allowedBooks: number;
  limitExceeded: boolean;
}

export interface LibraryBook {
  userLibraryId?: string;
  productId: string;
  title: string;
  author: string;
  accessType?: string;
  status?: string;
  acquiredAt?: string;
}
