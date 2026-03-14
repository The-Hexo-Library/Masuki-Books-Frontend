import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../app/store";
import { clearUser } from "../../features/auth/authSlice";
import { resetCart } from "../../features/cart/cartSlice";
import { signOut } from "../../services/authService";
import {
  IconDashboard,
  IconBook,
  IconCart,
  IconPackage,
  IconHeart,
  IconUser,
  IconSettings,
  IconLogOut,
} from "./Icons";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navLinks = [
  { to: "/dashboard", icon: <IconDashboard size={16} />, label: "Dashboard",   exact: true  },
  { to: "/catalog",   icon: <IconBook     size={16} />, label: "Browse Books", exact: false },
  { to: "/cart",      icon: <IconCart     size={16} />, label: "My Cart",      exact: false },
  { to: "/orders",    icon: <IconPackage  size={16} />, label: "Orders",       exact: false },
  { to: "/wishlist",  icon: <IconHeart    size={16} />, label: "Wishlist",     exact: false },
  { to: "/profile",   icon: <IconUser     size={16} />, label: "Profile",      exact: false },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate  = useNavigate();
  const user      = useSelector((s: RootState) => s.auth.user);

  const handleLogout = async () => {
    await signOut();
    dispatch(clearUser());
    dispatch(resetCart());
    navigate("/login");
  };

  const content = (
    <div className="sb-root">
      {/* Brand */}
      <div className="sb-logo">
        <span className="sb-logo-icon"><IconBook size={20} color="#f5c985" /></span>
        <span className="sb-logo-text">Masukibooks</span>
        <button className="sb-close-btn" onClick={onClose} aria-label="Close sidebar">✕</button>
      </div>

      {/* User info */}
      <div className="sb-user">
        <div className="sb-avatar">
          {(user?.fullName || user?.email || "U")[0].toUpperCase()}
        </div>
        <div className="sb-user-info">
          <p className="sb-user-name">{user?.fullName || "User"}</p>
          <p className="sb-user-email">{user?.email}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sb-nav">
        <span className="sb-section-label">Navigation</span>
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.exact}
            className={({ isActive }) => `sb-link${isActive ? " sb-link-active" : ""}`}
            onClick={onClose}
          >
            <span className="sb-link-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}

        {user?.role === "admin" && (
          <>
            <span className="sb-section-label" style={{ marginTop: "20px" }}>Admin</span>
            <NavLink
              to="/admin"
              className={({ isActive }) => `sb-link${isActive ? " sb-link-active" : ""}`}
              onClick={onClose}
            >
              <span className="sb-link-icon"><IconSettings size={16} /></span>
              Admin Panel
            </NavLink>
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="sb-footer">
        <button className="sb-logout-btn" onClick={() => void handleLogout()}>
          <span className="sb-link-icon"><IconLogOut size={16} /></span>
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="dashboard-sidebar-desktop" style={{ height: "100%", flexShrink: 0 }}>
        {content}
      </div>

      {/* Mobile slide-in */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="sb-overlay"
              className="dashboard-sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998 }}
            />
            <motion.div
              key="sb-panel"
              className="dashboard-sidebar-mobile"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{ position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 999 }}
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
