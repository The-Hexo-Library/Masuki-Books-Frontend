import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TypeText from "../../components/ui/TypeText";
import background from "../../assets/landing-bg.jpeg";
import { fetchBooks } from "../../services/booksService";
import { fetchCategories, type Category } from "../../services/categoryService";
import type { Book } from "../../types/book";

const fadeUp = {
  hidden: { opacity: 0, y: 60 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 1
    }
  }
};

function AnimatedSection({ children }: { children: React.ReactNode }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    void fetchCategories().then((cats) =>
      setCategories(cats.length > 0 ? cats : fallbackCategories)
    );
    void fetchBooks({ size: 6 }).then((bks) =>
      setBooks(bks.length > 0 ? bks : fallbackBookNames.map(fakeBook))
    );
  }, []);

  return (
    <div>

      {/* HERO */}

      <section
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "white",
          padding: "40px",
          zIndex: 1
        }}
      >
        <div>

          <h1 style={{ fontSize: "60px", maxWidth: "800px" }}>
            <TypeText text="Discover books that inspire your journey" />
          </h1>

          <AnimatedSection>
            <p style={{ marginTop: "20px", fontSize: "18px" }}>
              Explore curated books and grow your knowledge.
            </p>
          </AnimatedSection>

        </div>
      </section>

      {/* STATS */}

      <section
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          background: "#f3e7df",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2
        }}
      >
        <div style={{ display: "flex", gap: "80px" }}>
          {[
            { number: "20,000+", label: "Readers" },
            { number: "500+", label: "Books" },
            { number: "30+", label: "Categories" }
          ].map((stat) => (
            <AnimatedSection key={stat.label}>
              <div>
                <h2 style={{ fontSize: "40px", color: "#4d3021" }}>
                  {stat.number}
                </h2>
                <p>{stat.label}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}

      <section
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          background: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 3
        }}
      >
        <AnimatedSection>
          <h2>Explore Categories</h2>
        </AnimatedSection>

        <div
          style={{
            marginTop: "40px",
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            justifyContent: "center"
          }}
        >
          {(categories.length > 0
            ? categories.map((c) => c.name)
            : ["Technology", "Business", "Psychology", "Finance", "Fiction", "Self Growth"]
          ).map((cat) => (
            <AnimatedSection key={cat}>
              <div
                style={{
                  padding: "15px 25px",
                  background: "#e6d5c9",
                  borderRadius: "8px",
                  cursor: "pointer"
                }}
              >
                {cat}
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* BOOKS */}

      <section
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          background: "#f3e7df",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 4
        }}
      >
        <AnimatedSection>
          <h2>Popular Books</h2>
        </AnimatedSection>

        <div style={{ display: "flex", gap: "30px", marginTop: "40px", flexWrap: "wrap", justifyContent: "center" }}>
          {(books.length > 0
            ? books.slice(0, 6)
            : fallbackBookNames.map(fakeBook)
          ).map((book) => (
            <AnimatedSection key={book.id}>
              <Link to={`/book/${book.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div
                  style={{
                    width: "200px",
                    padding: "20px",
                    background: "#e6d5c9",
                    borderRadius: "10px"
                  }}
                >
                  <div
                    style={{
                      height: "120px",
                      background: book.coverUrl
                        ? `url(${book.coverUrl}) center/cover`
                        : "#4d3021",
                      borderRadius: "6px",
                      marginBottom: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#e6d5c9",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {!book.coverUrl && book.title}
                  </div>

                  <h4 style={{ color: "#4d3021" }}>{book.title}</h4>
                  <p style={{ fontSize: "13px", color: "#666", margin: "4px 0" }}>by {book.author}</p>
                  <p style={{ fontWeight: 700, color: "#4d3021" }}>₹{book.price}</p>
                </div>
              </Link>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* CTA */}

      <section
        style={{
          height: "100vh",
          background: "#4d3021",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column"
        }}
      >
        <AnimatedSection>
          <h2>Start Your Reading Journey Today</h2>
        </AnimatedSection>

        <AnimatedSection>
          <Link
            to="/signup"
            style={{ color: "white", textDecoration: "none" }}
          >
            <button
            style={{
              marginTop: "20px",
              padding: "12px 24px",
              borderRadius: "6px",
              border: "none",
              background: "#e6d5c9",
              cursor: "pointer"
            }}
          >
              Get Started
            </button>
          </Link>
        </AnimatedSection>
      </section>

    </div>
  );
}

const fallbackCategories: Category[] = [
  { categoryId: "1", name: "Technology", slug: "technology", description: "", imageUrl: null, displayOrder: 1, isActive: true },
  { categoryId: "2", name: "Business", slug: "business", description: "", imageUrl: null, displayOrder: 2, isActive: true },
  { categoryId: "3", name: "Fiction", slug: "fiction", description: "", imageUrl: null, displayOrder: 3, isActive: true },
  { categoryId: "4", name: "Self Growth", slug: "self-growth", description: "", imageUrl: null, displayOrder: 4, isActive: true },
];

const fallbackBookNames = ["Atomic Habits", "Deep Work", "Clean Code"];

function fakeBook(title: string, i: number): Book {
  return {
    id: `fallback-${i}`,
    title,
    author: "Author",
    category: "General",
    price: 499,
    description: "",
    coverUrl: "",
    language: "English",
    pages: 0,
    isbn: "",
    publisher: "",
    stock: 0,
    ratingAvg: 0,
    ratingCount: 0,
    isActive: true,
    createdAt: "",
  };
}