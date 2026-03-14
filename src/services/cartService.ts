import type { CartItem, Book } from "../types/book";
import api, { type ApiResponse } from "./api";

// ── Backend response shape ────────────────────────────────────
interface CartItemResponse {
  cartItemId: string;
  productId: string;
  productTitle: string;
  productImageUrl: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  inStock: boolean;
}

interface CartResponse {
  cartId: string;
  items: CartItemResponse[];
  subtotal: number;
  totalItems: number;
}

// ── Local in-memory cart (fallback when backend unreachable) ──
const LOCAL_CART_KEY = "masuki_local_cart";

function loadLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocalCart(items: CartItem[]) {
  localCart = items;
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
}

let localCart: CartItem[] = loadLocalCart();

function mapCartItem(item: CartItemResponse): CartItem {
  return {
    id: item.cartItemId,
    bookId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    book: {
      id: item.productId,
      title: item.productTitle ?? "",
      author: "",
      category: "General",
      price: item.unitPrice ?? 0,
      description: "",
      coverUrl: item.productImageUrl ?? "",
      language: "English",
      pages: 0,
      isbn: "",
      publisher: "",
      stock: item.inStock ? 999 : 0,
      ratingAvg: 0,
      ratingCount: 0,
      isActive: true,
      createdAt: "",
    },
  };
}

// ── Public API ────────────────────────────────────────────────

export async function fetchCart(_userId: string): Promise<CartItem[]> {
  try {
    const { data } = await api.get<ApiResponse<CartResponse>>("/cart");
    const backendItems = (data.data?.items ?? []).map(mapCartItem);

    // If backend cart is empty but local fallback has items, keep local items
    // so "Add to Cart" still works when backend add endpoint fails.
    if (backendItems.length === 0 && localCart.length > 0) {
      return localCart;
    }

    // Keep local fallback aligned with backend when backend has data.
    persistLocalCart(backendItems);
    return backendItems;
  } catch (err) {
    console.warn("Cart fetch error, using local:", err);
    return localCart;
  }
}

function addToLocalCart(bookId: string, quantity: number, book?: Book) {
  const next = [...localCart];
  const existing = next.find((item) => item.bookId === bookId);
  if (existing) {
    existing.quantity += quantity;
    if (book) existing.book = book;
  } else {
    next.push({ id: `local-${Date.now()}`, bookId, quantity, book });
  }
  persistLocalCart(next);
}

function updateLocalQuantity(bookId: string, quantity: number) {
  const next = localCart.map((item) =>
    item.bookId === bookId ? { ...item, quantity } : item
  );
  persistLocalCart(next);
}

async function findBackendCartItemId(bookId: string): Promise<string | null> {
  const { data } = await api.get<ApiResponse<CartResponse>>("/cart");
  const item = data.data?.items?.find((i) => i.productId === bookId);
  return item?.cartItemId ?? null;
}

export async function addToCart(
  _userId: string,
  bookId: string,
  quantity: number = 1,
  book?: Book
): Promise<void> {
  try {
    await api.post("/cart/items", { productId: bookId, quantity });
  } catch (err) {
    console.warn("Backend addToCart failed, using local cart:", err);
    addToLocalCart(bookId, quantity, book);
  }
}

export async function updateCartQuantity(
  _userId: string,
  bookId: string,
  quantity: number
): Promise<void> {
  try {
    const cartItemId = await findBackendCartItemId(bookId);
    if (cartItemId) {
      await api.put(`/cart/items/${cartItemId}`, { quantity });
      return;
    }

    // Backend cart can be empty while local fallback has items.
    updateLocalQuantity(bookId, quantity);
  } catch (err) {
    console.warn("Backend updateCartQuantity failed, using local:", err);
    updateLocalQuantity(bookId, quantity);
  }
}

export async function removeFromCart(
  _userId: string,
  bookId: string
): Promise<void> {
  persistLocalCart(localCart.filter((i) => i.bookId !== bookId));
  try {
    const cartItemId = await findBackendCartItemId(bookId);
    if (cartItemId) {
      await api.delete(`/cart/items/${cartItemId}`);
    }
  } catch (err) {
    console.warn("Backend removeFromCart failed, using local:", err);
  }
}

export async function clearCart(_userId: string): Promise<void> {
  persistLocalCart([]);
  try {
    await api.delete("/cart");
  } catch (err) {
    console.warn("Backend clearCart failed:", err);
  }
}

export function getCartCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => {
    const price = item.unitPrice ?? item.book?.price ?? 0;
    return sum + price * item.quantity;
  }, 0);
}
