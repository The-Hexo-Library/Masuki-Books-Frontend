import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import type { Order } from "../../types/book";

interface ActivityFeedProps {
  orders: Order[];
  loading?: boolean;
}

const statusMeta: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:    { label: "Pending",    color: "#92400e", bg: "#fef3c7", icon: "⏳" },
  processing: { label: "Processing", color: "#1e40af", bg: "#dbeafe", icon: "⚙️" },
  shipped:    { label: "Shipped",    color: "#1d4ed8", bg: "#dbeafe", icon: "🚚" },
  delivered:  { label: "Delivered",  color: "#166534", bg: "#dcfce7", icon: "✅" },
  cancelled:  { label: "Cancelled",  color: "#991b1b", bg: "#fee2e2", icon: "✕" },
};

function getStatusMeta(status: string) {
  return (
    statusMeta[status.toLowerCase()] ?? {
      label: status,
      color: "#4d3021",
      bg: "#f5ede8",
      icon: "📄",
    }
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function FeedSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 0",
        borderBottom: "1px solid #f5ede8",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "linear-gradient(90deg, #f0e8e2 25%, #e8ddd5 50%, #f0e8e2 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div
          style={{
            height: "13px",
            width: "65%",
            borderRadius: "4px",
            background: "linear-gradient(90deg, #f0e8e2 25%, #e8ddd5 50%, #f0e8e2 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
        <div
          style={{
            height: "11px",
            width: "40%",
            borderRadius: "4px",
            background: "linear-gradient(90deg, #f0e8e2 25%, #e8ddd5 50%, #f0e8e2 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
      </div>
    </div>
  );
}

export default function ActivityFeed({ orders, loading = false }: ActivityFeedProps) {
  const recent = orders.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3 }}
      style={{
        background: "#fff",
        borderRadius: "14px",
        padding: "24px",
        boxShadow: "0 2px 10px rgba(77,48,33,0.07)",
        border: "1px solid #f0e8e2",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "6px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#2d1a0e" }}>
            Recent Orders
          </h2>
          <p style={{ fontSize: "13px", color: "#9e7a5c", marginTop: "2px" }}>
            Your latest order activity
          </p>
        </div>
        <Link
          to="/orders"
          style={{
            fontSize: "13px",
            color: "#4d3021",
            textDecoration: "none",
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: "8px",
            background: "#f5ede8",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#ead9cf")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#f5ede8")}
        >
          View all →
        </Link>
      </div>

      {/* Feed items */}
      <div>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <FeedSkeleton key={i} />)
          : recent.length === 0
          ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#9e7a5c",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Package className="w-6 h-6" size={40} />
              </div>
              <p style={{ marginTop: "12px", fontSize: "14px" }}>
                No orders yet. Start shopping!
              </p>
              <Link
                to="/catalog"
                style={{
                  marginTop: "10px",
                  display: "inline-block",
                  color: "#4d3021",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                Browse books →
              </Link>
            </div>
          )
          : recent.map((order, i) => {
              const meta = getStatusMeta(order.status);
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.07 }}
                >
                  <Link
                    to={`/orders/${order.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "14px 0",
                      borderBottom: i < recent.length - 1 ? "1px solid #f5ede8" : "none",
                      textDecoration: "none",
                      color: "inherit",
                      transition: "background 0.15s",
                      borderRadius: "6px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.paddingLeft = "8px")}
                    onMouseLeave={(e) => (e.currentTarget.style.paddingLeft = "0")}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: meta.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        flexShrink: 0,
                      }}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#2d1a0e",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        Order #{(order.orderNumber ?? order.id).slice(0, 8)}
                        {" "}
                        <span style={{ fontWeight: 400, color: "#9e7a5c", fontSize: "12px" }}>
                          · {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </p>
                      <p style={{ fontSize: "12px", color: "#9e7a5c", marginTop: "2px" }}>
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    {/* Right side */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#2d1a0e",
                        }}
                      >
                        ₹{order.total.toLocaleString()}
                      </p>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: meta.color,
                          background: meta.bg,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          marginTop: "4px",
                          display: "inline-block",
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
      </div>
    </motion.div>
  );
}
