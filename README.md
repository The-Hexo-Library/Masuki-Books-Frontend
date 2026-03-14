# MasukiBooks Frontend

Frontend app for MasukiBooks with:

- Landing pages (existing design preserved)
- User authentication with Supabase
- User dashboard to browse books
- Admin dashboard to create/edit/delete books
- Role-based routing (`user` and `admin`)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` in project root (you can copy from `.env.example`):

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. Run app:

   ```bash
   npm run dev
   ```

## Supabase Notes

- Auth is implemented using `supabase.auth`.
- Role is resolved from `profiles.role` first, then from auth metadata (`user_metadata.role`).
- Book catalog expects a `books` table with fields:
  - `id`, `title`, `author`, `category`, `price`, `description`, `cover_url`, `created_at`

If Supabase env variables are missing, the UI still runs with fallback sample books.
