import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import type { Order } from "../../types/book";
import { fetchOrders } from "../../services/orderService";

const statusColor: Record<string, string> = {
  pending: "#e65100",
  confirmed: "#1565c0",
  packed: "#6a1b9a",
  shipped: "#5e35b1",
  delivered: "#2e7d32",
  cancelled: "#c62828",
  refunded: "#795548",
};

export default function OrdersPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await fetchOrders(user.id);
        setOrders(data);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user]);

  return (
    <div style={{ padding: "30px 40px", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ color: "#4d3021", marginBottom: "24px" }}>My Orders</h2>

      {loading && <p>Loading orders...</p>}

      {!loading && orders.length === 0 && (
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
          <p style={{ fontSize: "48px", marginBottom: "16px" }}>📦</p>
          <h3 style={{ color: "#4d3021", marginBottom: "12px" }}>No orders yet</h3>
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
            Start Shopping
          </Link>
        </motion.div>
      )}

      {!loading && orders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <motion.div
                whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  border: "1px solid #e0d0c5",
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <span style={{ fontSize: "13px", color: "#999" }}>Order</span>
                    <p style={{ fontWeight: 600, color: "#4d3021" }}>
                      #{order.id.slice(0, 8)}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: "4px 14px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: `${statusColor[order.status] ?? "#666"}20`,
                      color: statusColor[order.status] ?? "#666",
                      textTransform: "capitalize",
                    }}
                  >
                    {order.status}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#555" }}>
                  <span>
                    {order.items?.length ?? 0} item(s) •{" "}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                  <span style={{ fontWeight: 700, color: "#4d3021", fontSize: "16px" }}>
                    ₹{order.total}
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
