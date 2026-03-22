import type { PublicLibraryRecord } from "../types";

interface PublicLibraryTableProps {
  records: PublicLibraryRecord[];
  loading: boolean;
  onEdit: (record: PublicLibraryRecord) => void;
  onDelete: (record: PublicLibraryRecord) => void;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function PublicLibraryTable({ records, loading, onEdit, onDelete }: PublicLibraryTableProps) {
  return (
    <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-amber-900">Public Library Entries</h2>

      {loading && <p className="mt-3 text-sm text-amber-700">Loading records...</p>}

      {!loading && records.length === 0 && (
        <p className="mt-3 text-sm text-amber-700">No records found for current filters.</p>
      )}

      {!loading && records.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-amber-100">
          <table className="min-w-full divide-y divide-amber-100 text-sm">
            <thead className="bg-amber-50 text-left text-amber-900">
              <tr>
                <th className="px-3 py-2 font-semibold">product_id</th>
                <th className="px-3 py-2 font-semibold">visibility</th>
                <th className="px-3 py-2 font-semibold">editable</th>
                <th className="px-3 py-2 font-semibold">is_featured</th>
                <th className="px-3 py-2 font-semibold">notes</th>
                <th className="px-3 py-2 font-semibold">public_library_id</th>
                <th className="px-3 py-2 font-semibold">created_at</th>
                <th className="px-3 py-2 font-semibold">updated_at</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100 bg-white text-amber-900">
              {records.map((record) => (
                <tr key={record.public_library_id}>
                  <td className="px-3 py-2 font-mono text-xs">{record.product_id}</td>
                  <td className="px-3 py-2">{record.visibility}</td>
                  <td className="px-3 py-2">{record.editable ? "true" : "false"}</td>
                  <td className="px-3 py-2">{record.is_featured ? "true" : "false"}</td>
                  <td className="max-w-64 truncate px-3 py-2" title={record.notes ?? ""}>
                    {record.notes ?? "-"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{record.public_library_id}</td>
                  <td className="px-3 py-2">{formatDate(record.created_at)}</td>
                  <td className="px-3 py-2">{formatDate(record.updated_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium hover:bg-amber-50"
                        onClick={() => onEdit(record)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        onClick={() => onDelete(record)}
                      >
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
