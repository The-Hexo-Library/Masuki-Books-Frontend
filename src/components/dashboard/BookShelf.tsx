import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Book } from "../../types/book";
import { IconArrowRight } from "./Icons";

interface BookPreviewCardProps {
  book: Book;
  index: number;
}

function BookPreviewCard({ book, index }: BookPreviewCardProps) {
  const hasCover = Boolean(book.coverUrl);

  return (
    <motion.div
      className="bp-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
    >
      <Link to={`/book/${book.id}`} className="bp-card-link">
        {/* Cover */}
        <div className="bp-cover-wrap">
          {hasCover ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="bp-cover-img"
              loading="lazy"
            />
          ) : (
            <div className="bp-cover-fallback">
              <span style={{ fontSize: "24px", opacity: 0.4 }}>📖</span>
            </div>
          )}
          {/* Price badge */}
          <span className="bp-price-badge">
            ₹{typeof book.price === "number" ? book.price.toFixed(0) : book.price}
          </span>
          {/* Hover overlay */}
          <div className="bp-hover-overlay">
            <span className="bp-view-btn">View</span>
          </div>
        </div>

        {/* Info */}
        <div className="bp-info">
          <p className="bp-title">{book.title}</p>
          <p className="bp-author">{book.author}</p>
          {book.ratingAvg != null && (
            <p className="bp-rating">
              <span style={{ color: "#f5c985" }}>★</span>{" "}
              {Number(book.ratingAvg).toFixed(1)}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

interface BookShelfProps {
  books: Book[];
  loading: boolean;
}

function SkeletonCard({ i }: { i: number }) {
  return (
    <div className="bp-card bp-skeleton" key={i}>
      <div className="bp-cover-wrap" style={{ background: "#ede8e2" }} />
      <div className="bp-info">
        <div style={{ height: "12px", width: "80%", borderRadius: "5px", background: "#e5ddd6", marginBottom: "6px" }} />
        <div style={{ height: "10px", width: "60%", borderRadius: "5px", background: "#ede8e2" }} />
      </div>
    </div>
  );
}

export default function BookShelf({ books, loading }: BookShelfProps) {
  const displayBooks = books.filter((b) => b.coverUrl).slice(0, 10);

  return (
    <section className="bp-section">
      <div className="bp-section-header">
        <div>
          <p className="bp-section-eyebrow">From the collection</p>
          <h2 className="bp-section-title">Your Bookshelf</h2>
        </div>
        <Link to="/catalog" className="bp-see-all">
          Browse all <IconArrowRight size={14} />
        </Link>
      </div>

      <div className="bp-shelf">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} i={i} />)
          : displayBooks.length > 0
          ? displayBooks.map((book, i) => (
              <BookPreviewCard key={book.id} book={book} index={i} />
            ))
          : (
            <div style={{ padding: "40px", color: "#9e7a5c", fontSize: "14px" }}>
              No books to display yet.
            </div>
          )}
      </div>
    </section>
  );
}
