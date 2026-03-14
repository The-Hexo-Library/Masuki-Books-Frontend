import type { Review } from "../types/book";
import api, { type ApiResponse, type Page } from "./api";

// ── Backend review shape ──────────────────────────────────────
interface ReviewEntity {
  reviewId: string;
  product?: { productId: string };
  user?: { userId: string; firstName: string; lastName: string };
  order?: { orderId: string };
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  createdAt: string;
}

function mapReview(r: ReviewEntity): Review {
  return {
    id: r.reviewId ?? "",
    userId: r.user?.userId ?? "",
    bookId: r.product?.productId ?? "",
    rating: r.rating ?? 0,
    comment: r.body ?? "",
    title: r.title ?? undefined,
    isApproved: r.status === "approved",
    status: r.status,
    createdAt: r.createdAt ?? "",
    userName: r.user
      ? `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || "Anonymous"
      : "Anonymous",
  };
}

// ── Public API ────────────────────────────────────────────────

export async function fetchReviewsForBook(bookId: string): Promise<Review[]> {
  try {
    const { data } = await api.get<ApiResponse<Page<ReviewEntity>>>(
      `/reviews/product/${bookId}`,
      { params: { size: 50 } }
    );
    return (data.data.content ?? []).map(mapReview);
  } catch (err) {
    console.warn("Reviews fetch error:", err);
    return [];
  }
}

export async function fetchAllReviews(): Promise<Review[]> {
  try {
    const { data } = await api.get<ApiResponse<Page<ReviewEntity>>>(
      "/admin/reviews/pending",
      { params: { size: 100 } }
    );
    return (data.data.content ?? []).map(mapReview);
  } catch (err) {
    console.warn("All reviews fetch error:", err);
    return [];
  }
}

export async function createReview(
  _userId: string,
  bookId: string,
  rating: number,
  comment: string
): Promise<Review> {
  try {
    const { data } = await api.post<ApiResponse<ReviewEntity>>("/reviews", {
      productId: bookId,
      orderId: "00000000-0000-0000-0000-000000000000", // placeholder
      rating,
      title: "",
      body: comment,
    });
    return mapReview(data.data);
  } catch {
    // Return a local review if backend fails
    return {
      id: `rev-${Date.now()}`,
      userId: _userId,
      bookId,
      rating,
      comment,
      isApproved: true,
      createdAt: new Date().toISOString(),
    };
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  try {
    await api.delete(`/reviews/${reviewId}`);
  } catch (err) {
    console.warn("Delete review error:", err);
  }
}

export async function toggleReviewApproval(
  reviewId: string,
  isApproved: boolean
): Promise<void> {
  try {
    await api.patch(`/admin/reviews/${reviewId}/moderate`, {
      status: isApproved ? "approved" : "rejected",
    });
  } catch (err) {
    console.warn("Toggle review approval error:", err);
  }
}
