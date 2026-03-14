import { useEffect, useState } from "react";
import {
  createBook,
  deleteBook,
  fetchBooks,
  updateBook,
} from "../../services/booksService";
import type { Book, BookInput, Order, Review } from "../../types/book";
import { fetchAllOrders, updateOrderStatus } from "../../services/orderService";
import { fetchAllReviews, deleteReview, toggleReviewApproval } from "../../services/reviewService";

const emptyForm: BookInput = {
  title: "",
  author: "",
  category: "",
  price: 0,
  description: "",
  coverUrl: "",
  language: "English",
  pages: 0,
  isbn: "",
  publisher: "",
  stock: 999,
};

type AdminTab = "books" | "orders" | "reviews" | "reports";

const statusColor: Record<string, string> = {
  pending: "#e65100",
  confirmed: "#1565c0",
  packed: "#6a1b9a",
  shipped: "#5e35b1",
  delivered: "#2e7d32",
  cancelled: "#c62828",
  refunded: "#795548",
};

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<AdminTab>("books");
  const [books, setBooks] = useState<Book[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookInput>(emptyForm);

  const loadBooks = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchBooks();
      setBooks(data);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unable to load books.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBooks();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    setError("");
    setSaving(true);

    try {
      if (editingId) {
        await updateBook(editingId, form);
      } else {
        await createBook(form);
      }

      resetForm();
      await loadBooks();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unable to save book.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError("");

    try {
      await deleteBook(id);
      await loadBooks();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete book.";
      setError(message);
    }
  };

  const startEdit = (book: Book) => {
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      category: book.category,
      price: book.price,
      description: book.description,
      coverUrl: book.coverUrl,
      language: book.language,
      pages: book.pages,
      isbn: book.isbn,
      publisher: book.publisher,
      stock: book.stock,
    });
  };

  const loadOrders = async () => {
    try {
      const data = await fetchAllOrders();
      setOrders(data);
    } catch { /* ignore */ }
  };

  const loadReviews = async () => {
    try {
      const data = await fetchAllReviews();
      setReviews(data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (tab === "orders") void loadOrders();
    if (tab === "reviews") void loadReviews();
  }, [tab]);

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch { /* ignore */ }
  };

  const handleToggleApproval = async (reviewId: string, approved: boolean) => {
    try {
      await toggleReviewApproval(reviewId, approved);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, isApproved: approved } : r))
      );
    } catch { /* ignore */ }
  };

  // Stats
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const lowStock = books.filter((b) => b.stock < 10);

  return (
    <div style={{ padding: "40px", display: "flex", flexDirection: "column", gap: "22px" }}>
      <h2 style={{ color: "#4d3021" }}>Admin Dashboard</h2>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        <div style={{ background: "#e6d5c9", borderRadius: "10px", padding: "18px", textAlign: "center" }}>
          <p style={{ fontSize: "28px", fontWeight: 700, color: "#4d3021" }}>{books.length}</p>
          <p style={{ fontSize: "13px", color: "#666" }}>Total Books</p>
        </div>
        <div style={{ background: "#e6d5c9", borderRadius: "10px", padding: "18px", textAlign: "center" }}>
          <p style={{ fontSize: "28px", fontWeight: 700, color: "#4d3021" }}>{orders.length}</p>
          <p style={{ fontSize: "13px", color: "#666" }}>Total Orders</p>
        </div>
        <div style={{ background: "#e6d5c9", borderRadius: "10px", padding: "18px", textAlign: "center" }}>
          <p style={{ fontSize: "28px", fontWeight: 700, color: "#2e7d32" }}>₹{totalRevenue}</p>
          <p style={{ fontSize: "13px", color: "#666" }}>Revenue</p>
        </div>
        <div style={{ background: lowStock.length > 0 ? "#fff3e0" : "#e6d5c9", borderRadius: "10px", padding: "18px", textAlign: "center" }}>
          <p style={{ fontSize: "28px", fontWeight: 700, color: lowStock.length > 0 ? "#e65100" : "#4d3021" }}>{lowStock.length}</p>
          <p style={{ fontSize: "13px", color: "#666" }}>Low Stock Items</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "4px", background: "#e6d5c9", borderRadius: "10px", padding: "4px" }}>
        {(["books", "orders", "reviews", "reports"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: tab === t ? "#4d3021" : "transparent",
              color: tab === t ? "#fff" : "#4d3021",
              cursor: "pointer",
              fontWeight: tab === t ? 600 : 400,
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {/* Books Tab */}
      {tab === "books" && (
        <>
      <section
        style={{
          background: "#e6d5c9",
          borderRadius: "10px",
          padding: "22px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "10px",
        }}
      >
        <h2 style={{ color: "#4d3021", gridColumn: "1 / -1" }}>
          {editingId ? "Edit Book" : "Add New Book"}
        </h2>

        <input
          placeholder="Title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #c7aa99" }}
        />

        <input
          placeholder="Author"
          value={form.author}
          onChange={(event) => setForm((prev) => ({ ...prev, author: event.target.value }))}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #c7aa99" }}
        />

        <input
          placeholder="Category"
          value={form.category}
          onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #c7aa99" }}
        />

        <input
          placeholder="Price"
          type="number"
          value={form.price}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, price: Number(event.target.value) }))
          }
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #c7aa99" }}
        />

        <input
          placeholder="Language"
          value={form.language ?? ""}
          onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #c7aa99" }}
        />

        <input
          placeholder="Pages"
          type="number"
          value={form.pages ?? 0}
          onChange={(event) => setForm((prev) => ({ ...prev, pages: Number(event.target.value) }))}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #c7aa99" }}
        />

        <input
          placeholder="ISBN"
          value={form.isbn ?? ""}
          onChange={(event) => setForm((prev) => ({ ...prev, isbn: event.target.value }))}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #c7aa99" }}
        />

        <input
          placeholder="Publisher"
          value={form.publisher ?? ""}
          onChange={(event) => setForm((prev) => ({ ...prev, publisher: event.target.value }))}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #c7aa99" }}
        />

        <input
          placeholder="Stock"
          type="number"
          value={form.stock ?? 999}
          onChange={(event) => setForm((prev) => ({ ...prev, stock: Number(event.target.value) }))}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #c7aa99" }}
        />

        <input
          placeholder="Cover URL"
          value={form.coverUrl}
          onChange={(event) => setForm((prev) => ({ ...prev, coverUrl: event.target.value }))}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #c7aa99" }}
        />

        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
          style={{
            minHeight: "100px",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #c7aa99",
            gridColumn: "1 / -1",
          }}
        />

        <div style={{ display: "flex", gap: "10px", gridColumn: "1 / -1" }}>
          <button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={saving}
            style={{
              padding: "10px 16px",
              border: "none",
              borderRadius: "6px",
              background: "#4d3021",
              color: "white",
              cursor: "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : editingId ? "Update Book" : "Create Book"}
          </button>

          {editingId && (
            <button
              onClick={resetForm}
              style={{
                padding: "10px 16px",
                border: "1px solid #4d3021",
                borderRadius: "6px",
                background: "transparent",
                color: "#4d3021",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {error && (
          <p style={{ color: "#8f2a2a", fontSize: "14px", gridColumn: "1 / -1" }}>
            {error}
          </p>
        )}
      </section>

      <section style={{ background: "#e6d5c9", borderRadius: "10px", padding: "22px" }}>
        <h3 style={{ color: "#4d3021", marginBottom: "14px" }}>Books Catalog</h3>

        {loading && <p>Loading books...</p>}

        {!loading && books.length === 0 && (
          <p>No books found. Create your first book above.</p>
        )}

        {!loading && books.length > 0 && (
          <div style={{ display: "grid", gap: "12px" }}>
            {books.map((book) => (
              <div
                key={book.id}
                style={{
                  background: "#fff",
                  borderRadius: "8px",
                  padding: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h4 style={{ color: "#4d3021" }}>{book.title}</h4>
                  <p style={{ fontSize: "14px" }}>
                    {book.author} • {book.category} • ₹{book.price} • Stock: {book.stock}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => startEdit(book)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #4d3021",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => {
                      void handleDelete(book.id);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: "#8f2a2a",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
        </>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (
        <section style={{ background: "#e6d5c9", borderRadius: "10px", padding: "22px" }}>
          <h3 style={{ color: "#4d3021", marginBottom: "14px" }}>All Orders</h3>
          {orders.length === 0 && <p>No orders found.</p>}
          <div style={{ display: "grid", gap: "12px" }}>
            {orders.map((order) => (
              <div
                key={order.id}
                style={{
                  background: "#fff",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <strong style={{ color: "#4d3021" }}>#{order.id.slice(0, 8)}</strong>
                    <span style={{ fontSize: "13px", color: "#666", marginLeft: "8px" }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, color: "#4d3021" }}>₹{order.total}</span>
                </div>
                <p style={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
                  {order.shippingName} • {order.shippingCity} • {order.items?.length ?? 0} items • {order.paymentMethod.toUpperCase()}
                </p>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#666" }}>Status:</span>
                  <select
                    value={order.status}
                    onChange={(e) => { void handleStatusChange(order.id, e.target.value); }}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: `2px solid ${statusColor[order.status] ?? "#666"}`,
                      color: statusColor[order.status] ?? "#666",
                      fontWeight: 600,
                      fontSize: "12px",
                      background: "#fff",
                    }}
                  >
                    {["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews Tab */}
      {tab === "reviews" && (
        <section style={{ background: "#e6d5c9", borderRadius: "10px", padding: "22px" }}>
          <h3 style={{ color: "#4d3021", marginBottom: "14px" }}>All Reviews</h3>
          {reviews.length === 0 && <p>No reviews found.</p>}
          <div style={{ display: "grid", gap: "12px" }}>
            {reviews.map((rev) => (
              <div
                key={rev.id}
                style={{
                  background: "#fff",
                  borderRadius: "8px",
                  padding: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div>
                    <strong style={{ color: "#4d3021" }}>{rev.userName ?? "Anonymous"}</strong>
                    <span style={{ color: "#f5a623", marginLeft: "8px" }}>
                      {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#999" }}>
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "#444", marginBottom: "8px" }}>{rev.comment}</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => { void handleToggleApproval(rev.id, !rev.isApproved); }}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: "1px solid",
                      borderColor: rev.isApproved ? "#c62828" : "#2e7d32",
                      background: "transparent",
                      color: rev.isApproved ? "#c62828" : "#2e7d32",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    {rev.isApproved ? "Unapprove" : "Approve"}
                  </button>
                  <button
                    onClick={() => { void handleDeleteReview(rev.id); }}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: "#8f2a2a",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Delete
                  </button>
                  <span style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: rev.isApproved ? "#e8f5e9" : "#fff3e0",
                    color: rev.isApproved ? "#2e7d32" : "#e65100",
                  }}>
                    {rev.isApproved ? "Approved" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reports Tab */}
      {tab === "reports" && (
        <section style={{ background: "#e6d5c9", borderRadius: "10px", padding: "22px" }}>
          <h3 style={{ color: "#4d3021", marginBottom: "14px" }}>Sales Reports</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "16px" }}>
              <h4 style={{ color: "#4d3021", marginBottom: "8px" }}>Revenue Breakdown</h4>
              <p style={{ fontSize: "14px", color: "#555" }}>Total Revenue: <strong>₹{totalRevenue}</strong></p>
              <p style={{ fontSize: "14px", color: "#555" }}>Average Order: <strong>₹{orders.length ? Math.round(totalRevenue / orders.length) : 0}</strong></p>
              <p style={{ fontSize: "14px", color: "#555" }}>Total Orders: <strong>{orders.length}</strong></p>
            </div>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "16px" }}>
              <h4 style={{ color: "#4d3021", marginBottom: "8px" }}>Inventory</h4>
              <p style={{ fontSize: "14px", color: "#555" }}>Total Books: <strong>{books.length}</strong></p>
              <p style={{ fontSize: "14px", color: "#555" }}>Active: <strong>{books.filter(b => b.isActive).length}</strong></p>
              <p style={{ fontSize: "14px", color: lowStock.length > 0 ? "#c62828" : "#555" }}>
                Low Stock ({`<`}10): <strong>{lowStock.length}</strong>
              </p>
            </div>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "16px" }}>
              <h4 style={{ color: "#4d3021", marginBottom: "8px" }}>Order Status</h4>
              {["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((s) => {
                const count = orders.filter((o) => o.status === s).length;
                return (
                  <p key={s} style={{ fontSize: "14px", color: "#555" }}>
                    <span style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: statusColor[s] ?? "#666",
                      marginRight: "6px",
                    }} />
                    {s.charAt(0).toUpperCase() + s.slice(1)}: <strong>{count}</strong>
                  </p>
                );
              })}
            </div>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "16px" }}>
              <h4 style={{ color: "#4d3021", marginBottom: "8px" }}>Reviews</h4>
              <p style={{ fontSize: "14px", color: "#555" }}>Total Reviews: <strong>{reviews.length}</strong></p>
              <p style={{ fontSize: "14px", color: "#555" }}>Approved: <strong>{reviews.filter(r => r.isApproved).length}</strong></p>
              <p style={{ fontSize: "14px", color: "#555" }}>Pending: <strong>{reviews.filter(r => !r.isApproved).length}</strong></p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
