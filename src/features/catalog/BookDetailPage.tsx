import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../app/store";
import type { Book, Review } from "../../types/book";
import { fetchBookById } from "../../services/booksService";
import { fetchReviewsForBook, createReview } from "../../services/reviewService";
import { addItemToCart } from "../cart/cartSlice";
import { addToWishlist, removeFromWishlist, isInWishlist } from "../../services/wishlistService";

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const [book, setBook] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    if (user && id) {
      void isInWishlist(user.id, id).then(setWishlisted);
    }
  }, [user, id]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [found, revs] = await Promise.all([
          fetchBookById(id),
          fetchReviewsForBook(id),
        ]);
        setBook(found);
        setReviews(revs);
      } catch {
        setBook(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const handleAddToCart = async () => {
    if (!user || !book) return;
    await dispatch(addItemToCart({ userId: user.id, bookId: book.id, quantity, book }));
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleToggleWishlist = async () => {
    if (!user || !book) return;
    if (wishlisted) {
      await removeFromWishlist(user.id, book.id);
      setWishlisted(false);
    } else {
      await addToWishlist(user.id, book.id, book);
      setWishlisted(true);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !book || !reviewComment.trim()) return;
    setSubmittingReview(true);
    try {
      const rev = await createReview(user.id, book.id, reviewRating, reviewComment);
      setReviews((prev) => [rev, ...prev]);
      setReviewComment("");
      setReviewRating(5);
    } catch {
      // ignored
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center" }}>
        <p>Loading book details...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ padding: "60px", textAlign: "center" }}>
        <h2 style={{ color: "#4d3021" }}>Book not found</h2>
        <Link to="/catalog" style={{ color: "#4d3021", marginTop: "12px", display: "inline-block" }}>
          ← Back to catalog
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "30px 40px", maxWidth: "1000px", margin: "0 auto" }}>
      <Link to="/catalog" style={{ color: "#4d3021", textDecoration: "none", fontSize: "14px" }}>
        ← Back to catalog
      </Link>

      {/* Book info */}
      <div
        style={{
          display: "flex",
          gap: "30px",
          marginTop: "20px",
          flexWrap: "wrap",
        }}
      >
        {/* Cover */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            width: "280px",
            height: "380px",
            borderRadius: "12px",
            background: book.coverUrl
              ? `url(${book.coverUrl}) center/cover`
              : "linear-gradient(135deg, #e6d5c9 0%, #c7aa99 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4d3021",
            fontSize: "18px",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {!book.coverUrl && book.title}
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ flex: 1, minWidth: "280px" }}
        >
          <h1 style={{ color: "#4d3021", marginBottom: "6px" }}>{book.title}</h1>
          <p style={{ fontSize: "16px", color: "#666", marginBottom: "12px" }}>
            by <strong>{book.author}</strong>
          </p>

          {/* Rating */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
            <span style={{ color: "#f5a623", fontSize: "18px" }}>
              {"★".repeat(Math.round(book.ratingAvg))}
              {"☆".repeat(5 - Math.round(book.ratingAvg))}
            </span>
            <span style={{ color: "#666" }}>
              {book.ratingAvg.toFixed(1)} ({book.ratingCount} reviews)
            </span>
          </div>

          <p style={{ fontSize: "15px", lineHeight: 1.6, marginBottom: "20px", color: "#444" }}>
            {book.description || "No description available."}
          </p>

          {/* Meta info */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "6px 16px",
              fontSize: "14px",
              color: "#555",
              marginBottom: "20px",
            }}
          >
            <strong>Category:</strong> <span>{book.category}</span>
            <strong>Language:</strong> <span>{book.language}</span>
            <strong>Pages:</strong> <span>{book.pages || "N/A"}</span>
            <strong>ISBN:</strong> <span>{book.isbn || "N/A"}</span>
            <strong>Publisher:</strong> <span>{book.publisher || "N/A"}</span>
            <strong>In Stock:</strong>
            <span style={{ color: book.stock > 0 ? "#2e7d32" : "#c62828" }}>
              {book.stock > 0 ? `${book.stock} available` : "Out of stock"}
            </span>
          </div>

          {/* Price + Add to cart */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "28px", fontWeight: 700, color: "#4d3021" }}>
              ₹{book.price}
            </span>

            {user && book.stock > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      border: "1px solid #c7aa99",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: "28px", textAlign: "center", fontWeight: 600 }}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(book.stock, quantity + 1))}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      border: "1px solid #c7aa99",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => { void handleAddToCart(); }}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    background: addedToCart ? "#2e7d32" : "#4d3021",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: 600,
                    transition: "background 0.2s",
                  }}
                >
                  {addedToCart ? "✓ Added to Cart" : "Add to Cart"}
                </button>

                {/* Wishlist toggle */}
                <button
                  onClick={() => void handleToggleWishlist()}
                  title={wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                  style={{
                    width: "44px", height: "44px", borderRadius: "8px",
                    border: `2px solid ${wishlisted ? "#e53935" : "#c7aa99"}`,
                    background: wishlisted ? "#fdecea" : "#fff",
                    cursor: "pointer", fontSize: "20px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >{wishlisted ? "❤️" : "🤍"}</button>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Reviews Section */}
      <div style={{ marginTop: "50px" }}>
        <h2 style={{ color: "#4d3021", marginBottom: "20px" }}>Reviews</h2>

        {/* Write review form */}
        {user && (
          <div
            style={{
              background: "#f5ede8",
              borderRadius: "10px",
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            <h4 style={{ color: "#4d3021", marginBottom: "10px" }}>Write a Review</h4>
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "24px",
                    color: star <= reviewRating ? "#f5a623" : "#ccc",
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              placeholder="Share your thoughts about this book..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #c7aa99",
                resize: "vertical",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => { void handleSubmitReview(); }}
              disabled={submittingReview || !reviewComment.trim()}
              style={{
                marginTop: "10px",
                padding: "8px 20px",
                borderRadius: "6px",
                border: "none",
                background: "#4d3021",
                color: "#fff",
                cursor: "pointer",
                opacity: submittingReview || !reviewComment.trim() ? 0.6 : 1,
              }}
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        )}

        {/* Review list */}
        {reviews.length === 0 && (
          <p style={{ color: "#666" }}>No reviews yet. Be the first to review!</p>
        )}
        {reviews.map((rev) => (
          <div
            key={rev.id}
            style={{
              background: "#fff",
              borderRadius: "8px",
              border: "1px solid #e0d0c5",
              padding: "16px",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "#4d3021" }}>{rev.userName ?? "Anonymous"}</strong>
              <span style={{ fontSize: "12px", color: "#999" }}>
                {new Date(rev.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div style={{ color: "#f5a623", margin: "6px 0" }}>
              {"★".repeat(rev.rating)}
              {"☆".repeat(5 - rev.rating)}
            </div>
            <p style={{ fontSize: "14px", color: "#444" }}>{rev.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
