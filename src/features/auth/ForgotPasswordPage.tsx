import { useState } from "react";
import { Link } from "react-router-dom";
import background from "../../assets/login-pattern.jpeg";
import { isSupabaseConfigured, supabase } from "../../services/supabase";

type Step = "email" | "sent" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendReset = async () => {
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/forgot-password?reset=true`,
        });
        if (sbError) throw new Error(sbError.message);
      }
      setStep("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error: sbError } = await supabase.auth.updateUser({ password: newPassword });
        if (sbError) throw new Error(sbError.message);
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px", borderRadius: "6px", border: "1px solid #b89f8f",
    fontSize: "14px", width: "100%", boxSizing: "border-box",
  };
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: "10px", background: "#4d3021", color: "white",
    border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "14px",
    width: "100%", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1,
  });

  return (
    <div style={{
      minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center",
      backgroundImage: `url(${background})`, backgroundSize: "cover", backgroundPosition: "center",
    }}>
      <div style={{
        width: "380px", padding: "36px", background: "#e6d5c9", borderRadius: "10px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: "14px",
      }}>

        {/* STEP: enter email */}
        {step === "email" && (
          <>
            <h2 style={{ color: "#4d3021", textAlign: "center", margin: 0 }}>Reset Password</h2>
            <p style={{ fontSize: "13px", color: "#6b4630", textAlign: "center", margin: 0 }}>
              Enter your registered email and we'll send you a reset link.
            </p>
            <input
              type="email" placeholder="Your email address"
              value={email} onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <button onClick={() => void handleSendReset()} disabled={loading} style={btnStyle(loading)}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            {error && <p style={{ color: "#8f2a2a", fontSize: "13px", textAlign: "center", margin: 0 }}>{error}</p>}
            <p style={{ textAlign: "center", fontSize: "14px", margin: 0 }}>
              <Link to="/login" style={{ color: "#4d3021", fontWeight: 600 }}>← Back to Login</Link>
            </p>
          </>
        )}

        {/* STEP: email sent */}
        {step === "sent" && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, margin: "0 auto 16px", borderRadius: "50%",
                background: "#4d3021", display: "flex", alignItems: "center",
                justifyContent: "center", color: "white", fontSize: 28,
              }}>📧</div>
              <h2 style={{ color: "#4d3021", marginBottom: 8 }}>Check Your Email</h2>
              <p style={{ color: "#6b4630", fontSize: "14px", lineHeight: 1.6 }}>
                A password reset link has been sent to <strong>{email}</strong>.<br />
                Click the link in the email to reset your password.
              </p>
              {/* Demo note */}
              <div style={{
                background: "#fffbea", border: "1px dashed #e8a000",
                borderRadius: "8px", padding: "10px", marginTop: "12px",
              }}>
                <p style={{ fontSize: "12px", color: "#7a5c00", margin: 0 }}>
                  🔒 Demo Mode — Click below to set a new password directly.
                </p>
              </div>
            </div>
            <button onClick={() => setStep("reset")} style={btnStyle(false)}>
              Set New Password
            </button>
            <p style={{ textAlign: "center", fontSize: "14px", margin: 0 }}>
              <Link to="/login" style={{ color: "#4d3021", fontWeight: 600 }}>← Back to Login</Link>
            </p>
          </>
        )}

        {/* STEP: enter new password */}
        {step === "reset" && (
          <>
            <h2 style={{ color: "#4d3021", textAlign: "center", margin: 0 }}>New Password</h2>
            <input
              type="password" placeholder="New password (min 6)"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password" placeholder="Confirm new password"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
            <button onClick={() => void handleResetPassword()} disabled={loading} style={btnStyle(loading)}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            {error && <p style={{ color: "#8f2a2a", fontSize: "13px", textAlign: "center", margin: 0 }}>{error}</p>}
          </>
        )}

        {/* STEP: success */}
        {step === "done" && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, margin: "0 auto 16px", borderRadius: "50%",
                background: "#246b2a", display: "flex", alignItems: "center",
                justifyContent: "center", color: "white", fontSize: 28,
              }}>✓</div>
              <h2 style={{ color: "#4d3021", marginBottom: 8 }}>Password Reset!</h2>
              <p style={{ color: "#6b4630", fontSize: "14px" }}>
                Your password has been updated. You can now log in.
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
