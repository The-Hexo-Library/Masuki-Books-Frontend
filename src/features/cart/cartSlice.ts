import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { CartItem, Book } from "../../types/book";
import {
  fetchCart,
  addToCart as addToCartService,
  updateCartQuantity as updateCartQtyService,
  removeFromCart as removeFromCartService,
  clearCart as clearCartService,
} from "../../services/cartService";

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string;
}

const initialState: CartState = {
  items: [],
  loading: false,
  error: "",
};

export const loadCart = createAsyncThunk(
  "cart/loadCart",
  async (userId: string) => {
    return await fetchCart(userId);
  }
);

export const addItemToCart = createAsyncThunk(
  "cart/addItem",
  async ({ userId, bookId, quantity, book }: { userId: string; bookId: string; quantity?: number; book?: Book }) => {
    await addToCartService(userId, bookId, quantity, book);
    return await fetchCart(userId);
  }
);

export const updateItemQuantity = createAsyncThunk(
  "cart/updateQuantity",
  async ({ userId, bookId, quantity }: { userId: string; bookId: string; quantity: number }) => {
    await updateCartQtyService(userId, bookId, quantity);
    return await fetchCart(userId);
  }
);

export const removeItemFromCart = createAsyncThunk(
  "cart/removeItem",
  async ({ userId, bookId }: { userId: string; bookId: string }) => {
    await removeFromCartService(userId, bookId);
    return await fetchCart(userId);
  }
);

export const emptyCart = createAsyncThunk(
  "cart/empty",
  async (userId: string) => {
    await clearCartService(userId);
    return [] as CartItem[];
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    resetCart: (state) => {
      state.items = [];
      state.loading = false;
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCart.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(loadCart.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(loadCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load cart";
      })
      .addCase(addItemToCart.fulfilled, (state, action) => {
        const { bookId, quantity = 1, book } = action.meta.arg;

        // Prefer backend-synced payload when available.
        if (action.payload.length > 0) {
          state.items = action.payload;
          return;
        }

        // Fallback: keep cart functional even when backend cart fetch is empty/unavailable.
        const existing = state.items.find((item) => item.bookId === bookId);
        if (existing) {
          existing.quantity += quantity;
          if (book) existing.book = book;
        } else {
          state.items.push({
            id: `optimistic-${bookId}-${Date.now()}`,
            bookId,
            quantity,
            book,
          });
        }
      })
      .addCase(updateItemQuantity.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(removeItemFromCart.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(emptyCart.fulfilled, (state) => {
        state.items = [];
      });
  },
});

export const { resetCart } = cartSlice.actions;
export default cartSlice.reducer;
