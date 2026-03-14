import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import type { Order } from "../../types/book";
import { fetchOrderById } from "../../services/orderService";

const statusColor: Record<string, string> = {
  pending: "#e65100",
  confirmed: "#1565c0",
  packed: "#6a1b9a",
  shipped: "#5e35b1",
  delivered: "#2e7d32",
  cancelled: "#c62828",
  refunded: "#795548",
};

const statusSteps = ["pending", "confirmed", "packed", "shipped", "delivered"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await fetchOrderById(id);
        setOrder(data);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, user]);

  if (loading) {
    return <div style={{ padding: "60px", textAlign: "center" }}>Loading order...</div>;
  }

  if (!order) {
    return (
      <div style={{ padding: "60px", textAlign: "center" }}>
        <h2 style={{ color: "#4d3021" }}>Order not found</h2>
        <Link to="/orders" style={{ color: "#4d3021" }}>← Back to orders</Link>
      </div>
    );
  }

  const currentStepIdx = statusSteps.indexOf(order.status);

  return (
    <div style={{ padding: "30px 40px", maxWidth: "800px", margin: "0 auto" }}>
      <Link to="/orders" style={{ color: "#4d3021", textDecoration: "none", fontSize: "14px" }}>
        ← Back to orders
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", marginBottom: "24px" }}>
        <h2 style={{ color: "#4d3021" }}>Order #{order.id.slice(0, 8)}</h2>
        <span
          style={{
            padding: "6px 18px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: 600,
            background: `${statusColor[order.status] ?? "#666"}20`,
            color: statusColor[order.status] ?? "#666",
            textTransform: "capitalize",
          }}
        >
          {order.status}
        </span>
      </div>

      {/* Status tracker */}
      {order.status !== "cancelled" && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: "30px", gap: "4px" }}>
          {statusSteps.map((s, i) => (
            <div key={s} style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: i <= currentStepIdx ? "#4d3021" : "#e0d0c5",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {i <= currentStepIdx ? "✓" : i + 1}
              </div>
              {i < statusSteps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "3px",
                    background: i < currentStepIdx ? "#4d3021" : "#e0d0c5",
                    margin: "0 4px",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Order Items */}
      <div style={{ background: "#f5ede8", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <h3 style={{ color: "#4d3021", marginBottom: "12px" }}>Items</h3>
        {order.items?.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid #e0d0c5",
              fontSize: "14px",
            }}
          >
            <div>
              <Link to={`/book/${item.bookId}`} style={{ color: "#4d3021", fontWeight: 600, textDecoration: "none" }}>
                {item.title}
              </Link>
              <p style={{ fontSize: "12px", color: "#666" }}>by {item.author}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</p>
              <p style={{ fontSize: "12px", color: "#666" }}>Qty: {item.quantity} × ₹{item.price}</p>
            </div>
          </div>
        ))}

        <div style={{ marginTop: "16px", fontSize: "14px" }}>
          {order.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "#2e7d32", marginBottom: "4px" }}>
              <span>Discount {order.promoCode && `(${order.promoCode})`}</span>
              <span>-₹{order.discount}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "18px", color: "#4d3021" }}>
            <span>Total</span>
            <span>₹{order.total}</span>
          </div>
        </div>
      </div>

      {/* Shipping & Payment */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={{ background: "#f5ede8", borderRadius: "12px", padding: "20px" }}>
          <h4 style={{ color: "#4d3021", marginBottom: "8px" }}>Shipping</h4>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#555" }}>
            {order.shippingName}<br />
            {order.shippingAddress}<br />
            {order.shippingCity} - {order.shippingZip}<br />
            {order.shippingCountry}<br />
            {order.shippingPhone && `📞 ${order.shippingPhone}`}
          </p>
        </div>
        <div style={{ background: "#f5ede8", borderRadius: "12px", padding: "20px" }}>
          <h4 style={{ color: "#4d3021", marginBottom: "8px" }}>Payment</h4>
          <p style={{ fontSize: "14px", color: "#555" }}>
            Method: <strong>{order.paymentMethod.toUpperCase()}</strong>
          </p>
          <p style={{ fontSize: "14px", color: "#555" }}>
            Status:{" "}
            <span style={{ color: order.paymentStatus === "paid" ? "#2e7d32" : "#e65100", fontWeight: 600 }}>
              {order.paymentStatus.toUpperCase()}
            </span>
          </p>
          <p style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
            Placed on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
