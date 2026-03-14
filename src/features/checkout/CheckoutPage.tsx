import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../app/store";
import type { ShippingInfo } from "../../types/book";
import { getCartTotal } from "../../services/cartService";
import { createOrder } from "../../services/orderService";
import { emptyCart } from "../cart/cartSlice";

const PAYMENT_METHODS = [
  { value: "card", label: "Credit / Debit Card" },
  { value: "upi", label: "UPI" },
  { value: "netbanking", label: "Net Banking" },
  { value: "cod", label: "Cash on Delivery" },
];

export default function CheckoutPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const { items } = useSelector((state: RootState) => state.cart);

  const [shipping, setShipping] = useState<ShippingInfo>({
    name: user?.fullName ?? "",
    address: "",
    city: "",
    zip: "",
    country: "India",
    phone: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("card");
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"shipping" | "payment" | "review" | "success">("shipping");
  const [orderId, setOrderId] = useState("");

  const subtotal = getCartTotal(items);
  const total = Math.max(0, subtotal - discount);

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === "MASUKI10") {
      setDiscount(Math.round(subtotal * 0.1));
      setPromoApplied(true);
    } else if (promoCode.toUpperCase() === "FLAT50") {
      setDiscount(50);
      setPromoApplied(true);
    } else {
      setDiscount(0);
      setPromoApplied(false);
      setError("Invalid promo code");
      setTimeout(() => setError(""), 2000);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) return;
    setSubmitting(true);
    setError("");
    try {
      const order = await createOrder(
        user.id,
        items,
        shipping,
        paymentMethod,
        promoApplied ? promoCode : undefined,
        discount
      );
      setOrderId(order.id);
      await dispatch(emptyCart(user.id));
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  const shippingValid =
    shipping.name.trim() &&
    shipping.address.trim() &&
    shipping.city.trim() &&
    shipping.zip.trim() &&
    shipping.country.trim();

  if (items.length === 0 && step !== "success") {
    return (
      <div style={{ padding: "60px", textAlign: "center" }}>
        <h2 style={{ color: "#4d3021" }}>Your cart is empty</h2>
        <button
          onClick={() => navigate("/catalog")}
          style={{
            marginTop: "16px",
            padding: "10px 24px",
            background: "#4d3021",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Browse Books
        </button>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div style={{ padding: "60px", textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "#2e7d32",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <span style={{ color: "#fff", fontSize: "40px" }}>✓</span>
        </div>
        <h2 style={{ color: "#4d3021", marginBottom: "8px" }}>Order Placed!</h2>
        <p style={{ color: "#666", marginBottom: "8px" }}>
          Your order <strong>#{orderId.slice(0, 8)}</strong> has been confirmed.
        </p>
        <p style={{ color: "#666", marginBottom: "24px" }}>
          Total: <strong>₹{total}</strong> • Payment: {paymentMethod.toUpperCase()}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => navigate("/orders")}
            style={{
              padding: "10px 24px",
              background: "#4d3021",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            View Orders
          </button>
          <button
            onClick={() => navigate("/catalog")}
            style={{
              padding: "10px 24px",
              border: "1px solid #4d3021",
              color: "#4d3021",
              background: "#fff",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "30px 40px", maxWidth: "800px", margin: "0 auto" }}>
      <h2 style={{ color: "#4d3021", marginBottom: "24px" }}>Checkout</h2>

      {/* Steps indicator */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "30px" }}>
        {(["shipping", "payment", "review"] as const).map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              padding: "10px",
              textAlign: "center",
              borderRadius: "8px",
              background:
                step === s ? "#4d3021" : i < ["shipping", "payment", "review"].indexOf(step) ? "#c7aa99" : "#f0e8e2",
              color: step === s ? "#fff" : "#4d3021",
              fontWeight: step === s ? 600 : 400,
              cursor: "pointer",
              fontSize: "14px",
            }}
            onClick={() => {
              const steps = ["shipping", "payment", "review"] as const;
              if (steps.indexOf(s) <= steps.indexOf(step)) {
                setStep(s);
              }
            }}
          >
            {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
          </div>
        ))}
      </div>

      {/* Shipping Step */}
      {step === "shipping" && (
        <div style={{ background: "#f5ede8", borderRadius: "12px", padding: "24px" }}>
          <h3 style={{ color: "#4d3021", marginBottom: "16px" }}>Shipping Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <input
              placeholder="Full Name"
              value={shipping.name}
              onChange={(e) => setShipping((p) => ({ ...p, name: e.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="Phone"
              value={shipping.phone}
              onChange={(e) => setShipping((p) => ({ ...p, phone: e.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="Address"
              value={shipping.address}
              onChange={(e) => setShipping((p) => ({ ...p, address: e.target.value }))}
              style={{ ...inputStyle, gridColumn: "1 / -1" }}
            />
            <input
              placeholder="City"
              value={shipping.city}
              onChange={(e) => setShipping((p) => ({ ...p, city: e.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="ZIP / Postal Code"
              value={shipping.zip}
              onChange={(e) => setShipping((p) => ({ ...p, zip: e.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="Country"
              value={shipping.country}
              onChange={(e) => setShipping((p) => ({ ...p, country: e.target.value }))}
              style={{ ...inputStyle, gridColumn: "1 / -1" }}
            />
          </div>
          <button
            disabled={!shippingValid}
            onClick={() => setStep("payment")}
            style={{
              marginTop: "16px",
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: "#4d3021",
              color: "#fff",
              cursor: shippingValid ? "pointer" : "not-allowed",
              opacity: shippingValid ? 1 : 0.5,
              fontWeight: 600,
            }}
          >
            Continue to Payment
          </button>
        </div>
      )}

      {/* Payment Step */}
      {step === "payment" && (
        <div style={{ background: "#f5ede8", borderRadius: "12px", padding: "24px" }}>
          <h3 style={{ color: "#4d3021", marginBottom: "16px" }}>Payment Method</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {PAYMENT_METHODS.map((pm) => (
              <label
                key={pm.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: paymentMethod === pm.value ? "2px solid #4d3021" : "1px solid #d5bcae",
                  background: paymentMethod === pm.value ? "#fff" : "transparent",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === pm.value}
                  onChange={() => setPaymentMethod(pm.value)}
                />
                {pm.label}
              </label>
            ))}
          </div>

          {/* Promo Code */}
          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ color: "#4d3021", marginBottom: "8px" }}>Promo Code</h4>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                placeholder="Enter code (try MASUKI10)"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  setPromoApplied(false);
                  setDiscount(0);
                }}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleApplyPromo}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #4d3021",
                  background: promoApplied ? "#2e7d32" : "transparent",
                  color: promoApplied ? "#fff" : "#4d3021",
                  cursor: "pointer",
                }}
              >
                {promoApplied ? "✓ Applied" : "Apply"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setStep("shipping")}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "1px solid #4d3021",
                background: "transparent",
                color: "#4d3021",
                cursor: "pointer",
              }}
            >
              Back
            </button>
            <button
              onClick={() => setStep("review")}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background: "#4d3021",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Review Order
            </button>
          </div>
        </div>
      )}

      {/* Review Step */}
      {step === "review" && (
        <div style={{ background: "#f5ede8", borderRadius: "12px", padding: "24px" }}>
          <h3 style={{ color: "#4d3021", marginBottom: "16px" }}>Order Review</h3>

          {/* Items summary */}
          <div style={{ marginBottom: "20px" }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #e0d0c5",
                  fontSize: "14px",
                }}
              >
                <span>
                  {item.book?.title} × {item.quantity}
                </span>
                <span style={{ fontWeight: 600 }}>
                  ₹{(item.book?.price ?? 0) * item.quantity}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ fontSize: "14px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#2e7d32", marginBottom: "4px" }}>
                <span>Discount ({promoCode})</span>
                <span>-₹{discount}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "18px", marginTop: "8px", color: "#4d3021" }}>
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </div>

          {/* Shipping summary */}
          <div style={{ fontSize: "13px", color: "#555", marginBottom: "16px" }}>
            <strong>Ship to:</strong> {shipping.name}, {shipping.address}, {shipping.city} - {shipping.zip}, {shipping.country}
            <br />
            <strong>Payment:</strong> {PAYMENT_METHODS.find((p) => p.value === paymentMethod)?.label}
          </div>

          {error && <p style={{ color: "#8f2a2a", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setStep("payment")}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "1px solid #4d3021",
                background: "transparent",
                color: "#4d3021",
                cursor: "pointer",
              }}
            >
              Back
            </button>
            <button
              onClick={() => { void handlePlaceOrder(); }}
              disabled={submitting}
              style={{
                padding: "12px 32px",
                borderRadius: "8px",
                border: "none",
                background: "#4d3021",
                color: "#fff",
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "16px",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Placing Order..." : "Place Order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #c7aa99",
  fontSize: "14px",
};
