-- =============================================
-- MasukiBooks Full Database Schema
-- Run in Supabase SQL Editor
-- =============================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BOOKS TABLE
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  language TEXT DEFAULT 'English',
  pages INTEGER DEFAULT 0,
  isbn TEXT DEFAULT '',
  publisher TEXT DEFAULT '',
  stock INTEGER DEFAULT 999,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CART TABLE
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  shipping_name TEXT DEFAULT '',
  shipping_address TEXT DEFAULT '',
  shipping_city TEXT DEFAULT '',
  shipping_zip TEXT DEFAULT '',
  shipping_country TEXT DEFAULT 'India',
  shipping_phone TEXT DEFAULT '',
  payment_method TEXT DEFAULT '',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  promo_code TEXT DEFAULT '',
  discount NUMERIC(10,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- 7. WISHLIST TABLE
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- TRIGGERS: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at') THEN
    CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'books_updated_at') THEN
    CREATE TRIGGER books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'orders_updated_at') THEN
    CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'reviews_updated_at') THEN
    CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Helper
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Books policies
CREATE POLICY "books_select" ON books FOR SELECT USING (true);
CREATE POLICY "books_insert" ON books FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "books_update" ON books FOR UPDATE USING (is_admin());
CREATE POLICY "books_delete" ON books FOR DELETE USING (is_admin());

-- Cart policies
CREATE POLICY "cart_select" ON cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cart_insert" ON cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cart_update" ON cart_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cart_delete" ON cart_items FOR DELETE USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "orders_select" ON orders FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (is_admin());

-- Order items policies
CREATE POLICY "order_items_select" ON order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin())));
CREATE POLICY "order_items_insert" ON order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- Reviews policies
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (is_approved = true OR auth.uid() = user_id OR is_admin());
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update" ON reviews FOR UPDATE USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "reviews_delete" ON reviews FOR DELETE USING (is_admin());

-- Wishlist policies
CREATE POLICY "wishlist_select" ON wishlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wishlist_insert" ON wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wishlist_delete" ON wishlist FOR DELETE USING (auth.uid() = user_id);

-- SEED: Sample books
INSERT INTO books (title, author, category, price, description, cover_url, language, pages) VALUES
  ('Atomic Habits', 'James Clear', 'Self Growth', 499, 'An Easy & Proven Way to Build Good Habits & Break Bad Ones.', '', 'English', 320),
  ('Deep Work', 'Cal Newport', 'Productivity', 459, 'Rules for Focused Success in a Distracted World.', '', 'English', 296),
  ('Clean Code', 'Robert C. Martin', 'Technology', 599, 'A Handbook of Agile Software Craftsmanship.', '', 'English', 464),
  ('The Psychology of Money', 'Morgan Housel', 'Finance', 399, 'Timeless lessons on wealth, greed, and happiness.', '', 'English', 256),
  ('Thinking, Fast and Slow', 'Daniel Kahneman', 'Psychology', 549, 'An exploration of the two systems that drive the way we think.', '', 'English', 499),
  ('Zero to One', 'Peter Thiel', 'Business', 349, 'Notes on startups, or how to build the future.', '', 'English', 224),
  ('Sapiens', 'Yuval Noah Harari', 'History', 499, 'A Brief History of Humankind.', '', 'English', 498),
  ('The Lean Startup', 'Eric Ries', 'Business', 449, 'How Today''s Entrepreneurs Use Continuous Innovation.', '', 'English', 336),
  ('Educated', 'Tara Westover', 'Biography', 399, 'A Memoir about the power of education.', '', 'English', 352),
  ('Dune', 'Frank Herbert', 'Fiction', 599, 'A masterpiece of science fiction set on a desert planet.', '', 'English', 688)
ON CONFLICT DO NOTHING;
