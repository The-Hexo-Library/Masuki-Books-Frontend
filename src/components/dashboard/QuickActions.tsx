import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, Package, Search, ShoppingCart } from "lucide-react";

const actions = [
  {
    to: "/catalog",
    label: "Browse Books",
    desc: "Explore the full catalog",
    icon: <Search className="w-5 h-5" size={18} color="#4d3021" />,
  },
  {
    to: "/cart",
    label: "View Cart",
    desc: "Review items before checkout",
    icon: <ShoppingCart className="w-5 h-5" size={18} color="#7a5035" />,
    highlighted: true,
  },
  {
    to: "/orders",
    label: "My Orders",
    desc: "Track your order history",
    icon: <Package className="w-5 h-5" size={18} color="#7a5035" />,
  },
  {
    to: "/wishlist",
    label: "Wishlist",
    desc: "Books you've saved",
    icon: <Heart className="w-5 h-5" size={18} color="#7a5035" />,
  },
];

export default function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.18 }}
      className="qa-root"
    >
      <p className="qa-section-label">Quick Actions</p>

      <div className="qa-card-grid">
        {actions.map((action, i) => (
          <motion.div
            key={action.to}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
          >
            <Link to={action.to} className={`qa-card ${action.highlighted ? "qa-card-highlight" : ""}`}>
              <div className="qa-card-icon">{action.icon}</div>
              <div>
                <p className="qa-card-title">{action.label}</p>
                <p className="qa-card-desc">{action.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
