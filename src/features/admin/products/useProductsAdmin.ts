import { useCallback, useState } from "react";
import { createBook, deleteBook, fetchAdminBooks, updateBook, uploadBookFile } from "../../../services/booksService";
import { fetchCategories } from "../../../services/categoryService";
import type { BookInput } from "../../../types/book";
import type { CategoryOption, ProductFilters, ProductFormValues, ProductRow } from "./types";

const PAGE_SIZE = 10;

function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

function sanitizeNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function mapSort(sort: ProductFilters["featuredSort"]) {
  switch (sort) {
    case "price_asc":
      return { column: "price", ascending: true };
    case "price_desc":
      return { column: "price", ascending: false };
    case "date_asc":
      return { column: "publication_date", ascending: true };
    case "date_desc":
      return { column: "publication_date", ascending: false };
    default:
      return { column: "updated_at", ascending: false };
  }
}

function compareWithNulls(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  ascending: boolean
) {
  const av = a ?? null;
  const bv = b ?? null;

  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;

  if (typeof av === "number" && typeof bv === "number") {
    return ascending ? av - bv : bv - av;
  }

  const as = String(av).toLowerCase();
  const bs = String(bv).toLowerCase();
  if (as === bs) return 0;
  return ascending ? (as < bs ? -1 : 1) : (as < bs ? 1 : -1);
}

function mapBookToProductRow(book: {
  id: string;
  title: string;
  author: string;
  description: string;
  format?: string;
  language: string;
  pages: number;
  isbn: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  publicationDate?: string;
  publisher: string;
  status?: string;
  categoryId?: string;
  category?: string;
  createdAt: string;
}): ProductRow {
  const categoryName = book.category ? { name: book.category } : null;
  return {
    product_id: book.id,
    title: book.title,
    author: book.author,
    description: book.description || null,
    format: book.format || "Paperback",
    language: book.language || "en",
    pages: Number.isFinite(book.pages) ? book.pages : null,
    isbn: book.isbn || null,
    sku: book.sku || "",
    price: Number(book.price ?? 0),
    compare_at_price: book.compareAtPrice ?? null,
    publication_date: book.publicationDate || null,
    publisher: book.publisher || null,
    status: book.status || "draft",
    category_id: book.categoryId || null,
    created_by: null,
    created_at: book.createdAt || new Date().toISOString(),
    updated_at: book.createdAt || new Date().toISOString(),
    categories: categoryName,
  };
}

export function defaultProductForm(): ProductFormValues {
  return {
    title: "",
    author: "",
    description: "",
    format: "Paperback",
    language: "en",
    pages: "",
    isbn: "",
    sku: "",
    price: "",
    compare_at_price: "",
    publication_date: "",
    publisher: "",
    status: "draft",
    category_id: "",
  };
}

