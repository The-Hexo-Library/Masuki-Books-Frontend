import { useState } from "react";
import { useDispatch } from "react-redux";
import { setUser } from "./authSlice";
import { useNavigate, Link } from "react-router-dom";
import background from "../../assets/login-pattern.jpeg";
import type { AppDispatch } from "../../app/store";
import { signIn } from "../../services/authService";

const DEMO_ACCOUNTS = [
  { label: "Demo User", email: "user@masukibooks.com", password: "password123", role: "user" as const },
];

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const user = await signIn(email, password);
      dispatch(setUser(user));
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : "Login failed.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (demo: typeof DEMO_ACCOUNTS[0]) => {
    setError("");
    setIsSubmitting(true);

    try {
      const user = await signIn(demo.email, demo.password);
      dispatch(setUser(user));
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      setError("Demo account not available. Please register a new account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
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
          gap: "15px",
        }}
      >
        <h2 style={{ textAlign: "center", color: "#4d3021" }}>Login</h2>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #b89f8f",
          }}
        />

        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #b89f8f",
          }}
        />

        <button
          onClick={() => { void handleLogin(); }}
          disabled={isSubmitting}
          style={{
            padding: "10px",
            background: "#4d3021",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>

        {error && (
          <p style={{ color: "#8f2a2a", fontSize: "13px", textAlign: "center" }}>
            {error}
          </p>
        )}

        <p style={{ textAlign: "center", fontSize: "13px", margin: 0 }}>
          <Link to="/forgot-password" style={{ color: "#6b4630" }}>Forgot password?</Link>
        </p>
        <div style={{ borderTop: "1px solid #c7aa99", paddingTop: "12px", marginTop: "4px" }}>
          <p style={{ textAlign: "center", fontSize: "12px", color: "#666", marginBottom: "8px" }}>
            Quick Demo Access
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            {DEMO_ACCOUNTS.map((demo) => (
              <button
                key={demo.role}
                onClick={() => { void handleDemoLogin(demo); }}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #4d3021",
                  background: "transparent",
                  color: "#4d3021",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {demo.label}
              </button>
            ))}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "14px" }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "#4d3021", fontWeight: "600" }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}