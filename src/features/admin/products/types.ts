export type ProductStatus = "active" | "draft" | "archived";
export type ProductFormat = "Hardcover" | "Paperback" | "Ebook";

export interface CategoryOption {
  category_id: string;
  name: string;
}

export interface ProductRow {
  product_id: string;
  title: string;
  author: string;
  description: string | null;
  format: string;
  language: string;
  pages: number | null;
  isbn: string | null;
  sku: string;
  price: number;
  compare_at_price: number | null;
  publication_date: string | null;
  publisher: string | null;
  status: string;
  category_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  categories?: { name: string }[] | { name: string } | null;
}

export interface ProductFormValues {
  title: string;
  author: string;
  description: string;
  format: ProductFormat;
  language: string;
  pages: string;
  isbn: string;
  sku: string;
  price: string;
  compare_at_price: string;
  publication_date: string;
  publisher: string;
  status: ProductStatus;
  category_id: string;
}

export interface ProductFilters {
  search: string;
  status: "all" | ProductStatus;
  categoryId: "all" | string;
  featuredSort: "updated_desc" | "price_asc" | "price_desc" | "date_desc" | "date_asc";
}
