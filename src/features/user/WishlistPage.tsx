import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import {
  fetchWishlist,
  removeFromWishlist,
  type WishlistItem,
} from "../../services/wishlistService";
import { addItemToCart } from "../cart/cartSlice";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../app/store";

export default function WishlistPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetchWishlist(user.id).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [user]);

  const handleRemove = async (bookId: string) => {
    if (!user) return;
    await removeFromWishlist(user.id, bookId);
    setItems((prev) => prev.filter((i) => i.bookId !== bookId));
  };

  const handleMoveToCart = async (item: WishlistItem) => {
    if (!user) return;
    await dispatch(addItemToCart({ userId: user.id, bookId: item.bookId, quantity: 1, book: item.book }));
    await removeFromWishlist(user.id, item.bookId);
    setItems((prev) => prev.filter((i) => i.bookId !== item.bookId));
    setAddedId(item.bookId);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <div style={{ padding: "30px 40px" }}>
      <h2 style={{ color: "#4d3021", marginBottom: "20px" }}>❤️ My Wishlist</h2>

      {loading && <p style={{ color: "#666" }}>Loading wishlist...</p>}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
          <p style={{ fontSize: "48px", marginBottom: "16px" }}>❤️</p>
          <p style={{ fontSize: "18px", marginBottom: "8px" }}>Your wishlist is empty</p>
          <p style={{ marginBottom: "20px" }}>Save books you love by clicking the heart icon.</p>
          <Link
            to="/catalog"
            style={{
              background: "#4d3021", color: "#fff", padding: "10px 24px",
              borderRadius: "8px", textDecoration: "none", fontWeight: 600,
            }}
          >Browse Catalog</Link>
        </div>
      )}

      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.bookId}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            style={{
              display: "flex", alignItems: "center", gap: "20px",
              background: "#f5ede8", borderRadius: "12px",
              padding: "16px 20px", marginBottom: "12px",
              border: "1px solid #e0cfca",
            }}
          >
            {/* Cover placeholder */}
            <div style={{
              width: 60, height: 80, borderRadius: "6px", flexShrink: 0,
              background: "#c4a898", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#fff", fontSize: 24,
              overflow: "hidden",
            }}>
              {item.book?.coverUrl
                ? <img src={item.book.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : "📖"}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <Link
                to={`/book/${item.bookId}`}
                style={{ color: "#4d3021", fontWeight: 700, fontSize: "16px", textDecoration: "none" }}
              >
                {item.book?.title ?? "Unknown Book"}
              </Link>
              <p style={{ color: "#6b4630", fontSize: "13px", margin: "4px 0" }}>
                by {item.book?.author ?? "—"}
              </p>
              {item.book && (
                <p style={{ color: "#f5a623", fontSize: "13px" }}>
                  {"★".repeat(Math.round(item.book.ratingAvg))}{"☆".repeat(5 - Math.round(item.book.ratingAvg))}
                  <span style={{ color: "#888", marginLeft: 6 }}>({item.book.ratingCount})</span>
                </p>
              )}
            </div>

            {/* Price */}
            <div style={{ textAlign: "right", minWidth: 80 }}>
              <p style={{ fontWeight: 700, fontSize: "18px", color: "#4d3021" }}>
                ₹{item.book?.price ?? "—"}
              </p>
              {item.book?.stock === 0 && (
                <p style={{ fontSize: "12px", color: "#c62828" }}>Out of stock</p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 140 }}>
              <button
                onClick={() => void handleMoveToCart(item)}
                disabled={addedId === item.bookId || item.book?.stock === 0}
                style={{
                  padding: "8px 14px", background: "#4d3021", color: "#fff",
                  border: "none", borderRadius: "6px", cursor: "pointer",
                  fontWeight: 600, fontSize: "13px",
                  opacity: addedId === item.bookId ? 0.7 : 1,
                }}
              >
                {addedId === item.bookId ? "✓ Added!" : "Move to Cart"}
              </button>
              <button
                onClick={() => void handleRemove(item.bookId)}
                style={{
                  padding: "8px 14px", background: "transparent", color: "#c62828",
                  border: "1px solid #c62828", borderRadius: "6px", cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Remove
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {!loading && items.length > 0 && (
        <p style={{ fontSize: "13px", color: "#888", marginTop: "8px" }}>
          {items.length} item{items.length !== 1 ? "s" : ""} saved
        </p>
      )}
    </div>
  );
}
