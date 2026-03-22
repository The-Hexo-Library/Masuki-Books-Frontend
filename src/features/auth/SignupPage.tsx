import { useState } from "react";
import { Link } from "react-router-dom";
import background from "../../assets/login-pattern.jpeg";
import { signUp } from "../../services/authService";

const INPUT_STYLE: React.CSSProperties = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #b89f8f",
  fontSize: "14px",
  width: "100%",
  boxSizing: "border-box",
};

const BTN_STYLE = (disabled: boolean): React.CSSProperties => ({
  padding: "10px",
  background: "#4d3021",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.7 : 1,
  fontWeight: 600,
  fontSize: "14px",
  width: "100%",
});

type Step = "form" | "success";

export default function SignupPage() {
  // Form fields
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [password, setPassword] = useState("");

  const [step, setStep]               = useState<Step>("form");

  const [error, setError]           = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitForm = async () => {
    setError("");
    if (!name.trim())                          { setError("Name is required."); return; }
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address."); return; }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number (e.g. +919876543210)."); return;
    }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setIsSubmitting(true);
    try {
      await signUp(name, email, password, phone);
      setStep("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        style={{
          width: "380px",
          padding: "35px",
          background: "#e6d5c9",
          borderRadius: "10px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {step === "form" && (
          <>
            <h2 style={{ textAlign: "center", color: "#4d3021", margin: 0 }}>Create Account</h2>

            <input type="text"     placeholder="Full name"                    value={name}     onChange={(e) => setName(e.target.value)}     style={INPUT_STYLE} />
            <input type="email"    placeholder="Email address"               value={email}    onChange={(e) => setEmail(e.target.value)}    style={INPUT_STYLE} />
            <input type="tel"      placeholder="Phone (e.g. +919876543210)" value={phone}    onChange={(e) => setPhone(e.target.value)}    style={INPUT_STYLE} />
            <input type="password" placeholder="Create password (min 6)"   value={password} onChange={(e) => setPassword(e.target.value)} style={INPUT_STYLE} />

            <button onClick={() => { void handleSubmitForm(); }} disabled={isSubmitting} style={BTN_STYLE(isSubmitting)}>
              {isSubmitting ? "Creating account..." : "Sign Up"}
            </button>

            {error && <p style={{ color: "#8f2a2a", fontSize: "13px", textAlign: "center", margin: 0 }}>{error}</p>}

            <p style={{ textAlign: "center", fontSize: "14px", margin: 0 }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "#4d3021", fontWeight: 600 }}>Login</Link>
            </p>
          </>
        )}

        {step === "success" && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, margin: "0 auto 16px",
                borderRadius: "50%", background: "#246b2a",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 30,
              }}>✓</div>
              <h2 style={{ color: "#4d3021", marginBottom: 8 }}>Account Created!</h2>
              <p style={{ color: "#4d3021", fontSize: 15, lineHeight: 1.6 }}>
                Welcome, <strong>{name}</strong>!<br />
                Your account has been created successfully.
              </p>
            </div>
            <Link to="/login" style={{
              display: "block", textAlign: "center", padding: "10px",
              background: "#4d3021", color: "white", borderRadius: "6px",
              textDecoration: "none", fontWeight: 600,
            }}>Go to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}