import { useState } from "react";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../app/store";
import { setUser } from "../auth/authSlice";
import { updateProfile, changePassword } from "../../services/authService";

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
      <h2 style={{ color: "#4d3021", marginBottom: "24px" }}>My Profile</h2>

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
          }}
        >
          {(user.fullName ?? user.email)?.[0]?.toUpperCase() ?? "U"}
        </div>

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
