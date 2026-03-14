import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { AppUser } from "../../types/auth";
import type { Book } from "../../types/book";

interface WelcomeBannerProps {
  user: AppUser | null;
  books: Book[];
  loading: boolean;
}

export default function WelcomeBanner({ user, books, loading: _loading }: WelcomeBannerProps) {
  const displayName = user?.fullName || user?.firstName || "Reader";

  return (
    <motion.section
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        background: "linear-gradient(120deg, #2d1a0e 0%, #3a2112 60%, #6b4a35 100%)",
        borderRadius: "14px",
        padding: "30px 24px",
        marginBottom: "20px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}
    >
      <div style={{ position: "absolute", right: "-36px", top: "-34px", width: "150px", height: "150px", borderRadius: "50%", background: "rgba(245,201,133,0.08)" }} />
      <div style={{ position: "absolute", right: "56px", bottom: "-46px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(245,201,133,0.06)" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "620px" }}>
        <span style={{ color: "#f5c985", fontSize: "13px", fontWeight: 600 }}>Welcome back 👋</span>

        <h1 style={{ margin: "10px 0 8px", color: "#fff", fontSize: "36px", fontWeight: 800 }}>
          {displayName}!
        </h1>

        <p style={{ margin: 0, color: "rgba(255,255,255,0.80)", fontSize: "15px", lineHeight: 1.45 }}>
          Ready for your next great read? You have <strong>{books.length}</strong> books waiting in the catalog.
        </p>
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "10px", flexShrink: 0 }}>
        <Link
          to="/catalog"
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            background: "#d7b27c",
            color: "#2d1a0e",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration: "none",
            border: "1px solid #d7b27c",
          }}
        >
          Browse Books
        </Link>
        <Link
          to="/orders"
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
            My Orders
        </Link>
      </div>
    </motion.section>
  );
}
