import { Routes, Route } from "react-router-dom";
import HomePage from "../features/home/HomePage";
import LoginPage from "../features/auth/LoginPage";
import SignupPage from "../features/auth/SignupPage";
import DashboardPage from "../features/user/DashboardPage";
import ProfilePage from "../features/user/ProfilePage";
import AdminDashboardPage from "../features/admin/AdminDashboardPage";
import CatalogPage from "../features/catalog/CatalogPage";
import BookDetailPage from "../features/catalog/BookDetailPage";
import CartPage from "../features/cart/CartPage";
import CheckoutPage from "../features/checkout/CheckoutPage";
import OrdersPage from "../features/orders/OrdersPage";
import OrderDetailPage from "../features/orders/OrderDetailPage";
import WishlistPage from "../features/user/WishlistPage";
import SubscriptionPage from "../features/user/SubscriptionPage";
import ForgotPasswordPage from "../features/auth/ForgotPasswordPage";
import MainLayout from "../components/layout/MainLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import type { AppDispatch, RootState } from "../app/store";
import { setAuthInitialized, setUser } from "../features/auth/authSlice";
import { loadCart } from "../features/cart/cartSlice";
import { getCurrentUser, subscribeToAuthChanges } from "../services/authService";

export default function AppRoutes() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const u = await getCurrentUser();

        if (active) {
          dispatch(setUser(u));
        }
      } finally {
        if (active) {
          dispatch(setAuthInitialized(true));
        }
      }
    };

    void bootstrap();

    const unsubscribe = subscribeToAuthChanges((u) => {
      dispatch(setUser(u));
      dispatch(setAuthInitialized(true));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [dispatch]);

  // Load cart when user logs in
  useEffect(() => {
    if (user) {
      void dispatch(loadCart(user.id));
    }
  }, [dispatch, user]);

  return (
    <Routes>
      {/* No Navbar */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Dashboard — has its own layout (sidebar + top navbar) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* With Navbar */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <WishlistPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}