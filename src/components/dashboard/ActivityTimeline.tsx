import { motion } from "framer-motion";
import type { Order } from "../../types/book";

interface ActivityTimelineProps {
  orders: Order[];
  loading: boolean;
}

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  delivered:  { dot: "#22c55e", text: "#15803d", bg: "#dcfce7" },
  shipped:    { dot: "#3b82f6", text: "#1d4ed8", bg: "#dbeafe" },
  processing: { dot: "#f59e0b", text: "#b45309", bg: "#fef9c3" },
  pending:    { dot: "#f59e0b", text: "#b45309", bg: "#fef9c3" },
  cancelled:  { dot: "#ef4444", text: "#b91c1c", bg: "#fee2e2" },
};

function statusStyle(status?: string) {
  const key = (status ?? "").toLowerCase();
  return STATUS_STYLES[key] ?? { dot: "#9e7a5c", text: "#7a5035", bg: "#f7ede5" };
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

function SkeletonRow() {
  return (
    <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "14px 0" }}>
      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#e5ddd6", marginTop: "4px", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ height: "13px", width: "55%", borderRadius: "5px", background: "#ede8e2" }} />
        <div style={{ height: "11px", width: "35%", borderRadius: "5px", background: "#f0ece8" }} />
      </div>
      <div style={{ height: "22px", width: "64px", borderRadius: "99px", background: "#ede8e2" }} />
    </div>
  );
}

export default function ActivityTimeline({ orders, loading }: ActivityTimelineProps) {
  const recentOrders = orders.slice(0, 7);

  return (
    <section className="at-section">
      <div className="at-header">
        <div>
          <p className="at-eyebrow">Recent activity</p>
          <h2 className="at-title">Order History</h2>
        </div>
      </div>

      <div className="at-list">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : recentOrders.length === 0 ? (
          <div className="at-empty">
            <span style={{ fontSize: "32px" }}>📦</span>
            <p>No orders yet</p>
            <p style={{ fontSize: "12px", color: "#9e7a5c" }}>
              Your order history will appear here.
            </p>
          </div>
        ) : (
          recentOrders.map((order, i) => {
            const s = statusStyle(order.status);
            return (
              <motion.div
                key={order.id}
                className="at-row"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
              >
                {/* timeline dot + connector */}
                <div className="at-dot-col">
                  <div
                    className="at-dot"
                    style={{ background: s.dot, boxShadow: `0 0 0 3px ${s.dot}28` }}
                  />
                  {i < recentOrders.length - 1 && <div className="at-connector" />}
                </div>

                {/* content */}
                <div className="at-content">
                  <div className="at-row-top">
                    <span className="at-order-number">
                      {order.orderNumber ?? `#${String(order.id).slice(0, 6)}`}
                    </span>
                    <span
                      className="at-badge"
                      style={{ color: s.text, background: s.bg }}
                    >
                      {order.status ?? "—"}
                    </span>
                  </div>
                  <div className="at-row-meta">
                    {order.total != null && (
                      <span>₹{Number(order.total).toFixed(0)}</span>
                    )}
                    {order.createdAt && (
                      <>
                        <span className="at-sep">·</span>
                        <span>{formatDate(order.createdAt)}</span>
                      </>
                    )}
                    {Array.isArray(order.items) && order.items.length > 0 && (
                      <>
                        <span className="at-sep">·</span>
                        <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </section>
  );
}
