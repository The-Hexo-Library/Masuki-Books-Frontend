import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, IndianRupee, Sparkles, Star } from "lucide-react";
import type { Book } from "../../types/book";

interface RecentBooksProps {
  books: Book[];
  loading?: boolean;
}

const SHIMMER = "linear-gradient(90deg, #f0e8e2 25%, #e8ddd5 50%, #f0e8e2 75%)";

function BookSkeleton() {
  return (
    <div style={{ borderRadius: "12px", overflow: "hidden", background: "#faf5f2", border: "1px solid #f0e8e2" }}>
      <div
        style={{
          width: "100%",
          paddingTop: "148%",
          background: SHIMMER,
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
        }}
      />
      <div style={{ padding: "12px 12px 14px", display: "flex", flexDirection: "column", gap: "7px" }}>
        <div style={{ height: "13px", width: "80%", borderRadius: "4px", background: SHIMMER, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
        <div style={{ height: "11px", width: "55%", borderRadius: "4px", background: SHIMMER, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
        <div style={{ height: "13px", width: "40%", borderRadius: "4px", marginTop: "4px", background: SHIMMER, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
      </div>
    </div>
  );
}


/* Deterministic pastel colour for books with no cover */
const COVER_PALETTES = [
  ["#6b3e26", "#f5c985"],
  ["#1d4ed8", "#bfdbfe"],
  ["#7c3aed", "#ede9fe"],
  ["#be185d", "#fce7f3"],
  ["#065f46", "#a7f3d0"],
  ["#92400e", "#fef3c7"],
];
const coverPalette = (seed: string) => COVER_PALETTES[seed.charCodeAt(0) % COVER_PALETTES.length];

export default function RecentBooks({ books, loading = false }: RecentBooksProps) {
  const displayBooks = books.slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.25 }}
      style={{
        background: "#fff",
        borderRadius: "14px",
        padding: "24px",
        boxShadow: "0 2px 10px rgba(77,48,33,0.07)",
        border: "1px solid #f0e8e2",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#2d1a0e", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles className="w-5 h-5" size={18} />
            New Arrivals
          </h2>
          <p style={{ fontSize: "13px", color: "#9e7a5c", marginTop: "3px", marginBottom: 0 }}>
            Latest titles in the catalog
          </p>
        </div>
        <Link
          to="/catalog"
          style={{
            fontSize: "13px",
            color: "#4d3021",
            textDecoration: "none",
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: "8px",
            background: "#f5ede8",
            transition: "background 0.15s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#ead9cf")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#f5ede8")}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            Browse all
            <ArrowRight className="w-4 h-4" size={14} />
          </span>
        </Link>
      </div>

      {/* Poster-card grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "14px",
        }}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <BookSkeleton key={i} />)
          : displayBooks.map((book, i) => {
              const [bg, fg] = coverPalette(book.id);
              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  style={{ cursor: "pointer" }}
                >
                  <Link
                    to={`/book/${book.id}`}
                    style={{
                      display: "block",
                      borderRadius: "10px",
                      overflow: "hidden",
                      background: "#faf5f2",
                      border: "1px solid #f0e8e2",
                      textDecoration: "none",
                      color: "inherit",
                      boxShadow: "0 2px 8px rgba(77,48,33,0.06)",
                      transition: "box-shadow 0.18s, border-color 0.18s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(77,48,33,0.15)";
                      e.currentTarget.style.borderColor = "#d4a07a";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(77,48,33,0.06)";
                      e.currentTarget.style.borderColor = "#f0e8e2";
                    }}
                  >
                    {/* Cover image â€” full-width poster */}
                    <div
                      style={{
                        width: "100%",
                        paddingTop: "148%", /* 2:3 aspect ratio */
                        position: "relative",
                        background: bg,
                        overflow: "hidden",
                      }}
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = "none";
                          }}
                        />
                      ) : null}
                      {/* Fallback icon centred */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          zIndex: 0,
                        }}
                      >
                        <BookOpen className="w-6 h-6" size={34} color={fg} />
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            color: fg,
                            textAlign: "center",
                            padding: "0 6px",
                            opacity: 0.8,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                          }}
                        >
                          {book.category}
                        </span>
                      </div>

                      {/* Price badge overlay */}
                      <div
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: "rgba(255,255,255,0.92)",
                          backdropFilter: "blur(4px)",
                          borderRadius: "6px",
                          padding: "3px 7px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#4d3021",
                          zIndex: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        <IndianRupee className="w-4 h-4" size={12} />
                        {book.price}
                      </div>

                      {/* Rating badge overlay */}
                      {book.ratingAvg > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "8px",
                            left: "8px",
                            background: "rgba(255,255,255,0.92)",
                            backdropFilter: "blur(4px)",
                            borderRadius: "6px",
                            padding: "3px 7px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#b45309",
                            zIndex: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <Star className="w-4 h-4" size={12} fill="currentColor" />
                          {book.ratingAvg.toFixed(1)}
                        </div>
                      )}
                    </div>

                    {/* Text info below cover */}
                    <div style={{ padding: "10px 10px 12px" }}>
                      <p
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: "#2d1a0e",
                          margin: 0,
                          lineHeight: 1.35,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {book.title}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#9e7a5c",
                          margin: "4px 0 0",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {book.author}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
      </div>

      {!loading && displayBooks.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#9e7a5c" }}>
          <BookOpen className="w-6 h-6" size={40} />
          <p style={{ marginTop: "12px", fontSize: "14px" }}>No books available yet.</p>
          <Link to="/catalog" style={{ marginTop: "10px", display: "inline-block", color: "#4d3021", fontWeight: 600, fontSize: "14px" }}>
            Go to Catalog â†’
          </Link>
        </div>
      )}
    </motion.div>
  );
}

