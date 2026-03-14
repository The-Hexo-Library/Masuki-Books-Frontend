import type { Book, BookInput } from "../types/book";
import api, { type ApiResponse, type Page } from "./api";

// ── Backend response shape ────────────────────────────────────
interface ProductResponse {
  productId: string;
  categoryId: string;
  categoryName: string;
  sku: string;
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  description: string;
  language: string;
  format: string;
  pages: number;
  publicationDate: string;
  price: number;
  compareAtPrice: number | null;
  status: string;
  stockQuantity: number;
  inStock: boolean;
  averageRating: number;
  imageUrls: string[];
  createdAt: string;
}

function mapProductToBook(p: ProductResponse): Book {
  return {
    id: p.productId,
    title: p.title ?? "",
    author: p.author ?? "",
    category: p.categoryName ?? "General",
    categoryId: p.categoryId,
    price: p.price ?? 0,
    description: p.description ?? "",
    coverUrl: p.imageUrls?.[0] ?? "",
    language: p.language ?? "English",
    pages: p.pages ?? 0,
    isbn: p.isbn ?? "",
    publisher: p.publisher ?? "",
    stock: p.stockQuantity ?? 0,
    ratingAvg: p.averageRating ?? 0,
    ratingCount: 0,
    isActive: p.status === "active",
    createdAt: p.createdAt ?? "",
    format: p.format,
    compareAtPrice: p.compareAtPrice ?? undefined,
    sku: p.sku,
    imageUrls: p.imageUrls,
  };
}

// ── Public API ────────────────────────────────────────────────

export async function fetchBooks(params?: {
  keyword?: string;
  categoryId?: string;
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  size?: number;
}): Promise<Book[]> {
  try {
    const { data } = await api.get<ApiResponse<Page<ProductResponse>>>("/products", {
      params: {
        keyword: params?.keyword || undefined,
        categoryId: params?.categoryId || undefined,
        language: params?.language || undefined,
        minPrice: params?.minPrice ?? undefined,
        maxPrice: params?.maxPrice ?? undefined,
        page: params?.page ?? 0,
        size: params?.size ?? 100,
      },
    });
    return (data.data.content ?? []).map(mapProductToBook);
  } catch (err) {
    console.warn("Failed to fetch books from backend:", err);
    return fallbackBooks;
  }
}

export async function fetchBookById(id: string): Promise<Book | null> {
  try {
    const { data } = await api.get<ApiResponse<ProductResponse>>(`/products/${id}`);
    return mapProductToBook(data.data);
  } catch {
    return null;
  }
}

export async function createBook(payload: BookInput): Promise<void> {
  await api.post("/products", {
    title: payload.title,
    author: payload.author,
    categoryId: payload.categoryId ?? payload.category,
    price: payload.price,
    description: payload.description,
    language: payload.language ?? "English",
    pages: payload.pages ?? 0,
    isbn: payload.isbn ?? "",
    publisher: payload.publisher ?? "",
    format: payload.format ?? "paperback",
    sku: payload.sku ?? `SKU-${Date.now()}`,
    status: "active",
  });
}

export async function updateBook(id: string, payload: BookInput): Promise<void> {
  await api.put(`/products/${id}`, {
    title: payload.title,
    author: payload.author,
    categoryId: payload.categoryId ?? payload.category,
    price: payload.price,
    description: payload.description,
    language: payload.language ?? "English",
    pages: payload.pages ?? 0,
    isbn: payload.isbn ?? "",
    publisher: payload.publisher ?? "",
    format: payload.format ?? "paperback",
    sku: payload.sku ?? `SKU-${Date.now()}`,
  });
}

export async function deleteBook(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

// ── Fallback data (used when backend is not reachable) ────────
const fallbackBooks: Book[] = [
  {
    id: "sample-1",
    title: "Atomic Habits",
    author: "James Clear",
    category: "Self Growth",
    price: 499,
    description: "Build small habits that compound into remarkable results.",
    coverUrl: "",
    language: "English",
    pages: 320,
    isbn: "978-0735211292",
    publisher: "Avery",
    stock: 50,
    ratingAvg: 4.5,
    ratingCount: 120,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-2",
    title: "Deep Work",
    author: "Cal Newport",
    category: "Productivity",
    price: 459,
    description: "Train your focus to produce high-value work.",
    coverUrl: "",
    language: "English",
    pages: 296,
    isbn: "978-1455586691",
    publisher: "Grand Central",
    stock: 35,
    ratingAvg: 4.3,
    ratingCount: 85,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];
