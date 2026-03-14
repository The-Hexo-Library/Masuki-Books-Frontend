import { motion } from "framer-motion";

export default function StatsSection() {
  const stats = [
    { number: "20,000+", label: "Readers" },
    { number: "500+", label: "Books" },
    { number: "30+", label: "Categories" }
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "60px",
        padding: "80px 0",
        background: "#f3e7df"
      }}
    >
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          whileHover={{ scale: 1.1 }}
          style={{ textAlign: "center" }}
        >
          <h2 style={{ color: "#4d3021", fontSize: "40px" }}>{stat.number}</h2>
          <p>{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}