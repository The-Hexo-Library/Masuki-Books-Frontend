import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import { IconMenu, IconSearch, IconBell, IconCart, IconX } from "./Icons";

interface TopNavbarProps {
  onMenuClick: () => void;
  pageTitle?: string;
}

function greet() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function TopNavbar({ onMenuClick, pageTitle = "Dashboard" }: TopNavbarProps) {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/catalog?q=${encodeURIComponent(q)}`);
      setQuery("");
      setSearchOpen(false);
    }
  };

  const initials = ((user?.fullName || user?.email || "U")[0] ?? "U").toUpperCase();
  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "there";

  return (
    <header className="tn-root">
      {/* Left: hamburger + title */}
      <div className="tn-left">
        <button
          className="tn-hamburger dashboard-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <IconMenu size={20} color="#4d3021" />
        </button>

        <div className="tn-title-block">
          <h1 className="tn-title">{pageTitle}</h1>
          <span className="tn-greeting dashboard-greeting">
            {greet()}, {firstName}!
          </span>
        </div>
      </div>

      {/* Right: search + bell + cart + avatar */}
      <div className="tn-right">
        {/* Inline search bar (desktop) */}
        <form className="tn-search-form tn-search-desktop" onSubmit={handleSearch}>
          <span className="tn-search-icon">
            <IconSearch size={15} color="#9e7a5c" />
          </span>
          <input
            className="tn-search-input"
            placeholder="Search books…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        {/* Mobile search toggle */}
        <button
          className="tn-icon-btn tn-search-mobile"
          onClick={() => setSearchOpen((p) => !p)}
          aria-label="Search"
        >
          {searchOpen ? <IconX size={18} color="#4d3021" /> : <IconSearch size={18} color="#4d3021" />}
        </button>

        {/* Bell */}
        <button className="tn-icon-btn tn-bell" aria-label="Notifications">
          <IconBell size={18} color="#4d3021" />
          {/* notification dot */}
          <span className="tn-bell-dot" />
        </button>

        {/* Cart */}
        <Link to="/cart" className="tn-icon-btn tn-cart" aria-label="Cart">
          <IconCart size={18} color="#4d3021" />
          {cartCount > 0 && (
            <span className="tn-cart-badge">{cartCount > 9 ? "9+" : cartCount}</span>
          )}
        </Link>

        {/* Avatar */}
        <Link to="/profile" className="tn-avatar" aria-label="Profile">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName ?? "avatar"} className="tn-avatar-img" />
          ) : (
            <span className="tn-avatar-initials">{initials}</span>
          )}
        </Link>
      </div>

      {/* Mobile search bar (drop-down) */}
      {searchOpen && (
        <form className="tn-mobile-search-bar" onSubmit={handleSearch}>
          <IconSearch size={15} color="#9e7a5c" />
          <input
            ref={inputRef}
            className="tn-search-input"
            placeholder="Search books…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      )}
    </header>
  );
}
