import { useEffect, useState } from "react";
import type { LibraryBook } from "../../types/subscription";
import { fetchPublicLibrary } from "../../services/subscriptionService";

export default function PublicLibrary() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const list = await fetchPublicLibrary();
      setBooks(list);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-masuki-900">Public Library</h2>
      <p className="text-sm text-slate-600">Browse books available to all users.</p>

      {loading && <p className="text-sm text-slate-500">Loading public library...</p>}

      {!loading && books.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No public books available right now.</p>
      )}

      {!loading && books.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {books.map((book) => (
            <article key={book.productId} className="rounded-xl border border-masuki-100 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900">{book.title}</h3>
              <p className="text-sm text-slate-600">{book.author}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
