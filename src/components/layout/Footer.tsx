import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer
      style={{
        background: "#4d3021ff",
        color: "#e6d5c9",
        padding: "16px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "14px",
        flexWrap: "wrap",
      }}
    >
      {/* Left Section */}
      <div style={{ display: "flex", gap: "18px", alignItems: "center" }}>
        <span>© 2026 Masukibooks</span>

        <Link
          to="/terms"
          style={{ color: "#e6d5c9", textDecoration: "none" }}
        >
          Terms
        </Link>

        <Link
          to="/privacy"
          style={{ color: "#e6d5c9", textDecoration: "none" }}
        >
          Privacy
        </Link>

        <Link
          to="/sitemap"
          style={{ color: "#e6d5c9", textDecoration: "none" }}
        >
          Sitemap
        </Link>
      </div>

      {/* Right Section */}
      <div style={{ display: "flex", gap: "16px" }}>
        <a
          href="https://linkedin.com"
          target="_blank"
          style={{ color: "#e6d5c9", textDecoration: "none" }}
        >
          LinkedIn
        </a>

        <a
          href="https://instagram.com"
          target="_blank"
          style={{ color: "#e6d5c9", textDecoration: "none" }}
        >
          Instagram
        </a>

        <a
          href="https://youtube.com"
          target="_blank"
          style={{ color: "#e6d5c9", textDecoration: "none" }}
        >
          YouTube
        </a>

        <a
          href="https://github.com"
          target="_blank"
          style={{ color: "#e6d5c9", textDecoration: "none" }}
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}