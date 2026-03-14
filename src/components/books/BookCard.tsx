import { motion } from "framer-motion";
import PageWrapper from "../../components/animations/PageWrapper";
import { Link } from "react-router-dom";
import background from "../../assets/landing-bg.jpeg"; // your background image

export default function HomePage() {
  return (
    <PageWrapper>
      <div
        style={{
          minHeight: "100vh",
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          color: "white",
          textAlign: "center"
        }}
      >
        {/* DARK OVERLAY FOR READABILITY */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)"
          }}
        />

        {/* HERO CONTENT */}
        <div
          style={{
            position: "relative",
            maxWidth: "900px",
            padding: "40px"
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              fontSize: "64px",
              fontWeight: "700",
              lineHeight: "1.2"
            }}
          >
            Discover books that inspire your journey
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              marginTop: "20px",
              fontSize: "18px",
              opacity: 0.9
            }}
          >
            Masukibooks brings together readers and knowledge in one
            platform. Explore curated books and expand your learning.
          </motion.p>

          {/* EMAIL + BUTTONS */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            style={{
              marginTop: "40px",
              display: "flex",
              gap: "15px",
              justifyContent: "center",
              flexWrap: "wrap"
            }}
          >
            <input
              type="email"
              placeholder="Enter your email"
              style={{
                padding: "14px 16px",
                width: "260px",
                borderRadius: "6px",
                border: "none",
                outline: "none",
                fontSize: "16px"
              }}
            />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: "14px 24px",
                borderRadius: "6px",
                border: "none",
                background: "#8b5a3c",
                color: "white",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Get Started
            </motion.button>

            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                style={{
                  padding: "14px 24px",
                  borderRadius: "6px",
                  border: "1px solid white",
                  background: "transparent",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                Sign In
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}