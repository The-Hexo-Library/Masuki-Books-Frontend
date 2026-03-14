import { motion } from "framer-motion";

export default function CategoriesSection() {
  const categories = [
    "Technology",
    "Business",
    "Psychology",
    "Fiction",
    "Self Growth",
    "Finance"
  ];

  return (
    <div style={{ padding: "80px 40px", textAlign: "center" }}>
      <h2>Explore Categories</h2>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          flexWrap: "wrap",
          marginTop: "40px"
        }}
      >
        {categories.map((cat) => (
          <motion.div
            key={cat}
            whileHover={{ y: -5 }}
            style={{
              padding: "15px 25px",
              background: "#e6d5c9",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            {cat}
          </motion.div>
        ))}
      </div>
    </div>
  );
}