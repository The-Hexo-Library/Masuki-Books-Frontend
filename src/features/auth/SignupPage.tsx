import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import background from "../../assets/login-pattern.jpeg";
import { signUp, sendEmailOtpSupabase } from "../../services/authService";

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

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type Step = "form" | "emailOtp" | "phoneOtp" | "success";

export default function SignupPage() {
  // Form fields
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [password, setPassword] = useState("");

  // OTP state
  const [step, setStep]               = useState<Step>("form");
  const emailOtpRef                   = useRef("");
  const phoneOtpRef                   = useRef("");
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [phoneOtpInput, setPhoneOtpInput] = useState("");

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const [error, setError]           = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Step 1: validate form and send email OTP ─────────────────────────────
  const handleSubmitForm = async () => {
    setError("");
    if (!name.trim())                          { setError("Name is required."); return; }
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address."); return; }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number (e.g. +919876543210)."); return;
    }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setIsSubmitting(true);
    const otp = generateOtp();
    emailOtpRef.current = otp;
    // Try to send via Supabase (may or may not arrive depending on plan)
    await sendEmailOtpSupabase(email);
    setIsSubmitting(false);
    setCooldown(30);
    setStep("emailOtp");
  };

  // ── Step 2: verify email OTP ──────────────────────────────────────────────
  const handleVerifyEmail = () => {
    setError("");
    if (emailOtpInput.trim() !== emailOtpRef.current) {
      setError("Incorrect OTP. Please try again.");
      return;
    }
    const otp = generateOtp();
    phoneOtpRef.current = otp;
    setCooldown(30);
    setEmailOtpInput("");
    setStep("phoneOtp");
  };

  // ── Resend email OTP ──────────────────────────────────────────────────────
  const handleResendEmail = async () => {
    const otp = generateOtp();
    emailOtpRef.current = otp;
    await sendEmailOtpSupabase(email);
    setCooldown(30);
  };

  // ── Step 3: verify phone OTP and create account ───────────────────────────
  const handleVerifyPhone = async () => {
    setError("");
    if (phoneOtpInput.trim() !== phoneOtpRef.current) {
      setError("Incorrect OTP. Please try again.");
      return;
    }
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

  const handleResendPhone = () => {
    phoneOtpRef.current = generateOtp();
    setCooldown(30);
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
        {/* ── STEP INDICATOR ───────────────────────────────── */}
        {step !== "success" && (
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "4px" }}>
            {(["form", "emailOtp", "phoneOtp"] as Step[]).map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700,
                  background: step === s ? "#4d3021" : ["form","emailOtp","phoneOtp"].indexOf(step) > i ? "#246b2a" : "#c4a898",
                  color: "#fff",
                }}>{["form","emailOtp","phoneOtp"].indexOf(step) > i ? "✓" : i + 1}</div>
                {i < 2 && <div style={{ width: 24, height: 2, background: ["form","emailOtp","phoneOtp"].indexOf(step) > i ? "#246b2a" : "#c4a898" }} />}
              </div>
            ))}
          </div>
        )}

        {/* ── FORM STEP ─────────────────────────────────────── */}
        {step === "form" && (
          <>
            <h2 style={{ textAlign: "center", color: "#4d3021", margin: 0 }}>Create Account</h2>

            <input type="text"     placeholder="Full name"                    value={name}     onChange={(e) => setName(e.target.value)}     style={INPUT_STYLE} />
            <input type="email"    placeholder="Email address"               value={email}    onChange={(e) => setEmail(e.target.value)}    style={INPUT_STYLE} />
            <input type="tel"      placeholder="Phone (e.g. +919876543210)" value={phone}    onChange={(e) => setPhone(e.target.value)}    style={INPUT_STYLE} />
            <input type="password" placeholder="Create password (min 6)"   value={password} onChange={(e) => setPassword(e.target.value)} style={INPUT_STYLE} />

            <button onClick={() => { void handleSubmitForm(); }} disabled={isSubmitting} style={BTN_STYLE(isSubmitting)}>
              {isSubmitting ? "Sending OTP..." : "Continue"}
            </button>

            {error && <p style={{ color: "#8f2a2a", fontSize: "13px", textAlign: "center", margin: 0 }}>{error}</p>}

            <p style={{ textAlign: "center", fontSize: "14px", margin: 0 }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "#4d3021", fontWeight: 600 }}>Login</Link>
            </p>
          </>
        )}

        {/* ── EMAIL OTP STEP ────────────────────────────────── */}
        {step === "emailOtp" && (
          <>
            <h2 style={{ textAlign: "center", color: "#4d3021", margin: 0 }}>Verify Email</h2>
            <p style={{ textAlign: "center", fontSize: "13px", color: "#6b4630", margin: 0 }}>
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>

            {/* Demo banner showing the OTP */}
            <div style={{
              background: "#fffbea", border: "1px dashed #e8a000",
              borderRadius: "8px", padding: "12px", textAlign: "center",
            }}>
              <p style={{ fontSize: "12px", color: "#7a5c00", margin: "0 0 4px" }}>📧 Demo Mode — Your OTP</p>
              <p style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "6px", color: "#4d3021", margin: 0 }}>
                {emailOtpRef.current}
              </p>
            </div>

            <input
              type="text" inputMode="numeric" maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={emailOtpInput}
              onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, ""))}
              style={{ ...INPUT_STYLE, textAlign: "center", fontSize: "20px", letterSpacing: "6px", fontWeight: 700 }}
            />

            <button onClick={handleVerifyEmail} disabled={emailOtpInput.length !== 6} style={BTN_STYLE(emailOtpInput.length !== 6)}>
              Verify Email
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => { setStep("form"); setError(""); }}
                style={{ background: "none", border: "none", color: "#6b4630", cursor: "pointer", fontSize: "13px" }}
              >← Back</button>
              <button
                onClick={() => { void handleResendEmail(); }}
                disabled={cooldown > 0}
                style={{ background: "none", border: "none", color: cooldown > 0 ? "#aaa" : "#4d3021", cursor: cooldown > 0 ? "default" : "pointer", fontSize: "13px", fontWeight: 600 }}
              >{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}</button>
            </div>

            {error && <p style={{ color: "#8f2a2a", fontSize: "13px", textAlign: "center", margin: 0 }}>{error}</p>}
          </>
        )}

        {/* ── PHONE OTP STEP ────────────────────────────────── */}
        {step === "phoneOtp" && (
          <>
            <h2 style={{ textAlign: "center", color: "#4d3021", margin: 0 }}>Verify Phone</h2>
            <p style={{ textAlign: "center", fontSize: "13px", color: "#6b4630", margin: 0 }}>
              Enter the 6-digit code sent to <strong>{phone}</strong>
            </p>

            {/* Demo banner showing the OTP */}
            <div style={{
              background: "#eaf5ff", border: "1px dashed #0077cc",
              borderRadius: "8px", padding: "12px", textAlign: "center",
            }}>
              <p style={{ fontSize: "12px", color: "#004f88", margin: "0 0 4px" }}>📱 Demo Mode — Your OTP</p>
              <p style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "6px", color: "#4d3021", margin: 0 }}>
                {phoneOtpRef.current}
              </p>
            </div>

            <input
              type="text" inputMode="numeric" maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={phoneOtpInput}
              onChange={(e) => setPhoneOtpInput(e.target.value.replace(/\D/g, ""))}
              style={{ ...INPUT_STYLE, textAlign: "center", fontSize: "20px", letterSpacing: "6px", fontWeight: 700 }}
            />

            <button onClick={() => { void handleVerifyPhone(); }} disabled={isSubmitting || phoneOtpInput.length !== 6} style={BTN_STYLE(isSubmitting || phoneOtpInput.length !== 6)}>
              {isSubmitting ? "Creating account..." : "Verify & Create Account"}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => { setStep("emailOtp"); setError(""); }}
                style={{ background: "none", border: "none", color: "#6b4630", cursor: "pointer", fontSize: "13px" }}
              >← Back</button>
              <button
                onClick={handleResendPhone}
                disabled={cooldown > 0}
                style={{ background: "none", border: "none", color: cooldown > 0 ? "#aaa" : "#4d3021", cursor: cooldown > 0 ? "default" : "pointer", fontSize: "13px", fontWeight: 600 }}
              >{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}</button>
            </div>

            {error && <p style={{ color: "#8f2a2a", fontSize: "13px", textAlign: "center", margin: 0 }}>{error}</p>}
          </>
        )}

        {/* ── SUCCESS STEP ──────────────────────────────────── */}
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
                Both your email and phone have been verified.
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