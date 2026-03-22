import type { Book, BookInput } from "../types/book";
import api, { type ApiResponse, type Page } from "./api";

// ── Backend response shape ────────────────────────────────────
interface PublicLibraryResponse {
  productId: string;
  title: string;
  author: string;
  notes?: string;
}

interface ProductResponse {
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
  contentType?: string;
  fileFormat?: string;
  fileSizeBytes?: number;
  totalPages?: number;
  previewPages?: number;
  fileKey?: string;
  downloadable?: boolean;
  maxDownloads?: number;
  createdAt?: string;
}

export interface AdminPublicLibraryRecord {
  publicLibraryId: string;
  productId: string;
  title: string;
  author: string;
  visibility: string;
  isFeatured: boolean;
  notes?: string;
  editable: boolean;
}

function mapProductToBook(p: PublicLibraryResponse): Book {
  return {
    id: p.productId,
    title: p.title ?? "",
    author: p.author ?? "",
    category: "General",
    categoryId: undefined,
    price: 0,
    description: p.notes ?? "",
    coverUrl: "",
    language: "English",
    pages: 0,
    isbn: "",
    publisher: "",
    stock: 999,
    ratingAvg: 0,
    ratingCount: 0,
    isActive: true,
    createdAt: "",
    format: undefined,
    compareAtPrice: undefined,
    sku: undefined,
    imageUrls: [],
  };
}

function mapAdminProductToBook(p: ProductResponse): Book {
  return {
    id: p.productId,
    title: p.title ?? "",
    author: p.author ?? "",
    category: p.categoryName ?? "General",
    categoryId: p.categoryId,
    price: Number(p.price ?? 0),
    description: p.description ?? "",
    coverUrl: "",
    language: p.language ?? "en",
    pages: p.pages ?? 0,
    isbn: p.isbn ?? "",
    publisher: p.publisher ?? "",
    stock: 0,
    ratingAvg: 0,
    ratingCount: 0,
    isActive: (p.status ?? "active") === "active",
    createdAt: p.createdAt ?? "",
    format: p.format,
    compareAtPrice: p.compareAtPrice,
    sku: p.sku,
    status: p.status,
    publicationDate: p.publicationDate,
    contentType: p.contentType,
    fileFormat: p.fileFormat,
    fileSizeBytes: p.fileSizeBytes,
    totalPages: p.totalPages,
    previewPages: p.previewPages,
    downloadable: p.downloadable,
    maxDownloads: p.maxDownloads,
    imageUrls: [],
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
    const { data } = await api.get<ApiResponse<PublicLibraryResponse[]>>("/user/public-library");
    let books = (data.data ?? []).map(mapProductToBook);

    if (params?.keyword) {
      const q = params.keyword.toLowerCase();
      books = books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    }
    return books;
  } catch (err) {
    console.warn("Failed to fetch books from backend:", err);
    return fallbackBooks;
  }
}

export async function fetchBookById(id: string): Promise<Book | null> {
  try {
    const books = await fetchBooks();
    return books.find((b) => b.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function fetchAdminBooks(params?: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<Book[]> {
  const { data } = await api.get<ApiResponse<Page<ProductResponse>>>("/admin/books", {
    params: {
      status: params?.status,
      page: params?.page ?? 0,
      size: params?.size ?? 100,
    },
  });

  return (data.data.content ?? []).map(mapAdminProductToBook);
}

export async function createBook(payload: BookInput): Promise<Book> {
  const { data } = await api.post<ApiResponse<ProductResponse>>("/admin/books", {
    title: payload.title,
    author: payload.author,
    categoryId: payload.categoryId ?? payload.category,
    price: payload.price,
    description: payload.description,
    language: payload.language ?? "en",
    pages: payload.pages ?? 0,
    isbn: payload.isbn ?? "",
    publisher: payload.publisher ?? "",
    format: payload.format ?? "paperback",
    sku: payload.sku ?? `SKU-${Date.now()}`,
    compareAtPrice: payload.compareAtPrice,
    status: payload.status ?? "active",
    publicationDate: payload.publicationDate || undefined,
    contentType: payload.contentType ?? "physical",
    fileFormat: payload.fileFormat || undefined,
    fileSizeBytes: payload.fileSizeBytes,
    totalPages: payload.totalPages,
    previewPages: payload.previewPages,
    downloadable: payload.downloadable ?? false,
    maxDownloads: payload.maxDownloads,
  });

  return mapAdminProductToBook(data.data);
}

export async function updateBook(id: string, payload: BookInput): Promise<Book> {
  const { data } = await api.put<ApiResponse<ProductResponse>>(`/admin/books/${id}`, {
    title: payload.title,
    author: payload.author,
    categoryId: payload.categoryId ?? payload.category,
    price: payload.price,
    description: payload.description,
    language: payload.language ?? "en",
    pages: payload.pages ?? 0,
    isbn: payload.isbn ?? "",
    publisher: payload.publisher ?? "",
    format: payload.format ?? "paperback",
    sku: payload.sku ?? `SKU-${Date.now()}`,
    compareAtPrice: payload.compareAtPrice,
    status: payload.status ?? "active",
    publicationDate: payload.publicationDate || undefined,
    contentType: payload.contentType ?? "physical",
    fileFormat: payload.fileFormat || undefined,
    fileSizeBytes: payload.fileSizeBytes,
    totalPages: payload.totalPages,
    previewPages: payload.previewPages,
    downloadable: payload.downloadable ?? false,
    maxDownloads: payload.maxDownloads,
  });

  return mapAdminProductToBook(data.data);
}

export async function deleteBook(id: string): Promise<void> {
  await api.delete(`/admin/books/${id}`);
}

export async function uploadBookFile(id: string, file: File): Promise<Book> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<ApiResponse<ProductResponse>>(`/admin/books/${id}/file`, formData);

  return mapAdminProductToBook(data.data);
}

export async function upsertPublicLibraryRecord(payload: {
  productId: string;
  isFeatured?: boolean;
  visibility?: string;
  notes?: string;
  editable?: boolean;
}): Promise<void> {
  await api.post("/admin/public-library", {
    productId: payload.productId,
    isFeatured: payload.isFeatured ?? false,
    visibility: payload.visibility ?? "public",
    notes: payload.notes ?? "",
    editable: payload.editable ?? true,
  });
}

export async function fetchAdminPublicLibrary(): Promise<AdminPublicLibraryRecord[]> {
  const { data } = await api.get<ApiResponse<AdminPublicLibraryRecord[]>>("/admin/public-library");
  return data.data ?? [];
}

export async function deletePublicLibraryRecord(publicLibraryId: string): Promise<void> {
  await api.delete(`/admin/public-library/${publicLibraryId}`);
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
