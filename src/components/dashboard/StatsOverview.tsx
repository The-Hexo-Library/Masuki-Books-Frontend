import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { IconBook, IconTag, IconTruck, IconCart } from "./Icons";

interface StatsOverviewProps {
  bookCount: number;
  categoryCount: number;
  orderCount: number;
  cartCount: number;
  loading: boolean;
}

function CountUp({ to, loading, dark = false }: { to: number; loading: boolean; dark?: boolean }) {
  const count      = useMotionValue(0);
  const rounded    = useTransform(count, (v) => Math.round(v));
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (loading) return;
    const ctrl = animate(count, to, { duration: 1.2, ease: "easeOut" });
    return ctrl.stop;
  }, [to, loading, count]);

  useEffect(() => {
    if (displayRef.current) displayRef.current.textContent = "0";
    return rounded.on("change", (v) => {
      if (displayRef.current) displayRef.current.textContent = String(v);
    });
  }, [rounded]);

  if (loading) {
    return (
      <span
        style={{
          display: "inline-block",
          width: "52px",
          height: "28px",
          borderRadius: "6px",
          background: dark
            ? "linear-gradient(90deg,rgba(255,255,255,0.07) 25%,rgba(255,255,255,0.13) 50%,rgba(255,255,255,0.07) 75%)"
            : "linear-gradient(90deg,#f0e8e2 25%,#e8ddd5 50%,#f0e8e2 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
        }}
      />
    );
  }

  return <span ref={displayRef}>0</span>;
}

interface CardDef {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  dark: boolean;
  trend: string | null;
  trendType: "up" | "down" | "neutral";
}

export default function StatsOverview({ bookCount, categoryCount, orderCount, cartCount, loading }: StatsOverviewProps) {
  const cards: CardDef[] = [
    {
      label: "Books in Catalog",
      value: bookCount,
      sub: "Titles available",
      icon: <IconBook size={20} color="#f5c985" />,
      iconBg: "rgba(245,201,133,0.15)",
      dark: true,
      trend: "Explore catalog",
      trendType: "up",
    },
    {
      label: "Genres",
      value: categoryCount,
      sub: "Browse categories",
      icon: <IconTag size={20} color="#7c3aed" />,
      iconBg: "#ede9fe",
      dark: false,
      trend: null,
      trendType: "neutral",
    },
    {
      label: "My Orders",
      value: orderCount,
      sub: "Lifetime orders",
      icon: <IconTruck size={20} color="#1d4ed8" />,
      iconBg: "#dbeafe",
      dark: false,
      trend: orderCount > 0 ? "View history" : null,
      trendType: "neutral",
    },
    {
      label: "Cart Items",
      value: cartCount,
      sub: cartCount > 0 ? "Ready to checkout" : "Cart is empty",
      icon: <IconCart size={20} color="#be185d" />,
      iconBg: "#fce7f3",
      dark: false,
      trend: cartCount > 0 ? "Go to cart" : null,
      trendType: "up",
    },
  ];

  return (
    <div className="sr-row">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          className={`sr-card${card.dark ? " sr-card-dark" : ""}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: i * 0.08 }}
          whileHover={{ y: -3 }}
        >
          {/* Decorative bar-chart flourish on dark card */}
          {card.dark && (
            <div className="sr-card-deco" aria-hidden>
              {[36, 22, 44, 18, 30, 14].map((h, j) => (
                <div
                  key={j}
                  style={{
                    width: "4px",
                    height: `${h}px`,
                    borderRadius: "2px",
                    background: `rgba(245,201,133,${0.10 + j * 0.04})`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="sr-icon" style={{ background: card.iconBg }}>
            {card.icon}
          </div>

          <span className={`sr-label${card.dark ? " sr-label-light" : ""}`}>
            {card.label}
          </span>

          <span className={`sr-number${card.dark ? " sr-number-light" : ""}`}>
            <CountUp to={card.value} loading={loading} dark={card.dark} />
          </span>

          <span className={`sr-sub${card.dark ? " sr-sub-light" : ""}`}>
            {card.sub}
          </span>

          {card.trend && !loading && (
            <span className={`sr-trend sr-trend-${card.trendType}`}>
              {card.trend}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
