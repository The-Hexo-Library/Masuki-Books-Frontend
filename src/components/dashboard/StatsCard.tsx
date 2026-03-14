import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent: string;
  subtext?: string;
  loading?: boolean;
  index?: number;
}

function SkeletonPulse({ width, height }: { width: string; height: string }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: "6px",
        background: "linear-gradient(90deg, #f0e8e2 25%, #e8ddd5 50%, #f0e8e2 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

export default function StatsCard({
  label,
  value,
  icon,
  accent,
  subtext,
  loading = false,
  index = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(77,48,33,0.12)" }}
      style={{
        background: "#fff",
        borderRadius: "14px",
        padding: "22px 24px",
        boxShadow: "0 2px 10px rgba(77,48,33,0.07)",
        border: "1px solid #f0e8e2",
        cursor: "default",
        transition: "box-shadow 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "4px",
          height: "100%",
          background: accent,
          borderRadius: "14px 0 0 14px",
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          {loading ? (
            <>
              <SkeletonPulse width="60%" height="14px" />
              <div style={{ marginTop: "12px" }}>
                <SkeletonPulse width="40%" height="28px" />
              </div>
              {subtext && (
                <div style={{ marginTop: "8px" }}>
                  <SkeletonPulse width="50%" height="12px" />
                </div>
              )}
            </>
          ) : (
            <>
              <p
                style={{
                  fontSize: "13px",
                  color: "#9e7a5c",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#2d1a0e",
                  marginTop: "6px",
                  lineHeight: 1.1,
                }}
              >
                {value}
              </p>
              {subtext && (
                <p style={{ fontSize: "12px", color: "#b08060", marginTop: "6px" }}>
                  {subtext}
                </p>
              )}
            </>
          )}
        </div>

        {/* Icon circle */}
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: `${accent}1a`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            flexShrink: 0,
            marginLeft: "12px",
          }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
