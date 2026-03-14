import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../app/store";
import { clearUser } from "../../features/auth/authSlice";
import { resetCart } from "../../features/cart/cartSlice";
import { signOut } from "../../services/authService";

export default function Navbar() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = async () => {
    await signOut();
    dispatch(clearUser());
    dispatch(resetCart());
  };

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
        <motion.div whileHover={{ y: -2 }}>
          <Link style={{ color: "white", textDecoration: "none" }} to="/">
            Home
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -2 }}>
          <Link style={{ color: "white", textDecoration: "none" }} to="/catalog">
            Catalog
          </Link>
        </motion.div>

        {user ? (
          <>
            <motion.div whileHover={{ y: -2 }}>
              <Link
                style={{ color: "white", textDecoration: "none" }}
                to="/dashboard"
              >
                Dashboard
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }}>
              <Link
                style={{ color: "white", textDecoration: "none", position: "relative" }}
                to="/cart"
              >
                Cart
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

            <motion.div whileHover={{ y: -2 }}>
              <Link
                style={{ color: "white", textDecoration: "none" }}
                to="/wishlist"
              >
                Wishlist
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }}>
              <Link
                style={{ color: "white", textDecoration: "none" }}
                to="/orders"
              >
                Orders
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }}>
              <Link
                style={{ color: "white", textDecoration: "none" }}
                to="/profile"
              >
                Profile
              </Link>
            </motion.div>

            {user.role === "admin" && (
              <motion.div whileHover={{ y: -2 }}>
                <Link
                  style={{ color: "white", textDecoration: "none" }}
                  to="/admin"
                >
                  Admin
                </Link>
              </motion.div>
            )}

            <motion.button
              whileHover={{ y: -2 }}
              onClick={() => {
                void handleLogout();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Logout
            </motion.button>
          </>
        ) : (
          <>
            <motion.div whileHover={{ y: -2 }}>
              <Link
                style={{ color: "white", textDecoration: "none" }}
                to="/subscription"
              >
                Plans
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }}>
              <Link
                style={{ color: "white", textDecoration: "none" }}
                to="/login"
              >
                Login
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2 }}>
              <Link
                style={{ color: "white", textDecoration: "none" }}
                to="/signup"
              >
                Sign Up
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </nav>
  );
}