import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { LibraryBook, SubscriptionStatus } from "../../types/subscription";
import { fetchMySubscriptionStatus, fetchPrivateLibrary } from "../../services/subscriptionService";

export default function PrivateLibrary() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const subStatus = await fetchMySubscriptionStatus();
      setStatus(subStatus);

      if (subStatus?.active) {
        try {
          const libraryBooks = await fetchPrivateLibrary();
          setBooks(libraryBooks);
        } catch {
          setBooks([]);
        }
      }

      setLoading(false);
    };

    void load();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading private library...</p>;
  }

  if (!status?.active) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-8 text-center">
        <h3 className="text-xl font-bold text-amber-900">Private Library Locked</h3>
        <p className="mt-2 text-sm text-amber-800">Subscribe to access your private library.</p>
        <Link to="/subscription" className="mt-4 inline-flex rounded-lg bg-masuki-700 px-4 py-2 text-sm font-semibold text-white">
          Upgrade Plan
        </Link>
      </div>
    );
  }

  if (status.limitExceeded) {
    return (
      <div className="rounded-2xl border border-rose-300 bg-rose-50 p-8 text-center">
        <h3 className="text-xl font-bold text-rose-900">Access Limit Reached</h3>
        <p className="mt-2 text-sm text-rose-800">Upgrade your plan to access more books.</p>
        <Link to="/subscription" className="mt-4 inline-flex rounded-lg bg-masuki-700 px-4 py-2 text-sm font-semibold text-white">
          Upgrade Plan
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-masuki-900">My Private Library</h2>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          {status.planName} ({status.accessPercentage}%)
        </span>
      </div>

      {books.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No books stored in your private library yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {books.map((book) => (
            <article key={book.productId} className="rounded-xl border border-masuki-100 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-900">{book.title}</h3>
              <p className="text-sm text-slate-600">{book.author}</p>
              <p className="mt-1 text-xs text-slate-500">Access: {book.accessType ?? "private"}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