export function useProductsAdmin() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  const loadCategories = useCallback(async () => {
    const data = await fetchCategories();
    const active = (data ?? [])
      .filter((category) => category.isActive !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((category) => ({
        category_id: category.categoryId,
        name: category.name,
      }));

    setCategories(active);
  }, []);

  const loadProducts = useCallback(
    async (filters: ProductFilters, page: number) => {
      setLoading(true);
      setError("");

      try {
        const books = await fetchAdminBooks({
          status: filters.status === "all" ? undefined : filters.status,
          page: 0,
          size: 500,
        });

        const mapped = books.map(mapBookToProductRow);
        const q = filters.search.trim().toLowerCase();
        const filtered = mapped.filter((row) => {
          const matchesSearch =
            !q || row.title.toLowerCase().includes(q) || row.sku.toLowerCase().includes(q);
          const matchesStatus = filters.status === "all" || row.status === filters.status;
          const matchesCategory =
            filters.categoryId === "all" || row.category_id === filters.categoryId;
          return matchesSearch && matchesStatus && matchesCategory;
        });

        const sort = mapSort(filters.featuredSort);
        const sorted = [...filtered].sort((a, b) => {
          if (sort.column === "price") {
            return compareWithNulls(a.price, b.price, sort.ascending);
          }
          if (sort.column === "publication_date") {
            return compareWithNulls(a.publication_date, b.publication_date, sort.ascending);
          }
          return compareWithNulls(a.updated_at, b.updated_at, sort.ascending);
        });

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE;
        setProducts(sorted.slice(from, to));
        setTotalCount(sorted.length);
      } catch (loadError) {
        setError(toErrorMessage(loadError, "Failed to load products."));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const validateForm = useCallback((values: ProductFormValues) => {
    if (!values.title.trim()) throw new Error("Title is required.");
    if (!values.author.trim()) throw new Error("Author is required.");
    if (!values.sku.trim()) throw new Error("SKU is required.");
    if (!values.price.trim()) throw new Error("Price is required.");
    if (!values.format.trim()) throw new Error("Format is required.");
    if (!values.language.trim()) throw new Error("Language is required.");
    if (!values.status.trim()) throw new Error("Status is required.");
    if (!values.category_id.trim()) throw new Error("Category is required.");

    const price = Number(values.price);
    if (Number.isNaN(price) || price <= 0) throw new Error("Price must be a positive number.");

    if (values.isbn.trim() && values.isbn.trim().length > 20) {
      throw new Error("ISBN must be <= 20 characters.");
    }
  }, []);

  const ensureUnique = useCallback(async (values: ProductFormValues, editingId?: string) => {
    const sku = values.sku.trim();
    const isbn = values.isbn.trim();

    const books = await fetchAdminBooks({ page: 0, size: 500 });
    const skuDuplicate = books.find(
      (book) => (book.sku ?? "").trim().toLowerCase() === sku.toLowerCase() && book.id !== editingId
    );
    if (skuDuplicate) throw new Error("SKU must be unique.");

    if (isbn) {
      const isbnDuplicate = books.find(
        (book) => (book.isbn ?? "").trim().toLowerCase() === isbn.toLowerCase() && book.id !== editingId
      );
      if (isbnDuplicate) throw new Error("ISBN must be unique.");
    }
  }, []);

  const toBookInput = useCallback(
    (values: ProductFormValues): BookInput => {
      const category = categories.find((c) => c.category_id === values.category_id);

      return {
        title: values.title.trim(),
        author: values.author.trim(),
        category: category?.name ?? "General",
        categoryId: values.category_id,
        price: Number(values.price),
        description: values.description.trim(),
        coverUrl: "",
        language: values.language.trim(),
        pages: sanitizeNumber(values.pages) ?? 0,
        isbn: values.isbn.trim() || undefined,
        publisher: values.publisher.trim() || undefined,
        format: values.format.toLowerCase(),
        sku: values.sku.trim(),
        compareAtPrice: sanitizeNumber(values.compare_at_price) ?? undefined,
        status: values.status,
        publicationDate: values.publication_date || undefined,
        contentType: "physical",
      };
    },
    [categories]
  );

  const createProduct = useCallback(
    async (values: ProductFormValues, _createdBy: string, file?: File | null) => {
      validateForm(values);

      setSaving(true);
      setError("");

      try {
        await ensureUnique(values);
        const created = await createBook(toBookInput(values));
        if (file) {
          await uploadBookFile(created.id, file);
        }
      } catch (createError) {
        setError(toErrorMessage(createError, "Failed to create product."));
        throw createError;
      } finally {
        setSaving(false);
      }
    },
    [ensureUnique, toBookInput, validateForm]
  );

  const updateProduct = useCallback(
    async (id: string, values: ProductFormValues, file?: File | null) => {
      validateForm(values);

      setSaving(true);
      setError("");

      try {
        await ensureUnique(values, id);
        await updateBook(id, toBookInput(values));
        if (file) {
          await uploadBookFile(id, file);
        }
      } catch (updateErr) {
        setError(toErrorMessage(updateErr, "Failed to update product."));
        throw updateErr;
      } finally {
        setSaving(false);
      }
    },
    [ensureUnique, toBookInput, validateForm]
  );

  const deleteProduct = useCallback(async (id: string) => {
    setSaving(true);
    setError("");
    try {
      await deleteBook(id);
    } catch (deleteErr) {
      setError(toErrorMessage(deleteErr, "Failed to delete product."));
      throw deleteErr;
    } finally {
      setSaving(false);
    }
  }, []);

  const quickUpdateStatus = useCallback(async (id: string, status: string) => {
    setSaving(true);
    setError("");
    try {
      const books = await fetchAdminBooks({ page: 0, size: 500 });
      const current = books.find((book) => book.id === id);
      if (!current) {
        throw new Error("Product not found.");
      }

      const category = categories.find((c) => c.category_id === (current.categoryId ?? ""));

      await updateBook(id, {
        title: current.title,
        author: current.author,
        category: category?.name ?? current.category ?? "General",
        categoryId: current.categoryId,
        price: Number(current.price ?? 0),
        description: current.description ?? "",
        coverUrl: "",
        language: current.language ?? "en",
        pages: current.pages ?? 0,
        isbn: current.isbn ?? undefined,
        publisher: current.publisher ?? undefined,
        format: (current.format ?? "paperback").toLowerCase(),
        sku: current.sku ?? `SKU-${Date.now()}`,
        compareAtPrice: current.compareAtPrice ?? undefined,
        status,
        publicationDate: current.publicationDate ?? undefined,
        contentType: current.contentType ?? "physical",
      });
    } catch (updateErr) {
      setError(toErrorMessage(updateErr, "Failed to update status."));
      throw updateErr;
    } finally {
      setSaving(false);
    }
  }, [categories]);

  return {
    PAGE_SIZE,
    products,
    categories,
    loading,
    saving,
    error,
    totalCount,
    setError,
    loadCategories,
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    quickUpdateStatus,
  };
}
