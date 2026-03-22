import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  Crown,
  Gauge,
  Heart,
  Home,
  Library,
  LogIn,
  LogOut,
  Shield,
  ShoppingBag,
  ShoppingCart,
  User,
  UserPlus
} from "lucide-react";
import type { RootState, AppDispatch } from "../../app/store";
import { clearUser } from "../../features/auth/authSlice";
import { resetCart } from "../../features/cart/cartSlice";
import { signOut } from "../../services/authService";
import { fetchMySubscriptionStatus } from "../../services/subscriptionService";
import type { SubscriptionStatus } from "../../types/subscription";

export default function Navbar() {
  const location = useLocation();
  const path = location.pathname;
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setSubscriptionStatus(null);
        return;
      }
      const status = await fetchMySubscriptionStatus();
      setSubscriptionStatus(status);
    };
    void load();
  }, [user]);

  const subscriptionLabel = useMemo(() => {
    if (!user || !subscriptionStatus || !subscriptionStatus.active) {
      return "";
    }
    if (subscriptionStatus.accessPercentage >= 100) {
      return "Premium (Full Access)";
    }
    return `${subscriptionStatus.planName} (${subscriptionStatus.accessPercentage}%)`;
  }, [subscriptionStatus, user]);

  const handleLogout = async () => {
    await signOut();
    dispatch(clearUser());
    dispatch(resetCart());
  };

  const iconLinkBase: React.CSSProperties = {
    color: "white",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
  };

  const navChipStyle = (): React.CSSProperties => {
    return {
      ...iconLinkBase,
      background: "#ffffff",
    };
  };

  const iconMotionProps = {
    whileHover: { y: -2, scale: 1.06, rotate: -2 },
    whileTap: { scale: 0.95 },
    transition: { type: "spring" as const, stiffness: 420, damping: 22 },
  };

  const iconColor = "#4d3021";

  return (
    <nav
      style={{
        background: "#4d3021",
        padding: "16px 50px",
        color: "white",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        position: "relative"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          fontWeight: "700",
          fontSize: "22px"
        }}
      >
        <Link to="/" style={{ color: "white", textDecoration: "none" }}>Masukibooks</Link>
      </div>

      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        {path !== "/" && (
          <motion.div {...iconMotionProps} title="Home">
            <Link style={navChipStyle()} to="/" aria-label="Home">
              <Home size={16} color={iconColor} />
            </Link>
          </motion.div>
        )}

        {path !== "/catalog" && (
          <motion.div {...iconMotionProps} title="Catalog">
            <Link style={navChipStyle()} to="/catalog" aria-label="Catalog">
              <BookOpen size={16} color={iconColor} />
            </Link>
          </motion.div>
        )}

        {user ? (
          <>
            {subscriptionStatus?.active && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "999px",
                  padding: "6px 10px",
                  background: "#256d2e",
                  color: "#fff"
                }}
              >
                {subscriptionLabel}
              </span>
            )}

            {path !== "/dashboard" && (
              <motion.div {...iconMotionProps} title="Dashboard">
                <Link
                  style={navChipStyle()}
                  to="/dashboard"
                  aria-label="Dashboard"
                >
                  <Gauge size={16} color={iconColor} />
                </Link>
              </motion.div>
            )}

            {path !== "/cart" && (
              <motion.div {...iconMotionProps} title="Cart">
                <Link
                  style={{ ...navChipStyle(), position: "relative" }}
                  to="/cart"
                  aria-label="Cart"
                >
                  <ShoppingCart size={16} color={iconColor} />
                  {cartCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-14px",
                        background: "#e65100",
                        color: "#fff",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        fontSize: "11px",
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
              </motion.div>
            )}

            {path !== "/library/public" && (
              <motion.div {...iconMotionProps} title="Public Library">
                <Link
                  style={navChipStyle()}
                  to="/library/public"
                  aria-label="Public Library"
                >
                  <Library size={16} color={iconColor} />
                </Link>
              </motion.div>
            )}

            {path !== "/library/private" && (
              <motion.div {...iconMotionProps} title="Private Library">
                <Link
                  style={navChipStyle()}
                  to="/library/private"
                  aria-label="Private Library"
                >
                  <BadgeCheck size={16} color={iconColor} />
                </Link>
              </motion.div>
            )}

            {path !== "/subscription" && (
              <motion.div {...iconMotionProps} title="Upgrade Plan">
                <Link
                  style={navChipStyle()}
                  to="/subscription"
                  aria-label="Upgrade Plan"
                >
                  <Crown size={16} color={iconColor} />
                </Link>
              </motion.div>
            )}

            {path !== "/wishlist" && (
              <motion.div {...iconMotionProps} title="Wishlist">
                <Link
                  style={navChipStyle()}
                  to="/wishlist"
                  aria-label="Wishlist"
                >
                  <Heart size={16} color={iconColor} />
                </Link>
              </motion.div>
            )}

            {!path.startsWith("/orders") && (
              <motion.div {...iconMotionProps} title="Orders">
                <Link
                  style={navChipStyle()}
                  to="/orders"
                  aria-label="Orders"
                >
                  <ShoppingBag size={16} color={iconColor} />
                </Link>
              </motion.div>
            )}

            {path !== "/profile" && (
              <motion.div {...iconMotionProps} title="Profile">
                <Link
                  style={navChipStyle()}
                  to="/profile"
                  aria-label="Profile"
                >
                  <User size={16} color={iconColor} />
                </Link>
              </motion.div>
            )}

            {user.role === "admin" && path !== "/admin" && (
              <motion.div {...iconMotionProps} title="Admin">
                <Link
                  style={navChipStyle()}
                  to="/admin"
                  aria-label="Admin"
                >
                  <Shield size={16} color={iconColor} />
                </Link>
              </motion.div>
            )}

            <motion.button
              {...iconMotionProps}
              title="Logout"
              onClick={() => {
                void handleLogout();
              }}
              style={{
                ...navChipStyle(),
                color: "white",
                cursor: "pointer",
              }}
              aria-label="Logout"
            >
              <LogOut size={16} color={iconColor} />
            </motion.button>
          </>
        ) : (
          <>
            {path !== "/subscription" && (
              <motion.div {...iconMotionProps} title="Plans">
                <Link
                  style={navChipStyle()}
                  to="/subscription"
                  aria-label="Plans"
                >
                  <Crown size={16} color={iconColor} />
                </Link>
              </motion.div>
            )}

            {path !== "/login" && (
              <motion.div {...iconMotionProps} title="Login">
                <Link
                  style={navChipStyle()}
                  to="/login"
                  aria-label="Login"
                >
                  <LogIn size={16} color={iconColor} />
                </Link>
              </motion.div>
            )}

            {path !== "/signup" && (
              <motion.div {...iconMotionProps} title="Sign Up">
                <Link
                  style={navChipStyle()}
                  to="/signup"
                  aria-label="Sign Up"
                >
                  <UserPlus size={16} color={iconColor} />
                </Link>
              </motion.div>
            )}
          </>
        )}
      </div>
    </nav>
  );
}