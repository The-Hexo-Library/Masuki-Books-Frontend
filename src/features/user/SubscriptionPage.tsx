import { useState } from "react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "Forever",
    color: "#e6d5c9",
    accent: "#4d3021",
    features: [
      "Browse full catalog",
      "Add to cart & checkout",
      "Order tracking",
      "1 review per book",
      "Basic search & filter",
    ],
    limited: ["Ads displayed", "No early access", "No exclusive titles"],
  },
  {
    id: "basic",
    name: "Basic",
    price: 99,
    period: "per month",
    color: "#4d3021",
    accent: "#fff",
    badge: "Popular",
    features: [
      "Everything in Free",
      "Ad-free experience",
      "10% off all purchases",
      "Early access to new titles",
      "Exclusive monthly pick",
      "Priority customer support",
    ],
    limited: [],
  },
  {
    id: "premium",
    name: "Premium",
    price: 199,
    period: "per month",
    color: "#2c1810",
    accent: "#f5c37a",
    badge: "Best Value",
    features: [
      "Everything in Basic",
      "20% off all purchases",
      "Free shipping always",
      "Unlimited book previews",
      "2 free eBooks per month",
      "Dedicated account manager",
      "Early beta feature access",
    ],
    limited: [],
  },
];

export default function SubscriptionPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [selected, setSelected] = useState<string | null>(null);
  const [billed, setBilled] = useState<"monthly" | "yearly">("monthly");

  const getPrice = (price: number) => {
    if (price === 0) return "Free";
    return billed === "yearly"
      ? `₹${Math.round(price * 10)}/yr`
      : `₹${price}/mo`;
  };

  const getSaving = (price: number) => {
    if (price === 0 || billed !== "yearly") return null;
    const monthly = price * 12;
    const yearly = price * 10;
    return `Save ₹${monthly - yearly}`;
  };

  const handleSubscribe = (planId: string) => {
    if (planId === "free") return;
    setSelected(planId);
    // In production: redirect to Razorpay/Stripe checkout
    setTimeout(() => {
      alert(`✅ Demo: "${PLANS.find(p => p.id === planId)?.name}" plan selected!\n\nIn production this would open a payment gateway (Razorpay/Stripe).`);
      setSelected(null);
    }, 800);
  };

  return (
    <div style={{ padding: "30px 40px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h2 style={{ color: "#4d3021", fontSize: "28px", marginBottom: "8px" }}>
          Choose Your Plan
        </h2>
        <p style={{ color: "#666", fontSize: "15px", marginBottom: "20px" }}>
          Unlock more with a MasukiBooks subscription
        </p>

        {/* Billing toggle */}
        <div style={{
          display: "inline-flex", background: "#e6d5c9", borderRadius: "30px",
          padding: "4px", gap: "4px",
        }}>
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilled(b)}
              style={{
                padding: "8px 20px", borderRadius: "26px", border: "none",
                fontWeight: 600, fontSize: "14px", cursor: "pointer",
                background: billed === b ? "#4d3021" : "transparent",
                color: billed === b ? "#fff" : "#4d3021",
                transition: "all 0.2s",
              }}
            >
              {b === "monthly" ? "Monthly" : "Yearly"}{b === "yearly" ? " 🎉 2mo free" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Plans grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px",
        alignItems: "start",
      }}>
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            style={{
              background: plan.color,
              borderRadius: "16px",
              padding: "28px",
              position: "relative",
              boxShadow: plan.id !== "free" ? "0 8px 30px rgba(0,0,0,0.15)" : "none",
              border: plan.id === "basic" ? "2px solid #f5c37a" : "none",
            }}
          >
            {/* Badge */}
            {plan.badge && (
              <div style={{
                position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
                background: "#f5c37a", color: "#4d3021", padding: "4px 16px",
                borderRadius: "20px", fontSize: "12px", fontWeight: 700,
              }}>
                {plan.badge}
              </div>
            )}

            <h3 style={{ color: plan.accent, fontSize: "22px", marginBottom: "6px" }}>{plan.name}</h3>

            <div style={{ marginBottom: "20px" }}>
              <span style={{ color: plan.accent, fontSize: "32px", fontWeight: 700 }}>
                {getPrice(plan.price)}
              </span>
              {plan.price > 0 && (
                <span style={{ color: plan.accent, fontSize: "13px", opacity: 0.7, marginLeft: "6px" }}>
                  {billed === "yearly" ? "billed yearly" : plan.period}
                </span>
              )}
              {getSaving(plan.price) && (
                <div style={{
                  display: "inline-block", background: "#246b2a", color: "#fff",
                  fontSize: "11px", fontWeight: 700, padding: "2px 8px",
                  borderRadius: "10px", marginLeft: "8px",
                }}>
                  {getSaving(plan.price)}
                </div>
              )}
            </div>

            {/* Features */}
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: "flex", gap: "8px", color: plan.accent, fontSize: "14px" }}>
                  <span style={{ color: "#4caf50", fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
              {plan.limited.map((f) => (
                <li key={f} style={{ display: "flex", gap: "8px", color: plan.accent, fontSize: "14px", opacity: 0.5 }}>
                  <span>✗</span> {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={plan.id === "free" || selected === plan.id}
              style={{
                width: "100%", padding: "12px", borderRadius: "8px", border: "none",
                fontWeight: 700, fontSize: "15px", cursor: plan.id === "free" ? "default" : "pointer",
                background: plan.id === "free" ? "rgba(255,255,255,0.3)" : "#f5c37a",
                color: "#2c1810",
                opacity: selected === plan.id ? 0.7 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {plan.id === "free"
                ? (user ? "Current Plan" : "Get Started Free")
                : selected === plan.id
                ? "Processing..."
                : `Subscribe to ${plan.name}`}
            </button>
          </motion.div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ marginTop: "40px", padding: "24px", background: "#f5ede8", borderRadius: "12px" }}>
        <h3 style={{ color: "#4d3021", marginBottom: "16px" }}>Frequently Asked Questions</h3>
        {[
          ["Can I cancel anytime?", "Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period."],
          ["Are purchased books still mine after cancelling?", "Absolutely. Any books you purchased remain in your library forever regardless of subscription status."],
          ["What payment methods are accepted?", "We accept all major credit/debit cards, UPI, Net Banking, and Cash on Delivery."],
          ["Is there a student discount?", "Yes! Students get 30% off any plan. Contact support with your institution email to avail."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "16px" }}>
            <p style={{ fontWeight: 600, color: "#4d3021", marginBottom: "4px" }}>Q: {q}</p>
            <p style={{ color: "#666", fontSize: "14px" }}>A: {a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
