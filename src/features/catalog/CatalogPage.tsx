import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../app/store";
import type { Book } from "../../types/book";
import { fetchBooks } from "../../services/booksService";
import { addItemToCart, removeItemFromCart, updateItemQuantity } from "../cart/cartSlice";

const CATEGORIES = [
  "All",
  "Fiction",
  "Non-Fiction",
  "Self Growth",
  "Business",
  "Technology",
  "Science",
  "Productivity",
  "History",
  "Biography",
];

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low → High", value: "price-asc" },
  { label: "Price: High → Low", value: "price-desc" },
  { label: "Rating", value: "rating" },
  { label: "Title A-Z", value: "title" },
];

export default function CatalogPage() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quantityPickerFor, setQuantityPickerFor] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchBooks();
        setBooks(data.filter((b) => b.isActive));
      } catch {
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    let result = books;

    if (category !== "All") {
      result = result.filter((b) => b.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case "price-asc":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result = [...result].sort((a, b) => b.ratingAvg - a.ratingAvg);
        break;
      case "title":
        result = [...result].sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    return result;
  }, [books, category, search, sort]);

  const getCartQuantity = (bookId: string): number => {
    return cartItems.find((item) => item.bookId === bookId)?.quantity ?? 0;
  };

  const handleOpenQuantityPicker = async (book: Book) => {
    if (!user) return;
    const existingQty = getCartQuantity(book.id);

    if (existingQty > 0) {
      setQuantities((prev) => ({ ...prev, [book.id]: existingQty }));
      setQuantityPickerFor(book.id);
      return;
    }

    setQuantities((prev) => ({ ...prev, [book.id]: 1 }));
    setQuantityPickerFor(book.id);
    await dispatch(addItemToCart({ userId: user.id, bookId: book.id, quantity: 1, book }));
  };

  const handleQuantityChange = async (book: Book, delta: number) => {
    if (!user) return;

    const baseQty = quantities[book.id] ?? getCartQuantity(book.id);
    const nextQty = Math.max(0, Math.min(book.stock, baseQty + delta));

    if (nextQty === 0) {
      setQuantities((prev) => {
        const next = { ...prev };
        delete next[book.id];
        return next;
      });
      setQuantityPickerFor(null);
      await dispatch(removeItemFromCart({ userId: user.id, bookId: book.id }));
      return;
    }

    setQuantities((prev) => ({ ...prev, [book.id]: nextQty }));

    if (getCartQuantity(book.id) > 0) {
      await dispatch(updateItemQuantity({ userId: user.id, bookId: book.id, quantity: nextQty }));
    } else {
      await dispatch(addItemToCart({ userId: user.id, bookId: book.id, quantity: nextQty, book }));
    }
  };

  const dynamicCategories = useMemo(() => {
    const cats = Array.from(new Set(books.map((b) => b.category)));
    return ["All", ...cats.filter((c) => c !== "All")];
  }, [books]);

  const categoriesToShow = dynamicCategories.length > 2 ? dynamicCategories : CATEGORIES;

  return (
    <div style={{ padding: "30px 40px" }}>
      <h2 style={{ color: "#4d3021", marginBottom: "20px" }}>Browse Books</h2>

      {/* Search + Sort Bar */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
          alignItems: "center",
        }}
      >
        <input
          placeholder="Search by title, author, or ISBN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: "220px",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #c7aa99",
            fontSize: "14px",
          }}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #c7aa99",
            background: "#fff",
            fontSize: "14px",
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category chips */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        {categoriesToShow.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: "6px 16px",
              borderRadius: "20px",
              border: category === cat ? "2px solid #4d3021" : "1px solid #c7aa99",
              background: category === cat ? "#4d3021" : "#fff",
              color: category === cat ? "#fff" : "#4d3021",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: category === cat ? 600 : 400,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && <p>Loading catalog...</p>}

      {!loading && filtered.length === 0 && (
        <p style={{ color: "#666" }}>No books match your search.</p>
      )}

      {!loading && filtered.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "20px",
          }}
        >
          {filtered.map((book) => (
            <motion.div
              key={book.id}
              whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e0d0c5",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Cover */}
              <div
                style={{
                  height: "180px",
                  background: book.coverUrl
                    ? `url(${book.coverUrl}) center/cover`
                    : "linear-gradient(135deg, #e6d5c9 0%, #c7aa99 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#4d3021",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {!book.coverUrl && book.title}
              </div>

              <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column" }}>
                <Link
                  to={`/book/${book.id}`}
                  style={{
                    color: "#4d3021",
                    fontWeight: 600,
                    fontSize: "16px",
                    textDecoration: "none",
                    marginBottom: "4px",
                  }}
                >
                  {book.title}
                </Link>
                <p style={{ fontSize: "13px", color: "#666", marginBottom: "4px" }}>
                  by {book.author}
                </p>
                <p style={{ fontSize: "12px", color: "#999", marginBottom: "8px" }}>
                  {book.category} • {book.language}
                </p>

                {/* Rating */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                  <span style={{ color: "#f5a623", fontSize: "14px" }}>
                    {"★".repeat(Math.round(book.ratingAvg))}
                    {"☆".repeat(5 - Math.round(book.ratingAvg))}
                  </span>
                  <span style={{ fontSize: "12px", color: "#999" }}>
                    ({book.ratingCount})
                  </span>
                </div>

                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "#4d3021", fontSize: "18px" }}>
                    ₹{book.price}
                  </span>
                  {user && (
                    quantityPickerFor === book.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          onClick={() => { void handleQuantityChange(book, -1); }}
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "6px",
                            border: "1px solid #c7aa99",
                            background: "#fff",
                            cursor: "pointer",
                            fontSize: "14px",
                            lineHeight: 1,
                          }}
                        >
                          −
                        </button>
                        <span style={{ minWidth: "20px", textAlign: "center", fontSize: "13px", fontWeight: 600 }}>
                          {quantities[book.id] ?? getCartQuantity(book.id)}
                        </span>
                        <button
                          onClick={() => { void handleQuantityChange(book, 1); }}
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "6px",
                            border: "1px solid #c7aa99",
                            background: "#fff",
                            cursor: "pointer",
                            fontSize: "14px",
                            lineHeight: 1,
                          }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (book.stock > 0) {
                            void handleOpenQuantityPicker(book);
                          }
                        }}
                        disabled={book.stock === 0}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          border: "none",
                          background: "#4d3021",
                          color: "#fff",
                          cursor: book.stock === 0 ? "not-allowed" : "pointer",
                          opacity: book.stock === 0 ? 0.6 : 1,
                          fontSize: "13px",
                        }}
                      >
                        Add to Cart
                      </button>
                    )
                  )}
                </div>
                {book.stock < 10 && book.stock > 0 && (
                  <p style={{ fontSize: "11px", color: "#c62828", marginTop: "4px" }}>
                    Only {book.stock} left!
                  </p>
                )}
                {book.stock === 0 && (
                  <p style={{ fontSize: "11px", color: "#c62828", marginTop: "4px" }}>
                    Out of stock
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
