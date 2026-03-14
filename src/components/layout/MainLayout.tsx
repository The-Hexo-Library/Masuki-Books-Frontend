import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function MainLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#4d3021ff",
      }}
    >
      <Navbar />

      <div style={{ flex: 1 }}>
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}