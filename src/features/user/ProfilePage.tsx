import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../app/store";
import { setUser } from "../auth/authSlice";
import { updateProfile, changePassword } from "../../services/authService";
import { fetchMySubscriptionStatus } from "../../services/subscriptionService";
import type { SubscriptionStatus } from "../../types/subscription";

export default function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    const load = async () => {
      const status = await fetchMySubscriptionStatus();
      setSubscription(status);
    };
    void load();
  }, []);

  const planCrown = useMemo(() => {
    if (!subscription?.active) return null;
    if (subscription.accessPercentage >= 100) return "👑";
    if (subscription.accessPercentage >= 50) return "🥇";
    if (subscription.accessPercentage >= 25) return "🥈";
    return "🥉";
  }, [subscription]);

  const crownTheme = useMemo(() => {
    if (!subscription?.active) {
      return null;
    }

    if (subscription.accessPercentage >= 100) {
      return {
        ring: "0 0 0 3px #f9d66a, 0 0 18px rgba(249,214,106,0.65)",
        badgeBg: "linear-gradient(135deg, #f7d56c, #f0b429)",
        badgeColor: "#5f3b00",
        label: "Royal Crown"
      };
    }

    if (subscription.accessPercentage >= 50) {
      return {
        ring: "0 0 0 3px #ffd98c, 0 0 14px rgba(255,217,140,0.55)",
        badgeBg: "linear-gradient(135deg, #ffe7b8, #ffc764)",
        badgeColor: "#6b4700",
        label: "Gold Crown"
      };
    }

    if (subscription.accessPercentage >= 25) {
      return {
        ring: "0 0 0 3px #d9dce2, 0 0 12px rgba(217,220,226,0.6)",
        badgeBg: "linear-gradient(135deg, #eef0f4, #c7ccd5)",
        badgeColor: "#334155",
        label: "Silver Crown"
      };
    }

    return {
      ring: "0 0 0 3px #e3c6a3, 0 0 10px rgba(227,198,163,0.55)",
      badgeBg: "linear-gradient(135deg, #f1dcc3, #cf9d67)",
      badgeColor: "#5b3512",
      label: "Bronze Crown"
    };
  }, [subscription]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");

    try {
      const [firstName, ...rest] = fullName.trim().split(" ");
      const lastName = rest.join(" ");
      await updateProfile({ firstName, lastName, phoneNumber: phone });
      dispatch(setUser({ ...user, fullName, phone }));
      setMessage("Profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg("Password must be at least 6 characters");
      return;
    }
    if (!oldPassword) {
      setPasswordMsg("Please enter your current password");
      return;
    }
    setChangingPassword(true);
    setPasswordMsg("");
    try {
      await changePassword(oldPassword, newPassword);
      setPasswordMsg("Password updated!");
      setOldPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordMsg(""), 3000);
    } catch (err) {
      setPasswordMsg(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: "30px 40px", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <h2 style={{ color: "#4d3021", margin: 0 }}>My Profile</h2>
        {subscription?.active && (
          <span
            style={{
              background: "#fff3cd",
              color: "#7a4c00",
              border: "1px solid #f2d487",
              borderRadius: "999px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{planCrown}</span>
            <span>{subscription.planName} ({subscription.accessPercentage}%)</span>
          </span>
        )}
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#f5ede8",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "20px",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "#4d3021",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "32px",
            fontWeight: 700,
            marginBottom: "16px",
            position: "relative",
            boxShadow: crownTheme?.ring,
          }}
        >
          {(user.fullName ?? user.email)?.[0]?.toUpperCase() ?? "U"}

          {subscription?.active && crownTheme && (
            <div
              style={{
                position: "absolute",
                top: "-12px",
                right: "-10px",
                minWidth: "34px",
                height: "34px",
                borderRadius: "999px",
                background: crownTheme.badgeBg,
                color: crownTheme.badgeColor,
                border: "2px solid #fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 16px rgba(0,0,0,0.22)",
                fontSize: "18px",
                fontWeight: 800,
                padding: "0 8px"
              }}
              title={`${crownTheme.label} - ${subscription.planName}`}
            >
              {planCrown}
            </div>
          )}
        </div>

        {subscription?.active && (
          <p style={{ marginBottom: "12px", color: "#7a4c00", fontSize: "13px", fontWeight: 600 }}>
            {planCrown} {crownTheme?.label} unlocked for your active subscription plan.
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
              Full Name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
              Email
            </label>
            <input value={user.email} disabled style={{ ...inputStyle, opacity: 0.6 }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
              Phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 XXXXXXXXXX"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
              Role
            </label>
            <input value={user.role} disabled style={{ ...inputStyle, opacity: 0.6, textTransform: "capitalize" }} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
          <button
            onClick={() => { void handleSaveProfile(); }}
            disabled={saving}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: "#4d3021",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 600,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {message && (
            <span
              style={{
                fontSize: "13px",
                color: message.includes("success") ? "#2e7d32" : "#c62828",
              }}
            >
              {message}
            </span>
          )}
        </div>
      </motion.div>

      {/* Change Password */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: "#f5ede8",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <h3 style={{ color: "#4d3021", marginBottom: "12px" }}>Change Password</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="password"
            placeholder="Current password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: "160px" }}
          />
          <input
            type="password"
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: "160px" }}
          />
          <button
            onClick={() => { void handleChangePassword(); }}
            disabled={changingPassword}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "#4d3021",
              color: "#fff",
              cursor: changingPassword ? "not-allowed" : "pointer",
              fontWeight: 600,
              opacity: changingPassword ? 0.7 : 1,
            }}
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
        {passwordMsg && (
          <p
            style={{
              marginTop: "8px",
              fontSize: "13px",
              color: passwordMsg.includes("updated") ? "#2e7d32" : "#c62828",
            }}
          >
            {passwordMsg}
          </p>
        )}
      </motion.div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #c7aa99",
  fontSize: "14px",
  width: "100%",
  boxSizing: "border-box",
};
