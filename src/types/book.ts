export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  price: number;
  description: string;
  coverUrl: string;
  language: string;
  pages: number;
  isbn: string;
  publisher: string;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
  isActive: boolean;
  createdAt: string;
  format?: string;
  compareAtPrice?: number;
  sku?: string;
  categoryId?: string;
  imageUrls?: string[];
}

export interface BookInput {
  title: string;
  author: string;
  category: string;
  categoryId?: string;
  price: number;
  description: string;
  coverUrl: string;
  language?: string;
  pages?: number;
  isbn?: string;
  publisher?: string;
  stock?: number;
  format?: string;
  sku?: string;
}

export interface CartItem {
  id: string;
  bookId: string;
  quantity: number;
  book?: Book;
  unitPrice?: number;
  lineTotal?: number;
}

export interface Order {
  id: string;
  orderNumber?: string;
  userId: string;
  status: string;
  total: number;
  subtotal?: number;
  currency: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingZip: string;
  shippingCountry: string;
  shippingPhone: string;
  paymentMethod: string;
  paymentStatus: string;
  promoCode: string | null;
  discount: number;
  taxAmount?: number;
  shippingAmount?: number;
  notes: string | null;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  bookId: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
  totalPrice?: number;
}

export interface Review {
  id: string;
  userId: string;
  bookId: string;
  rating: number;
  comment: string;
  title?: string;
  isApproved: boolean;
  createdAt: string;
  userName?: string;
  status?: string;
}

export interface ShippingInfo {
  name: string;
  address: string;
  addressLine2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone: string;
  email?: string;
}

export interface Address {
  addressId: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
  email?: string;
  isDefault: boolean;
}
