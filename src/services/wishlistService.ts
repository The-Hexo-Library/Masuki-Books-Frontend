import type { Book } from "../types/book";
import { isSupabaseConfigured, supabase } from "./supabase";

export interface WishlistItem {
  id: string;
  bookId: string;
  book?: Book;
}

let localWishlist: WishlistItem[] = [];

function mapBookRow(bookData: Record<string, unknown>): Book {
  return {
    id: String(bookData.id ?? ""),
    title: String(bookData.title ?? ""),
    author: String(bookData.author ?? ""),
    category: String(bookData.category ?? "General"),
    price: Number(bookData.price ?? 0),
    description: String(bookData.description ?? ""),
    coverUrl: String(bookData.cover_url ?? ""),
    language: String(bookData.language ?? "English"),
    pages: Number(bookData.pages ?? 0),
    isbn: String(bookData.isbn ?? ""),
    publisher: String(bookData.publisher ?? ""),
    stock: Number(bookData.stock ?? 999),
    ratingAvg: Number(bookData.rating_avg ?? 0),
    ratingCount: Number(bookData.rating_count ?? 0),
    isActive: bookData.is_active !== false,
    createdAt: String(bookData.created_at ?? ""),
  };
}

export async function fetchWishlist(userId: string): Promise<WishlistItem[]> {
  if (!isSupabaseConfigured || userId.startsWith("demo-")) {
    return localWishlist;
  }
  try {
    const { data, error } = await supabase
      .from("wishlist")
      .select("*, books(*)")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ""),
      bookId: String(row.book_id ?? ""),
      book: row.books ? mapBookRow(row.books as Record<string, unknown>) : undefined,
    }));
  } catch {
    return localWishlist;
  }
}

export async function addToWishlist(
  userId: string,
  bookId: string,
  book?: Book
): Promise<void> {
  if (localWishlist.find((i) => i.bookId === bookId)) return;
  const item: WishlistItem = { id: `w-${Date.now()}`, bookId, book };
  if (!isSupabaseConfigured || userId.startsWith("demo-")) {
    localWishlist.push(item);
    return;
  }
  try {
    const { error } = await supabase
      .from("wishlist")
      .insert({ user_id: userId, book_id: bookId });
    if (error) throw error;
  } catch {
    localWishlist.push(item);
  }
}

export async function removeFromWishlist(
  userId: string,
  bookId: string
): Promise<void> {
  localWishlist = localWishlist.filter((i) => i.bookId !== bookId);
  if (!isSupabaseConfigured || userId.startsWith("demo-")) return;
  try {
    await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", userId)
      .eq("book_id", bookId);
  } catch {
    // already removed from local
  }
}

export async function isInWishlist(
  userId: string,
  bookId: string
): Promise<boolean> {
  if (!isSupabaseConfigured || userId.startsWith("demo-")) {
    return localWishlist.some((i) => i.bookId === bookId);
  }
  try {
    const { data } = await supabase
      .from("wishlist")
      .select("id")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .maybeSingle();
    return !!data;
  } catch {
    return localWishlist.some((i) => i.bookId === bookId);
  }
}
