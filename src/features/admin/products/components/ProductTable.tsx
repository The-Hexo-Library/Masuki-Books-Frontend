import type { CategoryOption, ProductRow } from "../types";

interface ProductTableProps {
  products: ProductRow[];
  loading: boolean;
  categories: CategoryOption[];
  onEdit: (product: ProductRow) => void;
  onDelete: (product: ProductRow) => void;
  onQuickStatus: (product: ProductRow, status: string) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function shortDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

export default function ProductTable({
  products,
  loading,
  categories,
  onEdit,
  onDelete,
  onQuickStatus,
}: ProductTableProps) {
  const categoryMap = new Map(categories.map((c) => [c.category_id, c.name]));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-slate-900">Products</h2>

      {loading && <p className="mt-3 text-sm text-slate-600">Loading products...</p>}

      {!loading && products.length === 0 && (
        <p className="mt-3 text-sm text-slate-600">No products match current filters.</p>
      )}

      {!loading && products.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Title</th>
                <th className="px-3 py-2 font-semibold">Author</th>
                <th className="px-3 py-2 font-semibold">SKU</th>
                <th className="px-3 py-2 font-semibold">Price</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Updated</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
              {products.map((product) => (
                <tr key={product.product_id}>
                  <td className="px-3 py-2">{product.title}</td>
                  <td className="px-3 py-2">{product.author}</td>
                  <td className="px-3 py-2 font-mono text-xs">{product.sku}</td>
                  <td className="px-3 py-2">{formatCurrency(product.price)}</td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      value={product.status}
                      onChange={(e) => onQuickStatus(product, e.target.value)}
                    >
                      <option value="active">active</option>
                      <option value="draft">draft</option>
                      <option value="archived">archived</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {Array.isArray(product.categories)
                      ? product.categories[0]?.name ?? categoryMap.get(product.category_id ?? "") ?? "-"
                      : product.categories?.name ?? categoryMap.get(product.category_id ?? "") ?? "-"}
                  </td>
                  <td className="px-3 py-2">{shortDate(product.updated_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50" onClick={() => onEdit(product)}>
                        Edit
                      </button>
                      <button className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50" onClick={() => onDelete(product)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
