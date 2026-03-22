import api, { getStoredToken, type ApiResponse, type Page } from "./api";
import type { LibraryBook, SubscriptionPlan, SubscriptionStatus } from "../types/subscription";

interface PublicLibraryRecord {
  productId: string;
  title: string;
  author: string;
}

interface PrivateLibraryRecord {
  userLibraryId: string;
  productId: string;
  title: string;
  author: string;
  accessType: string;
  status: string;
  acquiredAt: string;
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const { data } = await api.get<ApiResponse<SubscriptionPlan[]>>("/api/subscriptions/plans");
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function subscribeToPlan(subscriptionPlanId: string): Promise<SubscriptionPlan> {
  const { data } = await api.post<ApiResponse<SubscriptionPlan>>("/api/subscriptions/subscribe", {
    subscriptionPlanId
  });
  return data.data;
}

export async function fetchMySubscriptionStatus(): Promise<SubscriptionStatus | null> {
  if (!getStoredToken()) {
    return null;
  }
  try {
    const { data } = await api.get<ApiResponse<SubscriptionStatus>>("/api/subscriptions/status");
    return data.data;
  } catch {
    return null;
  }
}

export async function fetchPublicLibrary(): Promise<LibraryBook[]> {
  try {
    const { data } = await api.get<ApiResponse<PublicLibraryRecord[]>>("/api/library/public");
    return (data.data ?? []).map((item) => ({
      productId: item.productId,
      title: item.title,
      author: item.author
    }));
  } catch {
    return [];
  }
}

export async function fetchPrivateLibrary(): Promise<LibraryBook[]> {
  const { data } = await api.get<ApiResponse<Page<PrivateLibraryRecord>>>("/api/library/private", {
    params: { page: 0, size: 100 }
  });

  return (data.data.content ?? []).map((item) => ({
    userLibraryId: item.userLibraryId,
    productId: item.productId,
    title: item.title,
    author: item.author,
    accessType: item.accessType,
    status: item.status,
    acquiredAt: item.acquiredAt
  }));
}
