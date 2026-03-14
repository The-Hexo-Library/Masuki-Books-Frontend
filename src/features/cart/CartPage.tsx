import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../app/store";
import {
  loadCart,
  updateItemQuantity,
  removeItemFromCart,
} from "../cart/cartSlice";
import { getCartTotal, getCartCount } from "../../services/cartService";

export default function CartPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const { items, loading } = useSelector((state: RootState) => state.cart);

  useEffect(() => {
    if (user) {
      void dispatch(loadCart(user.id));
    }
  }, [dispatch, user]);

  const total = getCartTotal(items);
  const count = getCartCount(items);

  const handleQuantityChange = (bookId: string, qty: number) => {
    if (!user) return;
    if (qty < 1) {
      void dispatch(removeItemFromCart({ userId: user.id, bookId }));
    } else {
      void dispatch(updateItemQuantity({ userId: user.id, bookId, quantity: qty }));
    }
  };

  const handleRemove = (bookId: string) => {
    if (!user) return;
    void dispatch(removeItemFromCart({ userId: user.id, bookId }));
  };

  return (
    <div style={{ padding: "30px 40px", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ color: "#4d3021", marginBottom: "24px" }}>
        Shopping Cart {count > 0 && `(${count} items)`}
      </h2>

      {loading && <p>Loading cart...</p>}

      {!loading && items.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "#f5ede8",
            borderRadius: "12px",
          }}
        >
          <p style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</p>
          <h3 style={{ color: "#4d3021", marginBottom: "12px" }}>Your cart is empty</h3>
          <Link
            to="/catalog"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              background: "#4d3021",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Browse Books
          </Link>
        </motion.div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  border: "1px solid #e0d0c5",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                {/* Mini cover */}
                <div
                  style={{
                    width: "60px",
                    height: "80px",
                    borderRadius: "6px",
                    background: item.book?.coverUrl
                      ? `url(${item.book.coverUrl}) center/cover`
                      : "linear-gradient(135deg, #e6d5c9, #c7aa99)",
                    flexShrink: 0,
                  }}
                />

                {/* Info */}
                <div style={{ flex: 1, minWidth: "160px" }}>
                  <Link
                    to={`/book/${item.bookId}`}
                    style={{ color: "#4d3021", fontWeight: 600, textDecoration: "none" }}
                  >
                    {item.book?.title ?? "Book"}
                  </Link>
                  <p style={{ fontSize: "13px", color: "#666" }}>
                    {item.book?.author ?? ""}
                  </p>
                </div>

                {/* Quantity controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => handleQuantityChange(item.bookId, item.quantity - 1)}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "6px",
                      border: "1px solid #c7aa99",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: "24px", textAlign: "center", fontWeight: 600 }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.bookId, item.quantity + 1)}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "6px",
                      border: "1px solid #c7aa99",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Price */}
                <span style={{ fontWeight: 700, color: "#4d3021", minWidth: "80px", textAlign: "right" }}>
                  ₹{(item.book?.price ?? 0) * item.quantity}
                </span>

                {/* Remove */}
                <button
                  onClick={() => handleRemove(item.bookId)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#f5e6e0",
                    color: "#8f2a2a",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </div>

          {/* Cart Summary */}
          <div
            style={{
              marginTop: "24px",
              background: "#f5ede8",
              borderRadius: "12px",
              padding: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <p style={{ fontSize: "14px", color: "#666" }}>Subtotal ({count} items)</p>
              <p style={{ fontSize: "28px", fontWeight: 700, color: "#4d3021" }}>₹{total}</p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <Link
                to="/catalog"
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "1px solid #4d3021",
                  color: "#4d3021",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Continue Shopping
              </Link>
              <button
                onClick={() => navigate("/checkout")}
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#4d3021",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "15px",
                }}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
