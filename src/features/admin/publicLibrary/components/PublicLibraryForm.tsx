import type { PublicLibraryFormValues } from "../types";

interface PublicLibraryFormProps {
  values: PublicLibraryFormValues;
  editing: boolean;
  saving: boolean;
  onChange: (next: PublicLibraryFormValues) => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
}

export default function PublicLibraryForm({
  values,
  editing,
  saving,
  onChange,
  onSubmit,
  onCancelEdit,
}: PublicLibraryFormProps) {
  return (
    <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-amber-900">
        {editing ? "Edit Public Library Record" : "Add Public Library Record"}
      </h2>
      <p className="mt-1 text-sm text-amber-700">
        Fields match schema: public_library_id, created_at, updated_at, editable, is_featured, notes, visibility, product_id.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm text-amber-900">
          <span className="mb-1 block font-medium">product_id (UUID)</span>
          <input
            className="w-full rounded-lg border border-amber-200 px-3 py-2 outline-none transition focus:border-amber-500"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={values.product_id}
            disabled={editing}
            onChange={(e) => onChange({ ...values, product_id: e.target.value })}
          />
        </label>

        <label className="text-sm text-amber-900">
          <span className="mb-1 block font-medium">visibility</span>
          <select
            className="w-full rounded-lg border border-amber-200 px-3 py-2 outline-none transition focus:border-amber-500"
            value={values.visibility}
            onChange={(e) =>
              onChange({ ...values, visibility: e.target.value as PublicLibraryFormValues["visibility"] })
            }
          >
            <option value="public">public</option>
            <option value="private">private</option>
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-900">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={values.editable}
            onChange={(e) => onChange({ ...values, editable: e.target.checked })}
          />
          editable
        </label>

        <label className="flex items-center gap-3 rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-900">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={values.is_featured}
            onChange={(e) => onChange({ ...values, is_featured: e.target.checked })}
          />
          is_featured
        </label>

        <label className="md:col-span-2 text-sm text-amber-900">
          <span className="mb-1 block font-medium">notes (optional)</span>
          <textarea
            className="min-h-24 w-full rounded-lg border border-amber-200 px-3 py-2 outline-none transition focus:border-amber-500"
            value={values.notes}
            onChange={(e) => onChange({ ...values, notes: e.target.value })}
            placeholder="Any admin notes..."
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : editing ? "Update Record" : "Add Record"}
        </button>

        {editing && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-50"
          >
            Cancel Edit
          </button>
        )}
      </div>
    </section>
  );
}
