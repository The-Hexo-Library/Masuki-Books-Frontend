import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import ConfirmDeleteModal from "./products/components/ConfirmDeleteModal";
import ProductFormCard from "./products/components/ProductFormCard";
import ProductTable from "./products/components/ProductTable";
import { defaultProductForm, useProductsAdmin } from "./products/useProductsAdmin";
import type { ProductFilters, ProductRow } from "./products/types";

type Toast = { id: number; type: "success" | "error"; message: string };

function statusBadgeClass(type: Toast["type"]) {
  return type === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";
}

export default function AdminDashboardPage() {
  const user = useSelector((state: RootState) => state.auth.user);

  const {
    PAGE_SIZE,
    products,
    categories,
    loading,
    saving,
    error,
    totalCount,
    loadCategories,
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    quickUpdateStatus,
  } = useProductsAdmin();

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    status: "all",
    categoryId: "all",
    featuredSort: "updated_desc",
  });
  const [form, setForm] = useState(defaultProductForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (type: Toast["type"], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2600);
  };

  useEffect(() => {
    void loadCategories().catch(() => {
      pushToast("error", "Unable to load categories.");
    });
  }, [loadCategories]);

  useEffect(() => {
    void loadProducts(filters, page);
  }, [filters, page, loadProducts]);

  useEffect(() => {
    if (error) {
      pushToast("error", error);
    }
  }, [error]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  }, [PAGE_SIZE, totalCount]);

  useEffect(() => {
    if (!form.category_id && categories.length > 0) {
      setForm((prev) => ({
        ...prev,
        category_id: categories[0].category_id,
      }));
    }
  }, [categories, form.category_id]);

  const resetForm = () => {
    setEditingProduct(null);
    setForm(defaultProductForm());
    setSelectedFile(null);
  };

  const handleSave = async () => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.product_id, form, selectedFile);
        pushToast("success", "Product updated successfully.");
        await loadProducts(filters, page);
      } else {
        if (!selectedFile) {
          pushToast("error", "Please attach a PDF/EPUB file before creating a product.");
          return;
        }

        await createProduct(form, user?.id ?? "", selectedFile);
        pushToast("success", "Product created successfully.");
        setPage(1);
        await loadProducts(filters, 1);
      }

      resetForm();
    } catch (saveError) {
      const message =
        saveError instanceof Error && saveError.message.trim()
          ? saveError.message
          : "Failed to save product.";
      pushToast("error", message);
    }
  };

  const handleEdit = (product: ProductRow) => {
    setEditingProduct(product);
    setForm({
      title: product.title ?? "",
      author: product.author ?? "",
      description: product.description ?? "",
      format: (product.format as "Hardcover" | "Paperback" | "Ebook") ?? "Paperback",
      language: product.language ?? "en",
      pages: product.pages == null ? "" : String(product.pages),
      isbn: product.isbn ?? "",
      sku: product.sku ?? "",
      price: String(product.price ?? ""),
      compare_at_price: product.compare_at_price == null ? "" : String(product.compare_at_price),
      publication_date: product.publication_date ?? "",
      publisher: product.publisher ?? "",
      status: (product.status as "active" | "draft" | "archived") ?? "draft",
      category_id: product.category_id ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      await deleteProduct(deleteTarget.product_id);
      pushToast("success", "Product deleted successfully.");
      setDeleteTarget(null);
      await loadProducts(filters, page);
    } catch {
      // handled in hook + toasts
    }
  };

  const handleQuickStatus = async (product: ProductRow, status: string) => {
    try {
      await quickUpdateStatus(product.product_id, status);
      pushToast("success", "Status updated.");
      await loadProducts(filters, page);
    } catch {
      // handled in hook + toasts
    }
  };

  const applyFilter = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Products (Books) Admin</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Create, manage, and publish product records with schema-accurate Supabase operations.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="xl:col-span-2 text-sm text-slate-700">
              <span className="mb-1 block font-medium">Search title or SKU</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={filters.search}
                onChange={(e) => applyFilter("search", e.target.value)}
                placeholder="Search..."
              />
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block font-medium">Status</span>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={filters.status}
                onChange={(e) => applyFilter("status", e.target.value as ProductFilters["status"])}
              >
                <option value="all">all</option>
                <option value="active">active</option>
                <option value="draft">draft</option>
                <option value="archived">archived</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block font-medium">Category</span>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={filters.categoryId}
                onChange={(e) => applyFilter("categoryId", e.target.value)}
              >
                <option value="all">all</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              <span className="mb-1 block font-medium">Sort</span>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={filters.featuredSort}
                onChange={(e) => applyFilter("featuredSort", e.target.value as ProductFilters["featuredSort"])}
              >
                <option value="updated_desc">updated desc</option>
                <option value="price_asc">price low-high</option>
                <option value="price_desc">price high-low</option>
                <option value="date_desc">publication newest</option>
                <option value="date_asc">publication oldest</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <p>Total products: {totalCount}</p>
            <p>
              Page {page} of {totalPages}
            </p>
          </div>
        </header>

        <ProductFormCard
          values={form}
          categories={categories}
          errorMessage={error}
          selectedFile={selectedFile}
          editing={Boolean(editingProduct)}
          saving={saving}
          onChange={setForm}
          onFileChange={setSelectedFile}
          onSubmit={() => {
            void handleSave();
          }}
          onCancel={resetForm}
        />

        <ProductTable
          products={products}
          loading={loading}
          categories={categories}
          onEdit={handleEdit}
          onDelete={(product) => setDeleteTarget(product)}
          onQuickStatus={(product, status) => {
            void handleQuickStatus(product, status);
          }}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>

        <ConfirmDeleteModal
          open={Boolean(deleteTarget)}
          title="Delete Product"
          message={`Are you sure you want to delete ${deleteTarget?.title ?? "this product"}?`}
          busy={saving}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            void handleDeleteConfirm();
          }}
        />

        <div className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-lg border px-4 py-3 text-sm shadow ${statusBadgeClass(toast.type)}`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
