import type { CategoryOption, ProductFormValues } from "../types";

interface ProductFormCardProps {
  values: ProductFormValues;
  categories: CategoryOption[];
  errorMessage?: string;
  selectedFile?: File | null;
  editing: boolean;
  saving: boolean;
  onChange: (next: ProductFormValues) => void;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function ProductFormCard({
  values,
  categories,
  errorMessage,
  selectedFile,
  editing,
  saving,
  onChange,
  onFileChange,
  onSubmit,
  onCancel,
}: ProductFormCardProps) {
  const setField = <K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-slate-900">
        {editing ? "Edit Product" : "Create Product"}
      </h2>
      <p className="mt-1 text-sm text-slate-600">Fields aligned to products table schema.</p>

      {errorMessage ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Title *</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.title} onChange={(e) => setField("title", e.target.value)} />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Author *</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.author} onChange={(e) => setField("author", e.target.value)} />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">SKU *</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.sku} onChange={(e) => setField("sku", e.target.value)} />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Price *</span>
          <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.price} onChange={(e) => setField("price", e.target.value)} />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">ISBN</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.isbn} onChange={(e) => setField("isbn", e.target.value)} />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Format *</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.format} onChange={(e) => setField("format", e.target.value as ProductFormValues["format"])}>
            <option value="Hardcover">Hardcover</option>
            <option value="Paperback">Paperback</option>
            <option value="Ebook">Ebook</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Language *</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.language} onChange={(e) => setField("language", e.target.value)}>
            <option value="en">en</option>
            <option value="ta">ta</option>
            <option value="hi">hi</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Pages</span>
          <input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.pages} onChange={(e) => setField("pages", e.target.value)} />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Compare at Price</span>
          <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.compare_at_price} onChange={(e) => setField("compare_at_price", e.target.value)} />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Publication Date</span>
          <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.publication_date} onChange={(e) => setField("publication_date", e.target.value)} />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Publisher</span>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.publisher} onChange={(e) => setField("publisher", e.target.value)} />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Status *</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.status} onChange={(e) => setField("status", e.target.value as ProductFormValues["status"])}>
            <option value="active">active</option>
            <option value="draft">draft</option>
            <option value="archived">archived</option>
          </select>
        </label>

        <label className="text-sm md:col-span-2 xl:col-span-3">
          <span className="mb-1 block font-medium text-slate-700">Category *</span>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={values.category_id} onChange={(e) => setField("category_id", e.target.value)}>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm md:col-span-2 xl:col-span-3">
          <span className="mb-1 block font-medium text-slate-700">Description</span>
          <textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" value={values.description} onChange={(e) => setField("description", e.target.value)} />
        </label>

        <label className="text-sm md:col-span-2 xl:col-span-3">
          <span className="mb-1 block font-medium text-slate-700">Book File (PDF/EPUB)</span>
          <input
            type="file"
            accept=".pdf,.epub"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          <span className="mt-1 block text-xs text-slate-500">
            {selectedFile ? `Selected: ${selectedFile.name}` : "Attach file to store in S3 bucket."}
          </span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : editing ? "Update Product" : "Create Product"}
        </button>

        {editing && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel Edit
          </button>
        )}
      </div>
    </section>
  );
}
