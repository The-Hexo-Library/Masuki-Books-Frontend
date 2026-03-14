import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";

interface DashboardNavbarProps {
  onMenuClick: () => void;
  pageTitle?: string;
}

export default function DashboardNavbar({ onMenuClick, pageTitle = "Dashboard" }: DashboardNavbarProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <header
      style={{
        height: "64px",
        background: "#fff",
        borderBottom: "1px solid #f0e8e2",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: "16px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="dashboard-menu-btn"
        style={{
          background: "none",
          border: "none",
          fontSize: "22px",
          cursor: "pointer",
          color: "#4d3021",
          padding: "4px",
          borderRadius: "6px",
          lineHeight: 1,
          display: "none",
        }}
        aria-label="Open navigation"
      >
        ☰
      </button>

      {/* Page title */}
      <h1
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "#2d1a0e",
          margin: 0,
        }}
      >
        {pageTitle}
      </h1>

      {/* Greeting (hidden on small screens) */}
      <span
        className="dashboard-greeting"
        style={{
          fontSize: "14px",
          color: "#9e7a5c",
          marginLeft: "8px",
        }}
      >
        {greeting}, {user?.firstName || user?.fullName?.split(" ")[0] || "there"}!
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Cart */}
      <Link
        to="/cart"
        style={{
          position: "relative",
          background: "#f5ede8",
          border: "none",
          borderRadius: "8px",
          width: "38px",
          height: "38px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          cursor: "pointer",
          textDecoration: "none",
          transition: "background 0.15s",
        }}
        title="Cart"
        onMouseEnter={(e) => (e.currentTarget.style.background = "#ead9cf")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#f5ede8")}
      >
        🛒
        {cartCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              background: "#c0392b",
              color: "#fff",
              borderRadius: "50%",
              width: "18px",
              height: "18px",
              fontSize: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            {cartCount}
          </span>
        )}
      </Link>

      {/* Avatar */}
      <Link
        to="/profile"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f5c985, #e8a04c)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: 700,
            color: "#4d3021",
            flexShrink: 0,
          }}
        >
          {(user?.fullName || user?.email || "U")[0].toUpperCase()}
        </div>
        <span
          className="dashboard-username"
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#4d3021",
          }}
        >
          {user?.fullName || user?.email}
        </span>
      </Link>
    </header>
  );
}
