import type { RootState } from "../../app/store";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import type { Book, Order } from "../../types/book";
import { fetchBooks } from "../../services/booksService";
import { fetchOrders } from "../../services/orderService";
import { fetchCategories } from "../../services/categoryService";
import Sidebar from "../../components/dashboard/Sidebar";
import DashboardNavbar from "../../components/dashboard/DashboardNavbar";
import WelcomeBanner from "../../components/dashboard/WelcomeBanner";
import StatsCard from "../../components/dashboard/StatsCard";
import RecentBooks from "../../components/dashboard/RecentBooks";
import ActivityFeed from "../../components/dashboard/ActivityFeed";
import QuickActions from "../../components/dashboard/QuickActions";
import { AlertTriangle, BookOpen, Library, Package, ShoppingCart } from "lucide-react";
import "./DashboardPage.css";

export default function DashboardPage() {
  const user      = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const [books,         setBooks]         = useState<Book[]>([]);
  const [orders,        setOrders]        = useState<Order[]>([]);
  const [categoryCount, setCategoryCount] = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bookList, orderList, categoryList] = await Promise.all([
          fetchBooks({ size: 50 }),
          user ? fetchOrders(user.id) : Promise.resolve([]),
          fetchCategories(),
        ]);
        setBooks(bookList);
        setOrders(orderList);
        setCategoryCount(categoryList.length);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError("Failed to load some dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user]);

  return (
    <div className="dashboard-root">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="dashboard-main">
        <DashboardNavbar onMenuClick={() => setSidebarOpen(true)} pageTitle="Dashboard" />

        <main className="dashboard-body">
          {error && (
            <div className="db-error-banner">
              <AlertTriangle className="w-5 h-5" size={18} /> {error}
            </div>
          )}

          <WelcomeBanner user={user} books={books} loading={loading} />

          {/* 4 statistics cards */}
          <div className="dashboard-stats-grid">
            <StatsCard
              label="Books Available"
              value={books.length}
              icon={<BookOpen className="w-6 h-6" size={22} />}
              accent="#6b3e26"
              subtext="In the catalog"
              loading={loading}
              index={0}
            />
            <StatsCard
              label="Categories"
              value={categoryCount}
              icon={<Library className="w-6 h-6" size={22} />}
              accent="#7c3aed"
              subtext="Genres & topics"
              loading={loading}
              index={1}
            />
            <StatsCard
              label="My Orders"
              value={orders.length}
              icon={<Package className="w-6 h-6" size={22} />}
              accent="#1d4ed8"
              subtext="Total placed"
              loading={loading}
              index={2}
            />
            <StatsCard
              label="Cart Items"
              value={cartCount}
              icon={<ShoppingCart className="w-6 h-6" size={22} />}
              accent="#be185d"
              subtext="Ready to checkout"
              index={3}
            />
          </div>

          {/* Quick actions strip */}
          <QuickActions />

          {/* Recent books + activity feed */}
          <div className="dashboard-bottom-grid">
            <RecentBooks books={books} loading={loading} />
            <ActivityFeed orders={orders} loading={loading} />
          </div>
        </main>
      </div>
    </div>
  );
}
