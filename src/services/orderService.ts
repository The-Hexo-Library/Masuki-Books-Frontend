import type { Order, OrderItem, ShippingInfo, CartItem } from "../types/book";
import api, { type ApiResponse, type Page } from "./api";

// ── Backend response shapes ───────────────────────────────────
interface OrderItemResponse {
  orderItemId: string;
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface AddressResponse {
  addressId: string;
  fullName: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
}

interface OrderResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  guestEmail: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
  items: OrderItemResponse[];
  shippingAddress: AddressResponse | null;
  billingAddress: AddressResponse | null;
  notes: string | null;
  createdAt: string;
}

function mapOrderResponse(o: OrderResponse): Order {
  const shipping = o.shippingAddress;
  return {
    id: o.orderId,
    orderNumber: o.orderNumber,
    userId: "",
    status: o.status ?? "pending",
    total: o.totalAmount ?? 0,
    subtotal: o.subtotal,
    currency: o.currency ?? "INR",
    shippingName: shipping?.fullName ?? "",
    shippingAddress: shipping?.addressLine1 ?? "",
    shippingCity: shipping?.city ?? "",
    shippingZip: shipping?.zipCode ?? "",
    shippingCountry: shipping?.country ?? "",
    shippingPhone: shipping?.phoneNumber ?? "",
    paymentMethod: "card",
    paymentStatus: "paid",
    promoCode: null,
    discount: o.discountAmount ?? 0,
    taxAmount: o.taxAmount,
    shippingAmount: o.shippingAmount,
    notes: o.notes,
    createdAt: o.createdAt ?? "",
    items: (o.items ?? []).map(mapOrderItemResponse),
  };
}

function mapOrderItemResponse(item: OrderItemResponse): OrderItem {
  return {
    id: item.orderItemId,
    orderId: "",
    bookId: item.productId,
    title: item.productTitle,
    author: "",
    price: item.unitPrice,
    quantity: item.quantity,
    totalPrice: item.totalPrice,
  };
}

// ── Public API ────────────────────────────────────────────────

export async function createOrder(
  _userId: string,
  _cartItems: CartItem[],
  shipping: ShippingInfo,
  paymentMethod: string = "card",
  promoCode?: string,
  _discount: number = 0
): Promise<Order> {
  // First ensure the user has a shipping address — create one if needed
  let addressId: string | undefined;

  try {
    // Try to get existing addresses
    const { data: addrData } = await api.get<ApiResponse<{ addressId: string }[]>>(
      "/users/me/addresses"
    );
    if (addrData.data && addrData.data.length > 0) {
      addressId = addrData.data[0].addressId;
    }
  } catch {
    // No addresses yet
  }

  if (!addressId) {
    // Create a shipping address
    try {
      const { data: newAddr } = await api.post<ApiResponse<{ addressId: string }>>(
        "/users/me/addresses",
        {
          fullName: shipping.name,
          addressLine1: shipping.address,
          city: shipping.city,
          state: shipping.state ?? "",
          zipCode: shipping.zip,
          country: shipping.country,
          phoneNumber: shipping.phone,
          email: shipping.email ?? "",
          isDefault: true,
        }
      );
      addressId = newAddr.data.addressId;
    } catch (err) {
      console.warn("Failed to create address:", err);
      throw new Error("Failed to save shipping address");
    }
  }

  const { data } = await api.post<ApiResponse<OrderResponse>>("/orders/checkout", {
    shippingAddressId: addressId,
    paymentMethod,
    gateway: "manual",
    discountCode: promoCode || undefined,
    currency: "INR",
  });

  return mapOrderResponse(data.data);
}

export async function fetchOrders(_userId: string): Promise<Order[]> {
  try {
    const { data } = await api.get<ApiResponse<Page<OrderResponse>>>("/orders", {
      params: { size: 50 },
    });
    return (data.data.content ?? []).map(mapOrderResponse);
  } catch (err) {
    console.warn("Orders fetch error:", err);
    return [];
  }
}

export async function fetchAllOrders(): Promise<Order[]> {
  try {
    const { data } = await api.get<ApiResponse<Page<OrderResponse>>>("/admin/orders", {
      params: { size: 100 },
    });
    return (data.data.content ?? []).map(mapOrderResponse);
  } catch (err) {
    console.warn("All orders fetch error:", err);
    return [];
  }
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  try {
    const { data } = await api.get<ApiResponse<OrderResponse>>(`/orders/${orderId}`);
    return mapOrderResponse(data.data);
  } catch {
    return null;
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<void> {
  await api.patch(`/admin/orders/${orderId}/status`, { status });
}
