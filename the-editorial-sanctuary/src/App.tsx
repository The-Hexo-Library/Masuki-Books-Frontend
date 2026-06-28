/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import {
  Search,
  ShoppingCart,
  User,

  ArrowRight,
  ArrowRightLeft,
  BookOpen,
  History,
  Highlighter,
  Globe,
  Mail,
  Star,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List as ListIcon,
  X,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  Camera,
  CheckCircle,
  Library,
  CreditCard,
  Calendar,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './hooks/useAuth';
import { useFetch } from './hooks/useFetch';
import { usePaginationState } from './hooks/usePaginationState';
import {
  addCartItem,
  activateUserSubscription,
  createAdminCategory,
  createAdminBook,
  createAdminSubscriptionPlan,
  deleteAdminPublicLibrary,
  deleteAdminBook,
  getAdminOrdersPaged,
  getAdminCategories,
  getAdminPublicLibrary,
  fetchMergedPublicCatalog,
  getMySubscriptionStatus,
  getAdminBooksPaged,
  getCart,
  getStoredUser,
  getUserLibraryPage,
  getSubscriptionPlansPublic,
  getPublicCategories,
  searchPublicLibrary,
  postCheckout,
  postRazorpayCreateOrder,
  postRazorpayVerifyPayment,
  postSubscribe,
  removeCartItem,
  upsertAdminPublicLibrary,
  updateAdminOrderStatus,
  updateAdminBook,
  uploadAdminBookFile,
  updateCartItemQuantity,
  postContactForm,
  postAdminContactReply,
  getNotifications,
  getUnreadNotificationCount,
  getMyContactSubmissions,
  getAdminContactSubmissions,
  markNotificationRead,
  type AdminOrderRow,
  type CategoryRow,
  type CartRow,
  type LibraryRow,
  type PagedResult,
  type ProductRow,
  type SubscriptionStatusRow,
  type NotificationRow,
  type ContactSubmissionRow,
} from './services/api';
import { subscribeAppErrors } from './services/errorBus';
import { loadRazorpayCheckoutScript } from './services/razorpay';
import type { AppPage as Page } from './types/navigation';
import FloatingMenu from './components/FloatingMenu';

const ReaderPageLazy = lazy(() => import('./pages/ReaderPage'));
import type { UiBook as Book } from './services/uiMappers';
import {
  cartItemToUiBook,
  formatMoney,
  libraryRowToUiBook,
  productRowToVaultBook,
  publicRowToUiBook,
  subscriptionRowToUiPlan,
  type UiSubscriptionPlan,
} from './services/uiMappers';

const PUBLIC_PAGE_SIZE = 8;
const SAVED_WISHLIST_STORAGE_KEY = 'masuki_saved_wishlist';
const LAST_PAGE_STORAGE_KEY = 'masuki_last_page';
const ADMIN_STATS_REFRESH_MS = 15_000;
const ORDER_ACTIVITY_EVENT = 'masuki:orders-updated';
const PROFILE_PIC_KEY = 'masuki_profile_pic';
const DELETED_CART_ITEMS_STORAGE_KEY = 'masuki_deleted_cart_items';
const CORPORATE_PUNCHLINE = '"In the corporate world, digital books are the ultimate upgrade: they\'re the only way to reboot your leadership style without having to clear your cache."';

const ALL_APP_PAGES: Page[] = [
  'landing',
  'public-library',
  'profile',
  'personal-library',
  'cart',
  'wishlist',
  'subscription',
  'checkout',
  'login',
  'admin',
  'admin-add-book',
  'admin-edit-book',
  'admin-contacts',
  'reader',
  'terms-of-service',
  'privacy-policy',
  'archive-ethics',
  'contact-support',
  'my-queries',
  'help-center',
];

function getInitialPage(): Page {
  try {
    const saved = sessionStorage.getItem(LAST_PAGE_STORAGE_KEY);
    if (saved && (ALL_APP_PAGES as string[]).includes(saved)) {
      return saved as Page;
    }
  } catch {
    // ignore storage access errors
  }
  return 'landing';
}

function generateDraftSku(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SKU-${Date.now()}-${suffix}`;
}

function isDuplicateSkuError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes('duplicate key value') && message.includes('(sku)=');
}

function triggerLocalFileDownload(file: File): void {
  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = file.name || 'book-file.pdf';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

/** Compact page labels for existing pagination rows (logic only). */
function compactPaginationSlots(
  totalPages: number,
  current1Based: number
): (number | '…')[] {
  const ell = '…' as const;
  const tp = Math.max(1, totalPages);
  const c = Math.min(Math.max(1, current1Based), tp);
  if (tp <= 5) return Array.from({ length: tp }, (_, i) => i + 1);
  if (c <= 3) return [1, 2, 3, ell, tp];
  if (c >= tp - 2) return [1, ell, tp - 2, tp - 1, tp];
  return [1, ell, c - 1, c, c + 1];
}

function parseCurrencyAmount(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]+/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFlipbookUrl(url: string | undefined): boolean {
  const normalized = String(url ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return /(designrr\.page|designrr\.s3\.amazonaws\.com|type=fp|flipbook)/i.test(normalized);
}

function isFlipbookBook(book: Pick<Book, 'isFlipbook' | 'fileUrl' | 'downloadUrl'>): boolean {
  return Boolean(book.isFlipbook) || isFlipbookUrl(book.fileUrl) || isFlipbookUrl(book.downloadUrl);
}

function normalizeBookLookupText(value: string | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getBookSignature(book: Pick<Book, 'title' | 'author'>): string {
  const title = normalizeBookLookupText(book.title);
  const author = normalizeBookLookupText(book.author);
  return `${title}::${author}`;
}

function getBlockedFlipbookReason(url: string | undefined): string | null {
  if (!url) {
    return 'Flipbook link is missing. Please ask the admin to attach a public reader URL.';
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isPdf = parsed.pathname.toLowerCase().endsWith('.pdf');
    const hasSignedQuery =
      parsed.searchParams.has('X-Amz-Signature') ||
      parsed.searchParams.has('x-amz-signature');

    if (host === 'designrr.s3.amazonaws.com' && isPdf && !hasSignedQuery) {
      return 'This Designrr S3 PDF is private (403). Use a public Designrr share link (for example designrr.page) instead.';
    }
  } catch {
    return 'Flipbook URL is invalid. Please provide a full public URL.';
  }

  return null;
}

// --- Components ---

const Navbar = ({
  currentPage,
  setPage,
  isAuthenticated,
  isAdmin,
  onLogout,
  onSearch,
}: {
  currentPage: Page;
  setPage: (p: Page) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  onLogout: () => void;
  onSearch?: (query: string) => void;
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationRow | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 30s when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const count = await getUnreadNotificationCount();
        if (!cancelled) setUnreadCount(count);
      } catch { /* ignore */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isAuthenticated]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showNotifications) return;
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifications]);

  const handleBellClick = async () => {
    setShowNotifications(prev => !prev);
    if (!showNotifications) {
      setNotifLoading(true);
      try {
        const list = await getNotifications();
        setNotifications(list);
      } catch { /* ignore */ }
      setNotifLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleSendReply = async () => {
    if (!selectedNotification || !selectedNotification.referenceId || !replyText.trim()) return;
    setReplyLoading(true);
    try {
      await postAdminContactReply({
        contactSubmissionId: selectedNotification.referenceId,
        replyMessage: replyText.trim()
      });
      alert('Reply sent successfully!');
      setSelectedNotification(null);
      setReplyText('');
    } catch (e: any) {
      alert('Failed to send reply: ' + e.message);
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-outline-variant/15">
      <div className="max-w-screen-2xl mx-auto px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-12">
          <span
            className="text-2xl font-headline italic text-primary cursor-pointer"
            onClick={() => setPage('landing')}
          >
            Masuki Books
          </span>
          {isAuthenticated ? (
            <div className="hidden md:flex gap-8 items-center">
              {(isAdmin
                ? [
                  { id: 'admin', label: 'Admin Vault' },
                  { id: 'admin-add-book', label: 'Add Books' },
                  { id: 'admin-contacts', label: 'Queries' },
                  { id: 'public-library', label: 'Public Library' },
                  { id: 'personal-library', label: 'User Stats' },
                ]
                : [
                  { id: 'public-library', label: 'Public Library' },
                  { id: 'personal-library', label: 'Personal Library' },
                  { id: 'cart', label: 'Cart' },
                  { id: 'wishlist', label: 'Wishlist' },
                  { id: 'my-queries', label: 'My Queries' },
                ]
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id as Page)}
                  className={`text-sm font-medium transition-all duration-200 pb-1 border-b-2 ${currentPage === item.id
                    ? 'text-primary border-primary font-bold'
                    : 'text-on-surface-variant border-transparent hover:text-primary'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-6">
          <form className="relative hidden sm:block" onSubmit={(e) => { e.preventDefault(); if (searchVal.trim() && onSearch) { onSearch(searchVal.trim()); } }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              placeholder="Search the archive..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="bg-surface-container-highest border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary w-64 outline-none"
            />
          </form>
          <div className="flex gap-4 items-center">
            {isAuthenticated && !isAdmin ? (
              <button className="text-primary hover:opacity-80 transition-opacity" onClick={() => setPage('cart')} aria-label="Open cart">
                <ShoppingCart className="w-5 h-5" />
              </button>
            ) : null}
            {isAuthenticated ? (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    className="text-primary hover:opacity-80 transition-opacity relative"
                    onClick={handleBellClick}
                    aria-label="Notifications"
                    id="notification-bell"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-outline-variant/30 bg-surface-container-low shadow-2xl z-[60]"
                      >
                        <div className="p-4 border-b border-outline-variant/20">
                          <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Notifications</h3>
                        </div>
                        {notifLoading ? (
                          <div className="p-6 text-center text-sm text-on-surface-variant">Loading…</div>
                        ) : notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-on-surface-variant">No notifications yet</div>
                        ) : (
                          <ul className="divide-y divide-outline-variant/15">
                            {notifications.slice(0, 20).map((n) => (
                              <li
                                key={n.id}
                                className={`p-4 hover:bg-surface-container-highest/50 transition-colors cursor-pointer ${!n.isRead ? 'bg-primary/5' : ''}`}
                                onClick={() => {
                                  if (isAdmin && n.type === 'CONTACT_SUBMISSION') {
                                    setShowNotifications(false);
                                    if (n.id && !n.isRead) void markNotificationRead(n.id);
                                    setPage('admin-contacts');
                                  } else if (!isAdmin && n.type === 'ADMIN_REPLY') {
                                    setShowNotifications(false);
                                    if (n.id && !n.isRead) void markNotificationRead(n.id);
                                    setPage('my-queries');
                                  } else {
                                    if (!n.isRead) handleMarkRead(n.id);
                                    setSelectedNotification(n);
                                    setShowNotifications(false);
                                    setReplyText('');
                                  }
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-primary'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-primary truncate">{n.title}</p>
                                    <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{n.message}</p>
                                    <p className="text-[10px] text-on-surface-variant/60 mt-1">
                                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                                    </p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  className="text-primary hover:opacity-80 transition-opacity"
                  onClick={() => setPage(isAdmin ? 'personal-library' : 'profile')}
                  aria-label={isAdmin ? 'Open user stats' : 'Open profile'}
                >
                  <User className="w-5 h-5" />
                </button>
                <button
                  className="text-primary hover:opacity-80 transition-opacity"
                  onClick={onLogout}
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button className="text-primary hover:opacity-80 transition-opacity" onClick={() => setPage('login')} aria-label="Login">
                <User className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedNotification(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-outline-variant/20 relative"
            >
              <button
                onClick={() => setSelectedNotification(null)}
                className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-headline text-primary mb-2 pr-8">{selectedNotification.title}</h2>
              <div className="text-xs text-on-surface-variant mb-6">
                {selectedNotification.createdAt ? new Date(selectedNotification.createdAt).toLocaleString() : ''}
              </div>

              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/15 mb-6 max-h-60 overflow-y-auto whitespace-pre-wrap text-sm text-on-surface">
                {selectedNotification.message}
              </div>

              {isAdmin && selectedNotification.type === 'CONTACT_SUBMISSION' && selectedNotification.referenceId && (
                <div className="space-y-4 border-t border-outline-variant/15 pt-6 mt-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Admin Reply</h3>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    className="w-full h-32 bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                    disabled={replyLoading}
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setSelectedNotification(null)}
                      className="px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                      disabled={replyLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || replyLoading}
                      className="px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {replyLoading ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              )}

              {(!isAdmin || selectedNotification.type !== 'CONTACT_SUBMISSION') && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

/** Toast notification component */
const Toast = ({ message, show, onClose }: { message: string; show: boolean; onClose: () => void }) => (
  <AnimatePresence>
    {show && message && (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed bottom-24 md:bottom-8 right-8 z-[100] flex items-center gap-3 rounded-2xl bg-primary text-on-primary px-6 py-4 shadow-2xl"
      >
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity" aria-label="Close notification">
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    )}
  </AnimatePresence>
);

const AdminContactSubmissionsPage = () => {
  const [submissions, setSubmissions] = useState<ContactSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSub, setSelectedSub] = useState<ContactSubmissionRow | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await getAdminContactSubmissions();
      setSubmissions(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedSub || !replyText.trim()) return;
    setReplyLoading(true);
    try {
      const updated = await postAdminContactReply({
        contactSubmissionId: selectedSub.id,
        replyMessage: replyText.trim()
      });
      alert('Reply sent successfully!');
      setSubmissions(current => current.map(s => s.id === updated.id ? updated : s));
      setSelectedSub(null);
      setReplyText('');
    } catch (e: any) {
      alert('Failed to send reply: ' + e.message);
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-8 py-12 space-y-10 min-h-[60vh]">
      <div className="space-y-4">
        <h1 className="font-headline text-6xl text-primary italic">User Queries</h1>
        <p className="text-lg text-on-surface-variant max-w-[70ch]">
          Read and respond to contact form submissions from users.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100">
          <p>{error}</p>
          <button onClick={fetchSubmissions} className="mt-4 px-6 py-2 bg-primary text-white rounded-xl">Retry</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden border border-outline-variant/15">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-primary">{sub.name}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant mt-1">{sub.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface max-w-xs truncate" title={sub.subject}>{sub.subject}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${sub.status === 'REPLIED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {sub.createdAt ? new Date(sub.createdAt).toLocaleString() : ''}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedSub(sub);
                        setReplyText(sub.adminReply || '');
                      }}
                      className="px-4 py-2 bg-surface-container-highest rounded-xl text-xs font-bold uppercase tracking-widest text-primary hover:bg-outline-variant/40 transition-colors"
                    >
                      View & Reply
                    </button>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-on-surface-variant">
                    No queries found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selectedSub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedSub(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-outline-variant/20 relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedSub(null)}
                className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-headline text-primary mb-2 pr-8">{selectedSub.subject}</h2>
              <div className="flex gap-4 text-xs text-on-surface-variant mb-6 pb-4 border-b border-outline-variant/15">
                <span>From: <strong>{selectedSub.name}</strong> ({selectedSub.email})</span>
                <span>Date: {selectedSub.createdAt ? new Date(selectedSub.createdAt).toLocaleString() : ''}</span>
              </div>

              <div className="mb-6 space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Original Message</h3>
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/15 whitespace-pre-wrap text-sm text-on-surface">
                  {selectedSub.message}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Admin Reply</h3>
                {selectedSub.status === 'REPLIED' && selectedSub.adminReply ? (
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl text-sm text-on-surface whitespace-pre-wrap">
                    {selectedSub.adminReply}
                  </div>
                ) : (
                  <>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here to email the user..."
                      className="w-full h-32 bg-surface-container-highest border-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                      disabled={replyLoading}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => setSelectedSub(null)}
                        className="px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                        disabled={replyLoading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || replyLoading}
                        className="px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {replyLoading ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const UserContactSubmissionsPage = () => {
  const [submissions, setSubmissions] = useState<ContactSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSub, setSelectedSub] = useState<ContactSubmissionRow | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await getMyContactSubmissions();
      setSubmissions(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-8 py-12 space-y-10 min-h-[60vh]">
      <div className="space-y-4">
        <h1 className="font-headline text-6xl text-primary italic">My Queries</h1>
        <p className="text-lg text-on-surface-variant max-w-[70ch]">
          View your submitted contact queries and responses from our support team.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100">
          <p>{error}</p>
          <button onClick={fetchSubmissions} className="mt-4 px-6 py-2 bg-primary text-white rounded-xl">Retry</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden border border-outline-variant/15">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-on-surface max-w-xs truncate" title={sub.subject}>{sub.subject}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${sub.status === 'REPLIED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {sub.createdAt ? new Date(sub.createdAt).toLocaleString() : ''}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedSub(sub)}
                      className="px-4 py-2 bg-surface-container-highest rounded-xl text-xs font-bold uppercase tracking-widest text-primary hover:bg-outline-variant/40 transition-colors"
                    >
                      View Thread
                    </button>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-on-surface-variant">
                    No queries found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selectedSub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedSub(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-outline-variant/20 relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedSub(null)}
                className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-headline text-primary mb-2 pr-8">{selectedSub.subject}</h2>
              <div className="flex gap-4 text-xs text-on-surface-variant mb-6 pb-4 border-b border-outline-variant/15">
                <span>Date: {selectedSub.createdAt ? new Date(selectedSub.createdAt).toLocaleString() : ''}</span>
              </div>

              <div className="mb-6 space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Your Message</h3>
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/15 whitespace-pre-wrap text-sm text-on-surface">
                  {selectedSub.message}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Support Reply</h3>
                {selectedSub.status === 'REPLIED' && selectedSub.adminReply ? (
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl text-sm text-on-surface whitespace-pre-wrap">
                    {selectedSub.adminReply}
                  </div>
                ) : (
                  <div className="bg-surface-container-highest/50 p-4 rounded-xl text-sm text-on-surface-variant italic">
                    Awaiting reply from support...
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminUserStats = ({
  orders,
}: {
  orders: AdminOrderRow[];
}) => {
  const safeOrders = orders ?? [];

  const purchaseRows = useMemo(() => {
    type PurchaseRow = {
      orderId: string;
      orderNumber: string;
      buyer: string;
      buyerRef: string;
      book: string;
      purchasedAt: string;
      status: string;
      amountLabel: string;
    };

    const out: PurchaseRow[] = [];

    for (const order of safeOrders) {
      const rawUser = order.user ?? {};
      const firstName = rawUser.firstName || order.userFirstName || '';
      const lastName = rawUser.lastName || order.userLastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const buyer =
        fullName ||
        order.userName ||
        order.userEmail ||
        order.guestEmail ||
        rawUser.email ||
        order.userEmail ||
        (order.userId || rawUser.userId ? `User ${String(order.userId ?? rawUser.userId).slice(0, 8)}` : 'Unknown user');
      const buyerRef = order.userId ?? rawUser.userId ?? order.guestEmail ?? 'N/A';

      const amount = Number(order.totalAmount ?? 0);
      const amountLabel = Number.isFinite(amount) ? formatMoney(amount) : '';
      const purchasedAt = order.createdAt
        ? new Date(order.createdAt).toLocaleString()
        : 'Unknown time';

      const items = Array.isArray(order.items) ? order.items : [];
      if (items.length > 0) {
        for (const item of items) {
          out.push({
            orderId: order.orderId,
            orderNumber: order.orderNumber ?? String(order.orderId).slice(0, 8),
            buyer,
            buyerRef,
            book: item.productTitle?.trim() || item.productId || 'Unknown book',
            purchasedAt,
            status: order.status ?? 'unknown',
            amountLabel,
          });
        }
      } else {
        out.push({
          orderId: order.orderId,
          orderNumber: order.orderNumber ?? String(order.orderId).slice(0, 8),
          buyer,
          buyerRef,
          book: 'Book details unavailable',
          purchasedAt,
          status: order.status ?? 'unknown',
          amountLabel,
        });
      }
    }

    return out.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
  }, [safeOrders]);

  const uniqueBuyers = useMemo(
    () => new Set(purchaseRows.map((r) => r.buyerRef)).size,
    [purchaseRows]
  );

  return (
    <div className="max-w-screen-2xl mx-auto px-8 py-12 space-y-10">
      <div className="space-y-4">
        <h1 className="font-headline text-6xl text-primary italic">User Purchase Stats</h1>
        <p className="text-lg text-on-surface-variant max-w-[70ch]">
          Track who purchased which book and when. This replaces the private library view for admins.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Purchase Records</p>
          <p className="mt-2 font-headline text-4xl text-primary">{purchaseRows.length}</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Unique Buyers</p>
          <p className="mt-2 font-headline text-4xl text-primary">{uniqueBuyers}</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Orders Loaded</p>
          <p className="mt-2 font-headline text-4xl text-primary">{safeOrders.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-outline-variant/15">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              <th className="px-6 py-4">Buyer</th>
              <th className="px-6 py-4">Book</th>
              <th className="px-6 py-4">Purchased At</th>
              <th className="px-6 py-4">Order</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15">
            {purchaseRows.map((row) => (
              <tr key={`${row.orderId}-${row.book}`} className="hover:bg-surface-container-low/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-primary">{row.buyer}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{row.buyerRef}</p>
                </td>
                <td className="px-6 py-4 text-sm text-on-surface">{row.book}</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">{row.purchasedAt}</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">#{row.orderNumber}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-on-surface-variant">{row.amountLabel || '-'}</td>
              </tr>
            ))}
            {purchaseRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-on-surface-variant">
                  No admin order records found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Footer = ({
  onNavigate,
  isAuthenticated,
}: {
  onNavigate: (page: Page) => void;
  isAuthenticated: boolean;
}) => (
  <footer className="bg-surface-container border-t border-outline-variant/15 mt-24">
    <div className="max-w-screen-2xl mx-auto px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="space-y-6">
        <span className="text-xl font-headline text-primary">The Masuki Books</span>
        <p className="text-base font-headline text-on-surface-variant italic">
          In the corporate world, digital books are the ultimate upgrade: they are the only way to reboot your leadership style without having to clear your cache
        </p>
        <div className="flex gap-4">
          <button type="button" onClick={() => onNavigate('landing')} className="text-primary hover:opacity-80">
            <Globe className="w-5 h-5" />
          </button>
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=contactmasuki@masukibooks.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:opacity-80"
            aria-label="Email Masuki Books"
            title="contactmasuki@masukibooks.com"
          >
            <Mail className="w-5 h-5" />
          </a>
        </div>
      </div>
      <div className="space-y-6 md:pl-8">
        <h5 className="text-xs font-bold uppercase tracking-widest text-primary">Resources</h5>
        <ul className="space-y-4">
          {([] as [string, import('./types/navigation').AppPage][]).concat([
            ['Terms of Service', 'terms-of-service'],
            ['Privacy Policy', 'privacy-policy'],
            ['Contact us', 'contact-support'],
          ]).map(([label, page]) => (
            <li key={label}>
              <button
                onClick={() => onNavigate(page)}
                className="text-base font-headline text-on-surface-variant hover:text-primary hover:underline text-left"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
    <div className="max-w-screen-2xl mx-auto px-8 py-8 border-t border-outline-variant/15 flex flex-col md:flex-row justify-between items-center gap-4">
      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">© 2026 The Masuki Books. All rights reserved.</span>

    </div>
    <div className="max-w-screen-2xl mx-auto px-8 pb-8">
      <p className="text-center text-xs text-on-surface-variant italic">
        {CORPORATE_PUNCHLINE}
      </p>
    </div>
  </footer>
);

function BookCard({
  book,
  variant = 'standard',
  layout = 'stacked',
  onPrimaryAction,
}: {
  book: Book;
  variant?: 'standard' | 'personal' | 'wishlist';
  layout?: 'stacked' | 'inline';
  onPrimaryAction?: (book: Book) => void;
  key?: string | number;
}) {
  const hasImage = typeof book.image === 'string' && book.image.trim().length > 0;
  const isInline = layout === 'inline';
  const flipbookMode = isFlipbookBook(book);

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className={`group cursor-pointer ${isInline ? 'flex gap-6 items-start' : `space-y-6 ${variant === 'standard' && (book.id === '2' || book.id === '4') ? 'lg:mt-12' : ''}`}`}
    >
      <div className={`overflow-hidden rounded-lg relative bg-surface-container-highest book-shadow ${isInline ? 'aspect-[3/4] w-28 shrink-0' : 'aspect-[3/4]'}`}>
        {variant === 'personal' && flipbookMode ? (
          <div className="absolute top-4 left-4 z-10 rounded-full bg-primary text-on-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest shadow-lg">
            Flipbook
          </div>
        ) : null}
        {hasImage ? (
          <img
            src={book.image}
            alt={book.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full p-4 bg-gradient-to-b from-blue-900 to-blue-600 flex flex-col justify-end">
            <h4 className="font-headline text-2xl text-primary leading-tight line-clamp-3">{book.title}</h4>
            <p className="text-sm text-on-surface-variant mt-2 line-clamp-2">By {book.author}</p>
          </div>
        )}
        {book.rating && (
          <div className="absolute top-4 right-4 glass-card px-2 py-1 rounded-md flex items-center gap-1">
            <Star className="w-3 h-3 fill-primary text-primary" />
            <span className="text-[10px] font-bold text-primary">{book.rating}</span>
          </div>
        )}
      </div>
      <div className={isInline ? 'flex-1 space-y-1' : 'space-y-1'}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{book.category}</p>
        <h3 className="font-headline text-2xl text-primary leading-tight">{book.title}</h3>
        <p className="text-sm text-on-surface-variant">By {book.author}</p>
        {variant === 'wishlist' && <p className="text-lg font-bold text-primary mt-2">{book.price}</p>}
        {variant === 'personal' && book.progress !== undefined && (
          <div className="mt-4 space-y-2">
            <div className="h-1 w-full bg-secondary-container rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${book.progress}%` }} />
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{book.progress}% Completed</p>
          </div>
        )}
        {variant === 'personal' && !book.progress && (
          <button
            type="button"
            onClick={() => {
              onPrimaryAction?.(book);
            }}
            className="mt-4 w-full py-2 border border-outline-variant/30 rounded-lg text-xs font-bold uppercase tracking-widest text-primary hover:bg-surface-container-low transition-colors"
          >
            {flipbookMode ? 'Open Flipbook' : 'Read Now'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// --- Pages ---

// Resource Pages
const ResourcePage = ({
  setPage,
  title,
  content,
}: {
  setPage: (p: Page) => void;
  title: string;
  content: React.ReactNode;
}) => (
  <div className="min-h-screen bg-background">
    <div className="max-w-4xl mx-auto px-8 py-16">
      <button
        onClick={() => setPage('landing')}
        className="text-primary hover:text-primary/80 text-sm font-bold uppercase tracking-widest mb-8 flex items-center gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Home
      </button>
      <div className="prose prose-invert max-w-none">
        <h1 className="text-4xl font-headline mb-8 text-primary">{title}</h1>
        <div className="text-base font-headline text-on-surface-variant leading-relaxed space-y-6">
          {content}
        </div>
      </div>
    </div>
  </div>
);

const TermsOfServicePage = ({ setPage }: { setPage: (p: Page) => void }) => (
  <ResourcePage
    setPage={setPage}
    title="International Digital Terms and Conditions"
    content={
      <>
        <p>
          IMPORTANT: PLEASE READ THESE TERMS CAREFULLY. BY PURCHASING, DOWNLOADING, OR ACCESSING ANY DIGITAL CONTENT FROM Masukibooks.com YOU AGREE TO BE BOUND BY THESE TERMS.
        </p>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">1. Digital Content License (Not Sale)</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Grant of License: Upon payment of the applicable fees, MasukiBooks grants you a non-exclusive, non-transferable, non-sublicensable, personal license to access and view the digital content for your own private, non-commercial use.</li>
            <li>No Ownership: You acknowledge that you do not acquire any ownership rights in the digital content. All titles, copyrights, and intellectual property remain the sole property of the publishers of MasukiBooks.</li>
            <li>Restrictions: You are strictly prohibited from copying, sharing, distributing, selling, broadcasting, or modifying the digital content. Any unauthorized distribution (piracy) will result in immediate termination of access without refund and may lead to legal action.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">2. No Refunds / &quot;Final Sale&quot; Policy</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Immediate Performance: By clicking &quot;Purchase&quot; or &quot;Download,&quot; you expressly request that the digital content be made available to you immediately.</li>
            <li>Waiver of Cooling-Off Period: You acknowledge that once the digital content is made available for download or streaming, you lose any statutory right to cancel the transaction or seek a refund, including any &quot;cooling-off&quot; periods provided by local consumer laws (e.g., EU Consumer Rights Directive). All sales are final.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">3. Technical Requirements and Compatibility</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>User Responsibility: It is your sole responsibility to ensure that your device, software, and internet connection meet the technical requirements for the digital content. We are not responsible for your inability to open a file due to incompatible hardware or software.</li>
            <li>DRM (Digital Rights Management): Content may be protected by DRM technology. You agree not to attempt to bypass, modify, or circumvent any encryption or digital watermarking attached to the files.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">4. Jurisdiction and International Use</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Geo-Filtering: We reserve the right to use &quot;geo-blocking&quot; technology to restrict access to digital content in certain territories due to licensing restrictions or legal compliance.</li>
            <li>Compliance with Local Law: You are responsible for ensuring that your access to the digital content complies with the laws of your jurisdiction.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">5. Account Security and Termination</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Account Access: You are responsible for maintaining the confidentiality of your login credentials. Any activity occurring under your account is your responsibility.</li>
            <li>Strict Termination: We reserve the right to terminate your access to the digital content immediately, without notice, if we suspect a breach of these terms, including sharing your account credentials with third parties.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">6. Disclaimer of Warranties and Limitation of Liability</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>&quot;As Is&quot; Basis: All digital content is provided &quot;as is&quot; and &quot;as available.&quot; We do not warrant that the service will be uninterrupted or error-free.</li>
            <li>Liability Cap: To the maximum extent permitted by law, our total liability for any claim shall be limited to the amount you actually paid for the specific digital product. We are not liable for &quot;indirect damages&quot; such as loss of data or device damage.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">7. Modifications to Service</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Content Removal: We reserve the right to remove digital content from the store at any time. While we will make reasonable efforts to allow you to download previously purchased content, we do not guarantee perpetual access to the download link once the purchase is complete. You are encouraged to download and back up your purchases immediately.</li>
          </ul>
        </section>
      </>
    }
  />
);

const PrivacyPolicyPage = ({ setPage }: { setPage: (p: Page) => void }) => (
  <ResourcePage
    setPage={setPage}
    title="Privacy Policy"
    content={
      <>
        <p>
          International Privacy &amp; Data Protection Policy
        </p>
        <p><strong>Effective Date:</strong> Jan 1, 2026</p>

        <p>
          This Privacy Policy describes how MasukiBooks (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and protects your personal information. By using our website and purchasing digital content, you consent to the data practices described herein.
        </p>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">1. Data Collection: &quot;The Minimum Necessary&quot;</h2>
          <p>
            To provide digital books, we collect only the data essential for transaction fulfillment and legal compliance:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Identity Data: Name and username.</li>
            <li>Contact Data: Email address (required for digital delivery).</li>
            <li>Transaction Data: Records of digital products purchased.</li>
            <li>Technical Data: IP address, browser type, and device identifiers (used for DRM enforcement and fraud prevention).</li>
            <li>Payment Data: We do not store credit card numbers. All payments are processed by PCI-compliant third-party processors.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">2. Legal Basis for Processing (GDPR Compliance)</h2>
          <p>
            For users in the European Economic Area (EEA) and UK, we process data under the following legal bases:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Contractual Necessity: To deliver the digital book you purchased.</li>
            <li>Legal Obligation: To comply with international tax and anti-money laundering laws.</li>
            <li>Legitimate Interests: To prevent piracy, unauthorized sharing, and fraudulent transactions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">3. Strict Prohibitions on Data Misuse</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>No Sale of Data: We do not sell, rent, or lease our customer lists to third parties.</li>
            <li>Anti-Piracy Tracking: We reserve the right to embed unique, non-visible identifiers (digital watermarks) in our books. If a book is found on a piracy site, we will use the associated metadata to identify the account source and terminate service immediately.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">4. International Data Transfers</h2>
          <p>
            Your information may be transferred to, and maintained on, computers located outside of your state or country where data protection laws may differ.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">5. Data Retention Policy</h2>
          <p>
            We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Active Accounts: Data is kept while your account is active to provide access to your digital library.</li>
            <li>Legal Requirements: Transactional records are kept for to satisfy international tax audit requirements.</li>
            <li>Deletion: Once data is no longer required, it is irreversibly anonymized or deleted.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">6. Your Rights (EEA, UK, and California)</h2>
          <p>
            Depending on your location, you have the following rights:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Access/Portability: The right to request a copy of your data.</li>
            <li>Correction: The right to fix inaccurate data.</li>
            <li>Erasure (&quot;Right to be Forgotten&quot;): The right to request data deletion, provided it does not conflict with our legal record-keeping obligations.</li>
            <li>Opt-Out: The right to opt-out of automated profiling.</li>
            <li>Verification: To protect your privacy, we require a strict identity verification process before fulfilling any data requests.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">7. Security Measures</h2>
          <p>
            We implement high-level technical security, including AES-256 encryption for data at rest and TLS/SSL for data in transit. However, no method of digital transmission is 100% secure. You acknowledge that you provide your data at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">8. Use of Cookies and Tracking</h2>
          <p>
            We use cookies strictly for:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Essential Functionality: Keeping you logged in and managing your shopping cart.</li>
            <li>Security: Detecting bot activity and preventing unauthorized login attempts.</li>
            <li>Analytics: De-identified traffic analysis.</li>
            <li>Note: We do not use third-party advertising cookies that track you across other websites.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">9. Changes to this Policy</h2>
          <p>
            We reserve the right to modify this policy at any time. Significant changes will be notified via the email address associated with your account. Continued use of the service constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">10. Contact and Data Protection Officer</h2>
          <p>
            For questions regarding your data, or to exercise your rights, contact our Data Protection Office at: <a href="mailto:contactmasuki@masukibooks.com" className="text-primary underline hover:opacity-80">contactmasuki@masukibooks.com</a>
          </p>
        </section>
      </>
    }
  />
);

const ArchiveEthicsPage = ({ setPage }: { setPage: (p: Page) => void }) => (
  <ResourcePage
    setPage={setPage}
    title="Archive Ethics"
    content={
      <>
        <p>
          <span className="text-primary font-bold">The Masuki Books</span> is built on principles of cultural preservation, accessibility, and ethical stewardship of knowledge. This document outlines our commitment to ethical archival practices.
        </p>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">1. Commitment to Preservation</h2>
          <p>
            We believe that knowledge should be preserved for future generations. Our mission is to maintain digital access to important works of literature, history, and human expression, ensuring that cultural heritage remains available to all.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">2. Respect for Authors and Publishers</h2>
          <p>
            We respect the intellectual property rights of authors and publishers. All works on our platform are acquired through legitimate channels with proper licensing agreements. We aim to balance author and publisher rights with public access to knowledge.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">3. Inclusive Access</h2>
          <p>
            We are committed to making knowledge accessible to diverse audiences. Our platform includes features for:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Reading accessibility and customizable text size</li>
            <li>Multiple formats to accommodate different needs</li>
            <li>Affordable pricing structures for students and researchers</li>
            <li>Support for multiple languages and cultural perspectives</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">4. Cultural Sensitivity</h2>
          <p>
            We recognize that archives contain materials from diverse cultures and historical periods. We approach all works with cultural sensitivity while preserving historical accuracy. Historical perspectives and language are presented in their original context.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">5. Metadata and Discoverability</h2>
          <p>
            We maintain comprehensive and accurate metadata for all archived materials. This enables users to discover, contextualize, and understand works within their historical and cultural frameworks.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">6. Long-term Preservation</h2>
          <p>
            We are committed to the long-term digital preservation of works. Our infrastructure and practices follow international standards for digital preservation to ensure materials remain accessible beyond the lifespan of any single platform or organization.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">7. User Responsibility</h2>
          <p>
            Users accessing our archive agree to use materials responsibly and legally. We trust our community to respect intellectual property and use knowledge in ways that honor both creators and the collective human record.
          </p>
        </section>
      </>
    }
  />
);

const ContactSupportPage = ({ setPage }: { setPage: (p: Page) => void }) => {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSending(true);
    setContactError('');
    setContactSuccess(false);
    try {
      await postContactForm({
        name: contactName,
        email: contactEmail,
        subject: contactSubject,
        message: contactMessage,
      });
      setContactSuccess(true);
      setContactName('');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
    } catch (err: any) {
      setContactError(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setContactSending(false);
    }
  };

  return (
    <ResourcePage
      setPage={setPage}
      title="Contact Support"
      content={
        <>
          <p>
            We&apos;re here to help! Whether you have questions about your account, need technical assistance, or have feedback about <span className="text-primary font-bold">The Masuki Books</span>, we&apos;d love to hear from you.
          </p>

          <section>
            <h2 className="text-xl font-bold text-primary mt-8 mb-4">Contact Methods</h2>
            <p>
              You can reach our support team through the following channels:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><span className="font-bold">Email:</span> Contactmasuki@masukibooks.com</li>
              <li><span className="font-bold">Phone:</span> Available during business hours</li>
              <li><span className="font-bold">Contact Form:</span> Submit a message directly on our website</li>
              <li><span className="font-bold">Social Media:</span> Message us on our official social channels</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mt-8 mb-4">Contact Form</h2>
            <p className="mb-4">
              Fill out the form below and we&apos;ll get back to you as soon as possible.
            </p>

            {contactSuccess && (
              <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" />
                Your message has been sent successfully! We&apos;ll get back to you within 24-48 hours.
              </div>
            )}
            {contactError && (
              <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {contactError}
              </div>
            )}

            <form
              onSubmit={handleContactSubmit}
              className="space-y-4"
            >
              <div>
                <label htmlFor="contact-name" className="block text-sm font-bold mb-2">Name</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-bold mb-2">Email</label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 outline-none focus:ring-1 focus:ring-primary"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="contact-subject" className="block text-sm font-bold mb-2">Subject</label>
                <input
                  id="contact-subject"
                  type="text"
                  required
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 outline-none focus:ring-1 focus:ring-primary"
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-bold mb-2">Message</label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Write your message"
                />
              </div>
              <button
                type="submit"
                disabled={contactSending}
                className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {contactSending ? 'Sending\u2026' : 'Send Message'}
              </button>
            </form>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mt-8 mb-4">Response Times</h2>
            <p>
              We aim to respond to all inquiries within 24-48 hours during business days. For urgent technical issues, please mark your message as &quot;Priority&quot; and we&apos;ll prioritize your request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mt-8 mb-4">Common Issues</h2>
            <p>
              Before contacting support, you may find answers to common questions in our Help Center, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Account login and password reset</li>
              <li>Payment and billing issues</li>
              <li>Reading and navigation features</li>
              <li>Book access and download problems</li>
              <li>Subscription and membership questions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mt-8 mb-4">Technical Support</h2>
            <p>
              For technical issues, please provide:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your device type and operating system</li>
              <li>Browser name and version</li>
              <li>Description of the issue and steps to reproduce it</li>
              <li>Screenshot or error message if applicable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mt-8 mb-4">Feedback and Suggestions</h2>
            <p>
              We value your feedback and suggestions for improving The Masuki Books. Please don&apos;t hesitate to share your ideas&mdash;they help us build a better platform for everyone.
            </p>
          </section>
        </>
      }
    />
  );
};


const HelpCenterPage = ({ setPage }: { setPage: (p: Page) => void }) => (
  <ResourcePage
    setPage={setPage}
    title="Help Center"
    content={
      <>
        <p>
          Welcome to the <span className="text-primary font-bold">The Masuki Books</span> Help Center. Here you'll find answers to frequently asked questions and guides to help you get the most out of our platform.
        </p>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">Getting Started</h2>
          <h3 className="font-bold text-on-surface mt-4 mb-2">How do I create an account?</h3>
          <p>
            Click the "Sign Up" button on our homepage, enter your email address and create a password. Verify your email by clicking the confirmation link we send you, and you're ready to start exploring!
          </p>

          <h3 className="font-bold text-on-surface mt-4 mb-2">How do I reset my password?</h3>
          <p>
            On the login page, click "Forgot Password" and enter your email address. We'll send you a link to create a new password.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">Browsing & Searching</h2>
          <h3 className="font-bold text-on-surface mt-4 mb-2">How do I search for books?</h3>
          <p>
            Use the search bar at the top of the page to find books by title, author, or subject. You can also browse by category or use filters to narrow your results.
          </p>

          <h3 className="font-bold text-on-surface mt-4 mb-2">Can I save books for later?</h3>
          <p>
            Yes! Click the heart icon on any book card to add it to your wishlist. You can access your wishlist anytime from your account menu.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">Reading</h2>
          <h3 className="font-bold text-on-surface mt-4 mb-2">How do I read a book?</h3>
          <p>
            Once you've purchased a book, it appears in your Personal Library. Click "Read Now" to open it in our reader, or "Open Flipbook" for interactive flipbook formats.
          </p>

          <h3 className="font-bold text-on-surface mt-4 mb-2">What reading features are available?</h3>
          <p>
            Our reader includes features like adjustable text size, different themes (light, sepia, dark), chapter navigation, and highlighting. Use the controls at the top of the reader to customize your experience.
          </p>

          <h3 className="font-bold text-on-surface mt-4 mb-2">Can I download books?</h3>
          <p>
            Books can be downloaded in PDF format for offline reading. Look for the download button in the reader interface.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">Purchasing & Billing</h2>
          <h3 className="font-bold text-on-surface mt-4 mb-2">What payment methods do you accept?</h3>
          <p>
            We accept major credit cards, digital wallets, and other secure payment methods. All transactions are encrypted and processed by trusted payment providers.
          </p>

          <h3 className="font-bold text-on-surface mt-4 mb-2">How do I track my order?</h3>
          <p>
            After purchase, your book is immediately available in your Personal Library. You'll receive a confirmation email with your order details.
          </p>

          <h3 className="font-bold text-on-surface mt-4 mb-2">What's your refund policy?</h3>
          <p>
            We offer refunds for purchases within 7 days if you haven't accessed the content. Please contact our support team to process a refund.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">Account & Library</h2>
          <h3 className="font-bold text-on-surface mt-4 mb-2">How do I access my Personal Library?</h3>
          <p>
            Click your profile icon in the navigation menu and select "Personal Library" to see all your purchased books.
          </p>

          <h3 className="font-bold text-on-surface mt-4 mb-2">Can I delete books from my library?</h3>
          <p>
            Your purchased books are permanently in your library. If you no longer want to see a book, you can use the hide or organize features to customize your view.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mt-8 mb-4">Still Need Help?</h2>
          <p>
            If you can't find the answer you're looking for, please visit our Contact Support page or email us at Contactmasuki@masukibooks.com. Our team is happy to help!
          </p>
        </section>
      </>
    }
  />
);

const LandingPage = ({
  setPage,
  onBeginReading,
  onViewDetails,
  isAuthenticated,
  newReleases,
  catalogTotal,
  categories,
  onBookClick,
  onCategoryClick,
}: {
  setPage: (p: Page) => void;
  onBeginReading: () => void;
  onViewDetails: () => void;
  isAuthenticated: boolean;
  newReleases: Book[];
  catalogTotal: number;
  categories?: CategoryRow[];
  onBookClick?: (book: Book) => void;
  onCategoryClick?: (categoryId: string) => void;
}) => {
  const mostReadBooks = [...newReleases].reverse();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const displayCategories = (categories ?? []).filter(c => (c.bookCount ?? 0) > 0);
  const visibleCategories = showAllCategories ? displayCategories : displayCategories.slice(0, 6);

  const categoryColors = [
    { bg: 'bg-primary', text: 'text-on-primary', sub: 'text-secondary-container' },
    { bg: 'bg-secondary-container', text: 'text-primary', sub: 'text-on-secondary-container' },
    { bg: 'bg-surface-container-highest', text: 'text-primary', sub: 'text-on-surface-variant' },
    { bg: 'bg-tertiary-container', text: 'text-on-tertiary-container', sub: 'text-on-tertiary-container/70' },
    { bg: 'bg-primary-container', text: 'text-on-primary', sub: 'text-on-primary/70' },
    { bg: 'bg-surface-container-high', text: 'text-primary', sub: 'text-on-surface-variant' },
  ];

  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="relative min-h-[870px] flex items-center overflow-hidden px-8 lg:px-24">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-transparent z-10" />
          <img
            src="/assets/images/hero-library.jpeg"
            alt="Library backdrop"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative z-20 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">The Harvard Alumni Behavioral Books</span>
              <h1 className="font-headline text-4xl lg:text-6xl text-primary leading-[1.1]">
                The Definitive Framework for Corporate Excellence at Every Level.
              </h1>
              <p className="text-lg text-on-surface-variant max-w-[50ch] leading-relaxed">
                Success in a complex organization isn't just about what you know—it’s about how you behave. Developed by a collective of Harvard University Alumni, this series translates elite behavioral science into a practical, tiered roadmap for the modern workforce.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {isAuthenticated ? (
                <>
                  <button type="button" onClick={onBeginReading} className="primary-gradient text-on-primary px-8 py-4 rounded-xl font-medium transition-transform active:scale-95 flex items-center gap-2">
                    Begin Reading
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={onViewDetails} className="border border-outline-variant/30 text-primary px-8 py-4 rounded-xl font-medium hover:bg-surface-container-low transition-colors">
                    View Details
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setPage('login')} className="border border-outline-variant/30 text-primary px-8 py-4 rounded-xl font-medium hover:bg-surface-container-low transition-colors">
                  Sign In
                </button>
              )}
            </div>
            {isAuthenticated ? (
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <img
                      key={i}
                      src="/assets/images/user-avatar.jpeg"
                      className="w-10 h-10 rounded-full border-2 border-background object-cover"
                      referrerPolicy="no-referrer"
                      alt="User"
                    />
                  ))}
                </div>
                <p className="text-sm text-on-surface-variant"><span className="font-bold text-primary">{catalogTotal}</span> titles in the public catalog</p>
              </div>
            ) : (
              <div className="pt-4 max-w-xl">
                <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/80 p-6 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Members only</p>
                  <p className="text-sm text-on-surface-variant">
                    Sign in to unlock the public library, personal shelf, wishlist, and subscription features.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-72 lg:w-96 aspect-[3/4] group">
              <div className="absolute inset-0 bg-surface-container-highest rounded-lg -rotate-3 transition-transform group-hover:-rotate-6" />
              <img
                src="/assets/images/user-avatar.jpeg"
                alt="Featured Book"
                referrerPolicy="no-referrer"
                className="relative w-full h-full object-cover rounded-lg book-shadow transition-transform group-hover:-translate-y-4 group-hover:-translate-x-2"
              />
              <div className="absolute -bottom-6 -right-6 glass-card p-6 rounded-xl book-shadow max-w-[200px]">
                <p className="font-headline text-xl text-primary mb-1 italic">"Essential reading for the modern soul."</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">— The New Yorker</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Curated Shelves */}
      <section className="py-24 bg-surface">
        <div className="max-w-screen-2xl mx-auto px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-headline text-5xl text-primary italic">Unlock the DNA of Excellence: Lead at Every Level</h2>
            <p className="text-on-surface-variant max-w-[80ch] mx-auto text-lg leading-relaxed text-left">
              <span className="font-bold">Success isn't an accident. It's a framework.</span><br /><br />
              In the modern corporate landscape, talent is common, but behavioral mastery is rare. Most professionals spend their careers guessing at the "unspoken rules" of the boardroom, while organizations struggle to bridge the gap between potential and performance.<br /><br />
              <span className="font-bold text-primary text-center block">It's time to stop guessing.</span><br />
              Forged by a collective of Harvard University Alumni, this library has more than a collection of books—it is a masterclass in professional evolution. We have distilled decades of Ivy League research and real-world executive experience into a definitive behavioral roadmap designed to turn every contributor into a powerhouse and every manager into a visionary.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCategories.map((cat, index) => {
              const color = categoryColors[index % categoryColors.length];
              return (
                <div
                  key={cat.categoryId}
                  className={`relative group overflow-hidden rounded-2xl ${color.bg} min-h-[200px] cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
                  onClick={() => onCategoryClick?.(cat.categoryId)}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-8">
                    <h3 className={`font-headline text-3xl ${color.text} mb-2`}>{cat.name}</h3>
                    <p className={`${color.sub} text-sm font-bold uppercase tracking-widest`}>
                      {cat.bookCount ?? 0} {(cat.bookCount ?? 0) === 1 ? 'Title' : 'Titles'}
                    </p>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className={`w-5 h-5 ${color.text}`} />
                  </div>
                </div>
              );
            })}
          </div>
          {displayCategories.length > 6 && !showAllCategories && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => setShowAllCategories(true)}
                className="border border-outline-variant/30 text-primary px-8 py-3 rounded-xl font-medium hover:bg-surface-container-low transition-colors flex items-center gap-2"
              >
                View More Categories
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-surface-container border-y border-outline-variant/15">
        <div className="max-w-screen-2xl mx-auto px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-headline text-5xl text-primary italic">Transform Your Career. Revolutionize Your Culture.</h2>
            <p className="text-on-surface-variant max-w-[80ch] mx-auto text-lg leading-relaxed">
              Whether you are looking to accelerate your own trajectory or build a world-class workforce, the Harvard Alumni Framework Series provides the exact psychological and tactical blueprints required for the five critical stages of corporate life:
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
            <div className="space-y-6">
              <User className="w-10 h-10 text-primary" />
              <h4 className="font-headline text-2xl text-primary">For the Rising Star<br /><span className="text-lg opacity-80">(Entry-Level IC)</span></h4>
              <p className="text-on-surface-variant leading-relaxed">Stop being a "new hire" and start being indispensable. Learn the high-output behaviors that catch the eyes of executives within your first 90 days.</p>
            </div>
            <div className="space-y-6">
              <Globe className="w-10 h-10 text-primary" />
              <h4 className="font-headline text-2xl text-primary">For the Power Player<br /><span className="text-lg opacity-80">(Mid-Level IC)</span></h4>
              <p className="text-on-surface-variant leading-relaxed">Master the art of influence. Learn how to lead projects and people even when you don't have the title, becoming the "glue" that holds high-stakes initiatives together.</p>
            </div>
            <div className="space-y-6">
              <History className="w-10 h-10 text-primary" />
              <h4 className="font-headline text-2xl text-primary">For the New Captain<br /><span className="text-lg opacity-80">(Entry-Level Manager)</span></h4>
              <p className="text-on-surface-variant leading-relaxed">Navigate the hardest transition of your life with confidence. Turn your former peers into a high-performing team without losing your soul or your sanity.</p>
            </div>
            <div className="space-y-6 lg:ml-auto max-w-sm">
              <BookOpen className="w-10 h-10 text-primary" />
              <h4 className="font-headline text-2xl text-primary">For the Growth Architect<br /><span className="text-lg opacity-80">(Senior Manager)</span></h4>
              <p className="text-on-surface-variant leading-relaxed">Move from managing tasks to building systems. Learn to develop a talent pipeline that makes your department the envy of the entire organization.</p>
            </div>
            <div className="space-y-6 lg:mr-auto max-w-sm">
              <Highlighter className="w-10 h-10 text-primary" />
              <h4 className="font-headline text-2xl text-primary">For the Cultural Steward<br /><span className="text-lg opacity-80">(Leadership)</span></h4>
              <p className="text-on-surface-variant leading-relaxed">Don't just run a company—define an era. Master the high-level EQ and strategic vision required to inspire thousands and leave a lasting legacy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Edge */}
      <section className="py-24 bg-surface px-8 text-center border-b border-outline-variant/15">
        <div className="max-w-[800px] mx-auto space-y-8">
          <h2 className="font-headline text-5xl text-primary">The Edge You’ve Been Searching For</h2>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            Why settle for generic "leadership advice" when you can implement a validated framework used by the world’s most elite organizations? This is the difference between working hard and working right.
          </p>
          <blockquote className="font-serif text-2xl text-primary italic border-l-4 border-primary pl-6 py-2 text-left my-10 max-w-[600px] mx-auto bg-surface-container-low p-6 rounded-r-xl">
            "This series doesn't just teach you how to work; it teaches you how to win. It is the definitive guide for anyone who refuses to settle for mediocrity."
          </blockquote>

          <div className="pt-16 pb-8">
            <h3 className="font-headline text-4xl text-primary mb-6">Your Path to the Top Starts Here.</h3>
            <p className="text-lg text-on-surface-variant leading-relaxed max-w-[60ch] mx-auto mb-8 text-left">
              Your future self is waiting for you to make this move. Empower your team, elevate your career, and master the behaviors that define the top 1%.
            </p>
            <div className="inline-block px-12 py-6 bg-primary text-on-primary rounded-2xl font-bold tracking-wider text-xl shadow-lg border-2 border-primary/20">
              Invest in the Framework. Own the Results.
            </div>
          </div>
        </div>
      </section>

      {/* New Releases */}
      <section className="py-24 bg-surface-container-low">
        <div className="max-w-screen-2xl mx-auto px-8 space-y-16">
          <div>
            <div className="flex justify-between items-end mb-16">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">The Recent Collection</span>
                <h2 className="font-headline text-5xl text-primary">Recently Added</h2>
              </div>
              <button
                onClick={() => setPage('public-library')}
                className="text-primary font-medium flex items-center gap-2 group"
              >
                Explore Full Library
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {newReleases.map(book => (
                <div key={book.id} className="cursor-pointer" onClick={() => onBookClick?.(book)}>
                  <BookCard book={book} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-10 space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Reader Favorites</span>
              <h2 className="font-headline text-5xl text-primary">Most Read</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {mostReadBooks.map(book => (
                <div key={`most-read-${book.id}`} className="cursor-pointer" onClick={() => onBookClick?.(book)}>
                  <BookCard book={book} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const PersonalLibrary = ({
  books,
  readingBook,
  actionMessage,
  activeTab,
  onTabChange,
  onOpenReader,
  onOpenCatalog,
  onSortChange,
  sortLabel,
}: {
  books: Book[];
  readingBook: Book | undefined;
  actionMessage?: string;
  activeTab: 'reading' | 'collections';
  onTabChange: (tab: 'reading' | 'collections') => void;
  onOpenReader: (book?: Book) => void;
  onOpenCatalog: () => void;
  onSortChange: () => void;
  sortLabel: string;
}) => (
  <div className="max-w-screen-2xl mx-auto px-8 py-12 space-y-16">
    <div className="space-y-4">
      <h1 className="font-headline text-6xl text-primary">Curated Archives</h1>
      <p className="text-lg text-on-surface-variant max-w-[60ch]">
        Welcome back to your private collection. A sanctuary for the minds that seek timeless narratives and architectural thoughts.
      </p>
    </div>

    <div className="flex gap-8 border-b border-outline-variant/15">
      {[
        ['Reading Now', 'reading'],
        ['My Collections', 'collections'],
      ].map(([tab, key]) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(key as 'reading' | 'collections')}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === key ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
        >
          {tab}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-2 text-xs text-on-surface-variant">
        <span>Filter By:</span>
        <button type="button" onClick={onSortChange} className="font-bold text-primary flex items-center gap-1">
          {sortLabel} <ArrowRight className="w-3 h-3 rotate-90" />
        </button>
      </div>
    </div>

    {actionMessage ? (
      <p className="text-sm text-on-surface-variant" role="status">{actionMessage}</p>
    ) : null}

    {activeTab === 'reading' && (
      !readingBook ? (
        <div className="bg-surface-container-low rounded-2xl p-8 md:p-12 text-center space-y-6 max-w-2xl mx-auto border border-outline-variant/10">
          <div className="w-16 h-16 mx-auto bg-surface-container-highest rounded-full flex items-center justify-center text-primary">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-headline text-3xl text-primary italic">Empty Library</h2>
            <p className="text-on-surface-variant max-w-md mx-auto">
              No books in personal library,buy a book to start reading
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onOpenCatalog}
              className="primary-gradient text-on-primary px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-xs inline-flex items-center gap-2"
            >
              Browse Catalog
            </button>
          </div>
        </div>
      ) : (
        <div className="relative bg-surface-container-low rounded-2xl overflow-hidden p-8 md:p-12 flex flex-col md:flex-row gap-12 items-center">
          <div className="w-64 aspect-square rounded-lg overflow-hidden book-shadow flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0a2e3d, #14697a)' }}>
            <img
              src={readingBook?.image || ''}
              className="w-full h-full object-cover opacity-80"
              referrerPolicy="no-referrer"
              alt={readingBook?.title || 'Current Book'}
            />
          </div>
          <div className="space-y-6 flex-grow">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Resuming Chapter 4</p>
              <h2 className="font-headline text-4xl text-primary">{readingBook?.title || 'Your reading'}</h2>
              <p className="text-sm text-on-surface-variant">By {readingBook?.author || '—'}{readingBook?.progress != null ? ` • ${readingBook.progress}% Completed` : ''}</p>
            </div>
            <p className="font-headline text-xl text-primary italic leading-relaxed max-w-[50ch]">
              {readingBook?.description?.trim() ? `"${readingBook.description}"` : '"Select a title from your library to continue reading."'}
            </p>
            <div className="h-1 w-full bg-secondary-container rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${readingBook?.progress ?? 0}%` }} />
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => onOpenReader(readingBook)} className="primary-gradient text-on-primary px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> {readingBook && isFlipbookBook(readingBook) ? 'Open Flipbook' : 'Read Now'}
              </button>
              <button type="button" onClick={onOpenCatalog} className="px-8 py-3 border border-outline-variant/30 rounded-lg font-bold uppercase tracking-widest text-xs text-primary hover:bg-surface-container-high transition-colors">
                Details
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/3 h-full bg-surface-container-highest/30 -skew-x-12 translate-x-1/2 pointer-events-none" />
        </div>
      )
    )}

    {activeTab === 'collections' && (
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <h2 className="font-headline text-4xl text-primary">Your Collection</h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{books.length} Volumes Collected</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {books.map(book => <BookCard key={book.id} book={book} variant="personal" onPrimaryAction={onOpenReader} />)}
        </div>
      </div>
    )}

  </div>
);

const PublicLibrary = ({
  books,
  totalCount,
  onAddToCart,
  onRequestPurchaseAccess,
  showAddToCart = true,
  showPurchaseToView = true,
  actionMessage,
  pagination,
  viewMode,
  onToggleViewMode,
  sortMode,
  onToggleSortMode,
  searchQuery,
  onSearchChange,
  categoryFilter,
  categories,
  onCategoryClick,
}: {
  books: Book[];
  totalCount: number;
  onAddToCart: (book: Book) => void;
  onRequestPurchaseAccess: (book: Book) => void;
  showAddToCart?: boolean;
  showPurchaseToView?: boolean;
  actionMessage?: string;
  pagination: {
    onPrev: () => void;
    onNext: () => void;
    onSelectPage: (page1Based: number) => void;
    currentPage1Based: number;
    totalPages: number;
  };
  viewMode: 'grid' | 'list';
  onToggleViewMode: (mode: 'grid' | 'list') => void;
  sortMode: 'latest' | 'title';
  onToggleSortMode: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  categoryFilter?: string;
  categories?: CategoryRow[];
  onCategoryClick?: (name: string) => void;
}) => {
  const filteredBooks = books;

  return (
    <div className="max-w-screen-2xl mx-auto px-8 py-12 space-y-12">
      <div className="space-y-4">
        <h1 className="font-headline text-7xl text-primary">The Boundless Collection</h1>
        <p className="text-lg text-on-surface-variant italic">Browse through centuries of thought, curated for the modern intellectual.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Sidebar Filters */}
        <aside className="space-y-12">
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Search Books</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search by title, author..."
                value={searchQuery ?? ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full bg-surface-container-highest border-none rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Categories</h4>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onCategoryClick?.('')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!categoryFilter ? 'bg-primary text-on-primary font-bold' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest'}`}
              >
                All Categories
              </button>
              {(categories ?? []).filter(c => (c.bookCount ?? 0) > 0).map(cat => (
                <button
                  key={cat.categoryId}
                  type="button"
                  onClick={() => onCategoryClick?.(cat.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${categoryFilter === cat.name ? 'bg-primary text-on-primary font-bold' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest'}`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-xs ${categoryFilter === cat.name ? 'text-on-primary/70' : 'text-on-surface-variant/50'}`}>{cat.bookCount ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Language</h4>
            <select className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm outline-none">
              <option>English</option>
              <option>French</option>
              <option>German</option>
            </select>
          </div>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-12">
          {actionMessage ? (
            <p className="text-sm text-on-surface-variant" role="status">{actionMessage}</p>
          ) : null}
          <div className="bg-surface-container-low rounded-xl p-4 flex justify-between items-center">
            <span className="text-xs text-on-surface-variant">Showing <span className="font-bold text-primary">{totalCount}</span> masterpieces</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-on-surface-variant">SORT:</span>
                <button type="button" onClick={onToggleSortMode} className="font-bold text-primary flex items-center gap-1">
                  {sortMode === 'latest' ? 'Latest Acquisitions' : 'Title A-Z'} <ArrowRight className="w-3 h-3 rotate-90" />
                </button>
              </div>
              <div className="flex gap-2 border-l border-outline-variant/30 pl-6">
                <button type="button" onClick={() => onToggleViewMode('grid')} className={`p-2 rounded-lg shadow-sm ${viewMode === 'grid' ? 'bg-white text-primary' : 'text-on-surface-variant hover:text-primary'}`}><LayoutGrid className="w-4 h-4" /></button>
                <button type="button" onClick={() => onToggleViewMode('list')} className={`p-2 rounded-lg shadow-sm ${viewMode === 'list' ? 'bg-white text-primary' : 'text-on-surface-variant hover:text-primary'}`}><ListIcon className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <div className={viewMode === 'list' ? 'space-y-6' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8'}>
            {filteredBooks.map((book) => (
              <div key={book.id} className={viewMode === 'list' ? 'rounded-2xl border border-outline-variant/15 bg-white/70 p-4' : 'space-y-3'}>
                <BookCard book={book} layout={viewMode === 'list' ? 'inline' : 'stacked'} />
                {/* Metadata below cover */}
                <div className="px-1 space-y-1.5 mt-2">
                  <h4 className="text-sm font-bold text-on-surface leading-snug line-clamp-2">{book.title}</h4>
                  <p className="text-xs text-on-surface-variant">{book.author}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">{book.category || 'Digital'}</span>
                    {book.price && <span className="text-sm font-bold text-primary">{book.price}</span>}
                  </div>
                </div>
                <div className={(showAddToCart && showPurchaseToView) ? 'grid grid-cols-2 gap-2 mt-2' : 'grid grid-cols-1 gap-2 mt-2'}>
                  {showAddToCart ? (
                    <button
                      type="button"
                      className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-primary border border-outline-variant/30 rounded-lg hover:bg-surface-container-high transition-colors"
                      onClick={() => onAddToCart(book)}
                    >
                      Add to Cart
                    </button>
                  ) : null}
                  {showPurchaseToView ? (
                    <button
                      type="button"
                      className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-on-primary rounded-lg primary-gradient flex items-center justify-center gap-1"
                      onClick={() => onRequestPurchaseAccess(book)}
                    >
                      Purchase to View
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-12">
              <button type="button" onClick={pagination.onPrev} className="p-3 rounded-full border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {compactPaginationSlots(pagination.totalPages, pagination.currentPage1Based).map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={slot === '…'}
                  onClick={() => typeof slot === 'number' && pagination.onSelectPage(slot)}
                  className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${slot === pagination.currentPage1Based ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'}`}
                >
                  {slot}
                </button>
              ))}
              <button type="button" onClick={pagination.onNext} className="p-3 rounded-full border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CartPage = ({
  cart,
  cartBooks,
  onRemoveLine,
  onProceedCheckout,
  onMoveToWishlist,
  onBrowseCatalog,
  actionMessage,
}: {
  cart: CartRow | null | undefined;
  cartBooks: Book[];
  onRemoveLine: (cartItemId: string) => void;
  onProceedCheckout: () => void;
  onMoveToWishlist: (book: Book) => void;
  onBrowseCatalog: () => void;
  actionMessage?: string;
}) => {
  const subNum = cartBooks.reduce(
    (sum, book) => sum + parseCurrencyAmount(book.price),
    0
  );
  const totalItems = cartBooks.length;
  return (
    <div className="max-w-screen-2xl mx-auto px-8 py-12 space-y-16">
      <div className="space-y-4">
        <h1 className="font-headline text-6xl text-primary italic">Shopping Cart</h1>
        <p className="text-lg text-on-surface-variant italic">Review your selected volumes before they enter your permanent archive.</p>
        {actionMessage ? <p className="text-sm text-on-surface-variant" role="status">{actionMessage}</p> : null}
      </div>

      {cartBooks.length === 0 ? (
        <div className="text-center py-20 space-y-6">
          <ShoppingCart className="w-16 h-16 mx-auto text-on-surface-variant/30" />
          <h2 className="font-headline text-3xl text-primary italic">Your cart is empty</h2>
          <p className="text-on-surface-variant max-w-md mx-auto">Browse our collection and add books to your cart to get started.</p>
          <button type="button" onClick={onBrowseCatalog} className="primary-gradient text-on-primary px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs">
            Browse Library
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-6">
            {cartBooks.map(book => (
              <div key={book.id} className="flex gap-8 p-6 bg-surface-container-low rounded-xl border border-outline-variant/15 group hover:shadow-md transition-shadow">
                <div className="w-32 aspect-[3/4] rounded-lg overflow-hidden book-shadow flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0a2e3d, #14697a)' }}>
                  <img src={book.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" alt={book.title} />
                </div>
                <div className="flex-grow flex flex-col justify-between py-2">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-headline text-2xl text-primary italic">{book.title}</h3>
                      <button type="button" className="text-on-surface-variant hover:text-primary transition-colors" onClick={() => onRemoveLine(book.cartItemId ?? book.id)}><X className="w-5 h-5" /></button>
                    </div>
                    <p className="text-sm text-on-surface-variant">By {book.author} • {book.category}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <button type="button" onClick={() => onMoveToWishlist(book)} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">Move to Wishlist</button>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Single copy</span>
                      <p className="font-headline text-2xl text-primary italic">{book.price}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="space-y-8">
            <div className="bg-surface-container-low p-12 rounded-2xl space-y-8 sticky top-32">
              <h3 className="font-headline text-3xl text-primary italic">Order Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-on-surface-variant">
                  <span>Subtotal ({totalItems} Items)</span>
                  <span>{formatMoney(subNum)}</span>
                </div>
                <div className="flex justify-between text-sm text-on-surface-variant">
                  <span>Archival Fee</span>
                  <span>{formatMoney(0)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Estimated Tax</span>
                  <span>{formatMoney(0)}</span>
                </div>
                <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-baseline">
                  <span className="font-headline text-2xl text-primary italic">Total</span>
                  <span className="font-headline text-4xl text-primary italic">{formatMoney(subNum)}</span>
                </div>
              </div>
              <button type="button" className="w-full primary-gradient text-on-primary py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 group" onClick={onProceedCheckout}>
                Proceed to Checkout <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-[10px] text-center text-on-surface-variant leading-relaxed">
                Secure SSL Encrypted Checkout. <br /> Read our <a href="#" className="underline">Archive Ethics</a> and Shipping Policy.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

const WishlistPage = ({
  savedBooks,
  onMoveSavedToCart,
  onRemoveFromWishlist,
  onBrowseCatalog,
  actionMessage,
}: {
  savedBooks: Book[];
  onMoveSavedToCart: (book: Book) => void;
  onRemoveFromWishlist: (book: Book) => void;
  onBrowseCatalog: () => void;
  actionMessage?: string;
}) => (
  <div className="max-w-screen-2xl mx-auto px-8 py-12 space-y-16">
    <div className="space-y-4">
      <h1 className="font-headline text-6xl text-primary italic">My Wishlist</h1>
      <p className="text-lg text-on-surface-variant italic">Books you've saved for later. Move them to your cart when you're ready to purchase.</p>
      {actionMessage ? <p className="text-sm text-on-surface-variant" role="status">{actionMessage}</p> : null}
    </div>

    {savedBooks.length === 0 ? (
      <div className="text-center py-20 space-y-6">
        <Star className="w-16 h-16 mx-auto text-on-surface-variant/30" />
        <h2 className="font-headline text-3xl text-primary italic">Your wishlist is empty</h2>
        <p className="text-on-surface-variant max-w-md mx-auto">Save books you're interested in to your wishlist and come back to them later.</p>
        <button type="button" onClick={onBrowseCatalog} className="primary-gradient text-on-primary px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs">
          Browse Library
        </button>
      </div>
    ) : (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{savedBooks.length} {savedBooks.length === 1 ? 'Item' : 'Items'} Saved</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {savedBooks.map(book => (
            <div key={book.id} className="space-y-4 rounded-2xl border border-outline-variant/15 bg-surface-container-low p-4 hover:shadow-md transition-shadow">
              <div className="relative">
                <BookCard book={book} variant="wishlist" />
                <button
                  type="button"
                  onClick={() => onRemoveFromWishlist(book)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm text-on-surface-variant hover:text-primary hover:bg-background transition-all"
                  title="Remove from wishlist"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-1 space-y-1">
                <h4 className="text-sm font-bold text-on-surface leading-snug line-clamp-2">{book.title}</h4>
                <p className="text-xs text-on-surface-variant">{book.author}</p>
                {book.price && <p className="text-sm font-bold text-primary">{book.price}</p>}
              </div>
              <button type="button" onClick={() => onMoveSavedToCart(book)} className="w-full py-2.5 text-[10px] font-bold uppercase tracking-widest text-on-primary rounded-lg primary-gradient flex items-center justify-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5" /> Move to Cart
              </button>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const SubscriptionPage = ({
  plans,
  status,
  onSubscribe,
  actionError,
  catalogTotal,
  billingCycle,
  onToggleBillingCycle,
}: {
  plans: UiSubscriptionPlan[];
  status: SubscriptionStatusRow | null;
  onSubscribe: (planId: string) => void;
  actionError?: string;
  catalogTotal: number;
  billingCycle: 'annual' | 'monthly';
  onToggleBillingCycle: () => void;
}) => (
  <div className="max-w-screen-2xl mx-auto px-8 py-20 space-y-20">
    <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 items-stretch">
      <div className="relative overflow-hidden rounded-[2rem] border border-outline-variant/20 bg-surface-container-low p-10 md:p-14 book-shadow">
        <div className="absolute inset-0 opacity-60 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-tertiary/10 blur-3xl" />
        </div>
        <div className="relative space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
            Subscription
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Curated access
          </div>
          <div className="space-y-5 max-w-3xl">
            <h1 className="font-headline text-5xl md:text-7xl leading-[0.95] text-primary">
              Elevate your reading experience.
            </h1>
            <p className="text-lg text-on-surface-variant leading-relaxed max-w-[62ch]">
              Choose a plan that matches how you read. Unlock the public library, curated shelves, and a calmer archival experience with a membership built for sustained use.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/75 border border-outline-variant/20 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Public Titles</p>
              <p className="mt-2 font-headline text-3xl text-primary">{catalogTotal}</p>
            </div>
            <div className="rounded-2xl bg-white/75 border border-outline-variant/20 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Membership</p>
              <p className="mt-2 font-headline text-2xl text-primary">{status?.planName ?? 'Not active'}</p>
            </div>
            <div className="rounded-2xl bg-white/75 border border-outline-variant/20 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">State</p>
              <p className="mt-2 font-headline text-2xl text-primary">{status?.active ? 'Active' : 'Available'}</p>
            </div>
          </div>
        </div>
      </div>

      <aside className="rounded-[2rem] border border-outline-variant/20 bg-primary p-8 md:p-10 text-on-primary relative overflow-hidden book-shadow">
        <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-black/10 blur-3xl" />
        </div>
        <div className="relative space-y-8">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary-container">Current Access</p>
            <h2 className="font-headline text-3xl italic">{status?.planName ?? 'No active plan'}</h2>
            <p className="text-sm text-secondary-container/90 leading-relaxed">
              {status
                ? `Status: ${status.active ? 'active' : status.status ?? 'inactive'}`
                : 'Select a plan below to unlock membership and keep your reading flow uninterrupted.'}
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/15 p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary-container">Billing view</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary-container">{billingCycle}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <button type="button" onClick={onToggleBillingCycle} className="flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left transition-colors hover:bg-white/15">
                <p className="text-xs font-bold uppercase tracking-widest text-secondary-container">Toggle pricing view</p>
                <p className="mt-1 text-sm text-secondary-container/90">Switch between annual and monthly commitment labels.</p>
              </button>
            </div>
          </div>

          <ul className="space-y-4 text-sm text-secondary-container/95">
            {[
              'Unlock curated reading access.',
              'Keep your current shelf visible across sessions.',
              'Move through the catalog without breaking the reading flow.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 flex-none" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </section>

    {actionError ? (
      <p className="rounded-2xl border border-outline-variant/20 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant" role="status">
        {actionError}
      </p>
    ) : null}

    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`relative flex h-full flex-col rounded-[2rem] border p-8 md:p-10 shadow-sm transition-transform duration-200 ${plan.recommended
            ? 'border-primary bg-white shadow-2xl md:-translate-y-2'
            : 'border-outline-variant/25 bg-surface-container-low'
            }`}
        >
          {plan.recommended ? (
            <div className="absolute -top-3 left-6 rounded-full bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-on-primary">
              Most Popular
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">{plan.sub}</p>
            <h3 className="font-headline text-3xl text-primary">{plan.title}</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Access designed for steady readers who want a cleaner, quieter archive.
            </p>
          </div>

          <div className="mt-8 flex items-end gap-2">
            <span className="font-headline text-5xl text-primary">${plan.price}</span>
            <span className="pb-1 text-sm text-on-surface-variant">/{billingCycle === 'annual' ? 'annual access' : 'monthly access'}</span>
          </div>

          <ul className="mt-8 space-y-4">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-on-surface-variant">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={`mt-8 w-full rounded-2xl px-5 py-4 text-xs font-bold uppercase tracking-[0.24em] transition-all ${plan.recommended
              ? 'primary-gradient text-on-primary shadow-lg hover:opacity-95'
              : 'bg-surface-container-high text-primary hover:bg-surface-container-highest'
              }`}
            onClick={() => onSubscribe(plan.id)}
          >
            Choose {plan.title}
          </button>
        </div>
      ))}
    </section>

    <section className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center pt-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-on-background book-shadow">
        <img src="/assets/images/hero-library.jpeg" className="h-full w-full object-cover opacity-50" referrerPolicy="no-referrer" alt="Archiving" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-auto md:max-w-[320px] rounded-2xl border border-white/15 bg-white/75 p-6 backdrop-blur-xl">
          <p className="font-headline text-xl italic text-primary leading-snug">"A library is not a luxury but one of the necessities of life."</p>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">— Henry Ward Beecher</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="font-headline text-4xl md:text-5xl text-primary">The Art of Digital Archiving</h2>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            The subscription page should feel like a decision point, not a wall of pricing. This layout puts the current state, pricing view, and plan selection where readers can scan it quickly.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:gap-8">
          <div className="rounded-2xl bg-surface-container-low p-6 md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Public Titles</p>
            <p className="mt-3 font-headline text-4xl text-primary">{catalogTotal}</p>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-6 md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Billing mode</p>
            <p className="mt-3 font-headline text-3xl text-primary">{billingCycle === 'annual' ? 'Annual' : 'Monthly'}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
);

const CheckoutPage = ({
  setPage,
  cartBooks,
  subtotalLabel,
  onFinalize,
  onDownloadInvoice,
  invoice,
  checkoutError,
}: {
  setPage: (p: Page) => void;
  cartBooks: Book[];
  subtotalLabel: string;
  onFinalize: () => Promise<void>;
  onDownloadInvoice: () => void;
  invoice?: {
    invoiceNumber: string;
    orderId: string;
    amountLabel: string;
    dateLabel: string;
    paymentLabel: string;
  } | null;
  checkoutError?: string;
}) => {
  const [paying, setPaying] = useState(false);

  const submitPayment = () => {
    if (paying) return;
    setPaying(true);
    void onFinalize().finally(() => setPaying(false));
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-8 py-12 space-y-12">
      <div className="space-y-4">
        <h1 className="font-headline text-6xl text-primary italic">Complete your acquisition</h1>
        <p className="text-lg text-on-surface-variant">You are moments away from expanding your digital archive. Secure your selected volumes below.</p>
      </div>

      {checkoutError ? (
        <p className="text-sm text-on-surface-variant" role="status">{checkoutError}</p>
      ) : null}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
        <div className="lg:col-span-3 space-y-12">
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">01</div>
              <h2 className="font-headline text-3xl text-primary italic">Delivery Details</h2>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">First Name</label>
                <input type="text" placeholder="Julian" className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-sm outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Last Name</label>
                <input type="text" placeholder="Barnes" className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-sm outline-none" />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Email Address</label>
                <input type="email" placeholder="Masukibooks@gmail.com" className="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-sm outline-none" />
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">02</div>
              <h2 className="font-headline text-3xl text-primary italic">Secure Payment</h2>
            </div>
            <div className="p-6 rounded-xl border border-primary bg-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 rounded-full border-4 border-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-primary">RAZORPAY SECURE CHECKOUT</p>
                  <p className="text-[10px] text-on-surface-variant">Cards, UPI, net banking &amp; wallets</p>
                </div>
              </div>
              <LayoutGrid className="w-5 h-5 text-on-surface-variant" />
            </div>
            <div className="bg-surface-container-low p-8 rounded-xl space-y-3">
              <p className="text-sm text-on-surface">
                Payments are processed by Razorpay. When you continue, a secure Razorpay window opens to
                collect your card or UPI details &mdash; they never touch our servers.
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Test mode card: 4111 1111 1111 1111 &middot; any future expiry &middot; any CVV
              </p>
            </div>
          </section>
        </div>

        <aside className="lg:col-span-2">
          <div className="bg-surface-container-low p-12 rounded-2xl space-y-12">
            <h3 className="font-headline text-4xl text-primary italic">Your Curation</h3>
            <div className="space-y-8">
              {cartBooks.slice(0, 4).map(item => (
                <div key={item.id} className="flex gap-6">
                  <div className="w-20 aspect-[3/4] bg-on-background rounded-lg overflow-hidden book-shadow flex-shrink-0">
                    <img src={item.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={item.title} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-headline text-xl text-primary italic">{item.title}</h4>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">E-BOOK (DIGITAL)</p>
                    <p className="text-sm font-bold text-primary mt-2">{item.price}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4 pt-8 border-t border-outline-variant/30">
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>SUBTOTAL</span>
                <span>{subtotalLabel}</span>
              </div>
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>ARCHIVAL TAX</span>
                <span>{formatMoney(0)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-4">
                <span className="font-headline text-3xl text-primary italic">Total Investment</span>
                <span className="font-headline text-5xl text-primary italic">{subtotalLabel}</span>
              </div>
            </div>
            <button type="button" disabled={paying} className="w-full primary-gradient text-on-primary py-5 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed" onClick={submitPayment}>
              {paying ? 'OPENING RAZORPAY\u2026' : 'PAY SECURELY WITH RAZORPAY'}
            </button>
            {invoice ? (
              <div className="bg-white rounded-xl border border-outline-variant/20 p-5 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Invoice Generated</p>
                <p className="text-sm text-on-surface"><span className="font-semibold">Invoice:</span> {invoice.invoiceNumber}</p>
                <p className="text-sm text-on-surface"><span className="font-semibold">Order:</span> {invoice.orderId}</p>
                <p className="text-sm text-on-surface"><span className="font-semibold">Amount:</span> {invoice.amountLabel}</p>
                <p className="text-sm text-on-surface"><span className="font-semibold">Paid via:</span> {invoice.paymentLabel}</p>
                <button
                  type="button"
                  onClick={onDownloadInvoice}
                  className="mt-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-primary text-primary hover:bg-surface-container-high"
                >
                  Download Bill
                </button>
              </div>
            ) : null}
            <div className="flex justify-center gap-8 pt-4">
              <Globe className="w-5 h-5 text-on-surface-variant/50" />
              <History className="w-5 h-5 text-on-surface-variant/50" />
              <Highlighter className="w-5 h-5 text-on-surface-variant/50" />
            </div>
            <p className="text-[10px] text-center text-on-surface-variant uppercase tracking-widest">ENCRYPTED SSL TRANSACTION • DIGITAL DELIVERY</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

const LoginPage = ({
  setPage,
  onSignIn,
  onSignInAdmin,
  onSignUp,
  onSignInWithGoogle,
  googleAuthLoading,
}: {
  setPage: (p: Page) => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignInAdmin: (email: string, password: string) => Promise<void>;
  onSignUp: (
    fullName: string,
    email: string,
    password: string,
    phone: string
  ) => Promise<void>;
  onSignInWithGoogle: () => Promise<void>;
  googleAuthLoading?: boolean;
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const resetErrors = () => setFormError('');

  const submitLabel =
    mode === 'signup' ? 'Create Account' : adminMode ? 'Admin Sign In' : 'Sign In to Library';

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-primary relative p-24 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-transparent to-transparent z-10" />
          <img src="/assets/images/login-bg.jpeg" className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Login Background" />
        </div>
        <div className="relative z-20 space-y-4">
          <h1 className="text-4xl font-headline italic text-on-primary">Masuki Books</h1>
          <p className="text-on-primary/70 max-w-[40ch]">Preserving the digital word through curated archival experiences.</p>
        </div>
        <div className="relative z-20 space-y-12">
          <div className="space-y-4">
            <p className="font-headline text-4xl text-on-primary italic leading-tight max-w-[15ch]">
              "A library is not a luxury but one of the necessities of life."
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-on-primary/50">— HENRY WARD BEECHER</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <img key={i} src="/assets/images/user-avatar.jpeg" className="w-10 h-10 rounded-full border-2 border-primary object-cover" referrerPolicy="no-referrer" alt="User" />
              ))}
            </div>
            <p className="text-xs text-on-primary/70">Secure access to your private library</p>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 bg-white p-8 md:p-24 flex items-center justify-center">
        <div className="w-full max-w-md space-y-12">
          <div className="space-y-4">
            <h2 className="font-headline text-5xl text-primary italic">
              {mode === 'signup' ? 'Join The Archive' : 'Welcome Back'}
            </h2>
            <p className="text-on-surface-variant">
              {mode === 'signup'
                ? 'Create your Masuki account and start reading instantly.'
                : 'Sign in to your private archive collection.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-container-low p-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setAdminMode(false);
                resetErrors();
              }}
              className={`rounded-lg py-2 text-xs font-bold uppercase tracking-widest transition-colors ${mode === 'signin' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-surface-container-high'
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setAdminMode(false);
                resetErrors();
              }}
              className={`rounded-lg py-2 text-xs font-bold uppercase tracking-widest transition-colors ${mode === 'signup' ? 'bg-primary text-on-primary' : 'text-primary hover:bg-surface-container-high'
                }`}
            >
              Register
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant/30" /></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest text-on-surface-variant">
              <span className="bg-white px-4">SECURE AUTHENTICATION</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            disabled={googleAuthLoading || busy}
            onClick={async () => {
              setFormError('');
              try {
                await onSignInWithGoogle();
              } catch (er) {
                setFormError(er instanceof Error ? er.message : 'Google sign-in failed.');
              }
            }}
            className="w-full flex items-center justify-center gap-3 border border-outline-variant/30 bg-white hover:bg-surface-container-low rounded-xl py-3.5 text-sm font-semibold text-on-surface transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            {googleAuthLoading ? 'Redirecting to Google...' : 'Continue with Google'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant/30" /></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest text-on-surface-variant">
              <span className="bg-white px-4">OR USE EMAIL</span>
            </div>
          </div>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              setFormError('');
              setBusy(true);
              void (async () => {
                try {
                  if (mode === 'signup') {
                    if (password !== confirmPassword) {
                      throw new Error('Password confirmation does not match.');
                    }
                    await onSignUp(fullName, email, password, phone);
                    setPage('personal-library');
                    return;
                  }

                  if (adminMode) {
                    await onSignInAdmin(email, password);
                    setPage('admin');
                    return;
                  }

                  await onSignIn(email, password);
                  const signedIn = getStoredUser();
                  if ((signedIn?.role ?? '').toUpperCase() === 'ADMIN') {
                    setPage('admin');
                  } else {
                    setPage('personal-library');
                  }
                } catch (er) {
                  setFormError(er instanceof Error ? er.message : 'Authentication failed.');
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {formError ? (
              <p className="text-xs text-on-surface-variant" role="alert">{formError}</p>
            ) : null}
            {mode === 'signup' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant">Full Name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="John Reader" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-primary" required />
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant">Email Address</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="masukibooks@gmail.com" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            {mode === 'signup' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant">Phone Number (optional)</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+91 98XXXXXXXX" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-primary" />
              </div>
            ) : null}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-bold text-on-surface-variant">Password</label>
                {mode === 'signin' ? (
                  <button
                    type="button"
                    className="text-[10px] font-bold text-primary hover:underline"
                    onClick={() => {
                      window.location.href = 'mailto:support@masukibooks.com?subject=Password%20reset';
                    }}
                  >
                    Forgot?
                  </button>
                ) : null}
              </div>
              <div className="relative">
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-primary" minLength={8} required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {mode === 'signup' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant">Confirm Password</label>
                <div className="relative">
                  <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your password" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-4 text-sm outline-none focus:ring-1 focus:ring-primary" minLength={8} required />
                  <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={adminMode}
                  onChange={(e) => setAdminMode(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <span className="text-xs text-on-surface-variant group-hover:text-primary transition-colors">Use Admin Login</span>
              </label>
            )}

            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
              <span className="text-xs text-on-surface-variant group-hover:text-primary transition-colors">Stay authenticated for 30 days</span>
            </label>
            <button type="submit" disabled={busy} className="w-full primary-gradient text-on-primary py-4 rounded-xl font-bold text-sm shadow-xl active:scale-[0.98] transition-transform disabled:opacity-70">
              {busy ? 'Please wait...' : submitLabel}
            </button>
          </form>
          <p className="text-center text-sm text-on-surface-variant">
            {mode === 'signup' ? (
              <>
                Already registered?{' '}
                <button
                  type="button"
                  className="font-bold text-primary hover:underline"
                  onClick={() => {
                    setMode('signin');
                    setAdminMode(false);
                    resetErrors();
                  }}
                >
                  Sign in now
                </button>
              </>
            ) : (
              <>
                Not a member yet?{' '}
                <button
                  type="button"
                  className="font-bold text-primary hover:underline"
                  onClick={() => {
                    setMode('signup');
                    setAdminMode(false);
                    resetErrors();
                  }}
                >
                  Create account
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

const AdminVaultPage = ({
  books,
  onEditBook,
  onUploadBookFile,
  onDeleteBooks,
  adminActionError,
  pagination,
}: {
  books: Book[];
  onEditBook: (bookId: string) => void;
  onUploadBookFile: (bookId: string) => void;
  onDeleteBooks: (bookIds: string[]) => void;
  adminActionError?: string;
  pagination: {
    onPrev: () => void;
    onNext: () => void;
    onSelectPage: (page1Based: number) => void;
    currentPage1Based: number;
    totalPages: number;
    totalElements: number;
  };
}) => {
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredBooks = useMemo(() => {
    let result = [...books].sort((a, b) => {
      const dateA = new Date(a.lastModified || 0).getTime();
      const dateB = new Date(b.lastModified || 0).getTime();
      return dateB - dateA; // Most recent first
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b =>
        (b.title?.toLowerCase() ?? '').includes(query) ||
        (b.author?.toLowerCase() ?? '').includes(query) ||
        (b.ref?.toLowerCase() ?? '').includes(query)
      );
    }

    return result;
  }, [books, searchQuery]);

  return (
    <div className="max-w-screen-2xl mx-auto px-8 py-12 space-y-12">
      <div className="flex justify-between items-end">
        <div className="space-y-4">
          <h1 className="font-headline text-6xl text-primary italic">Curating the Digital Vault</h1>
          <p className="text-lg text-on-surface-variant max-w-[60ch]">
            Manage the public collection with archival precision. Refine metadata, and maintain the integrity of our shared heritage.
          </p>
        </div>
      </div>

      {adminActionError ? (
        <p className="text-sm text-on-surface-variant" role="status">{adminActionError}</p>
      ) : null}

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-grow relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Filter by title, author, or ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl pl-12 pr-4 py-4 text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {selectedBookIds.size > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete ${selectedBookIds.size} book(s)? This cannot be undone.`)) {
                  onDeleteBooks(Array.from(selectedBookIds));
                  setSelectedBookIds(new Set());
                }
              }}
              className="bg-red-600/20 text-red-700 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-red-600/30 transition-colors border border-red-600/30"
            >
              <X className="w-4 h-4" /> Delete {selectedBookIds.size}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-outline-variant/15">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              <th className="px-8 py-6">
                <input
                  type="checkbox"
                  checked={selectedBookIds.size === filteredBooks.length && filteredBooks.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBookIds(new Set(filteredBooks.map(b => b.id)));
                    } else {
                      setSelectedBookIds(new Set());
                    }
                  }}
                  className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                />
              </th>
              <th className="px-8 py-6">Cover</th>
              <th className="px-8 py-6">Manuscript</th>
              <th className="px-8 py-6">Details</th>
              <th className="px-8 py-6">Last Modified</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15">
            {filteredBooks.map(item => (
              <tr key={item.id} className="group hover:bg-surface-container-low/50 transition-colors">
                <td className="px-8 py-6">
                  <input
                    type="checkbox"
                    checked={selectedBookIds.has(item.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedBookIds);
                      if (e.target.checked) {
                        newSet.add(item.id);
                      } else {
                        newSet.delete(item.id);
                      }
                      setSelectedBookIds(newSet);
                    }}
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                  />
                </td>
                <td className="px-8 py-6 align-top">
                  <div className="overflow-hidden rounded-lg relative bg-surface-container-highest book-shadow aspect-[3/4] w-28 shrink-0 border border-outline-variant/10">
                    <img src={item.image} alt={`${item.title} cover`} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                </td>
                <td className="px-8 py-6 align-top">
                  <div className="space-y-1 pt-2">
                    <p className="font-headline text-xl text-primary italic">{item.title}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Ref: {item.ref}</p>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm font-medium text-primary">{item.author}</p>
                </td>
                <td className="px-8 py-6 text-sm text-on-surface-variant">{item.lastModified}</td>
                <td className="px-8 py-6 text-right flex items-center justify-end gap-3">
                  <button type="button" title="Edit book" onClick={() => onEditBook(item.id)} className="text-on-surface-variant hover:text-primary transition-colors">
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button type="button" title="Upload file" onClick={() => onUploadBookFile(item.id)} className="text-on-surface-variant hover:text-primary transition-colors">
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    title="Delete book"
                    onClick={() => {
                      if (confirm(`Delete "${item.title}"? This cannot be undone.`)) {
                        onDeleteBooks([item.id]);
                      }
                    }}
                    className="text-on-surface-variant hover:text-red-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center text-xs text-on-surface-variant">
        <span>Showing {filteredBooks.length} of {pagination.totalElements} archived volumes • Sorted by most recent</span>
        <div className="flex gap-2">
          <button type="button" onClick={pagination.onPrev} className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center hover:border-primary transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          {compactPaginationSlots(pagination.totalPages, pagination.currentPage1Based).map((slot, i) => (
            <button
              key={i}
              type="button"
              disabled={slot === '…'}
              onClick={() => typeof slot === 'number' && pagination.onSelectPage(slot)}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${slot === pagination.currentPage1Based ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-high'}`}
            >
              {slot}
            </button>
          ))}
          <button type="button" onClick={pagination.onNext} className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center hover:border-primary transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

const UserProfilePage = ({
  user,
  setPage,
  booksCount,
}: {
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
  setPage?: (p: Page) => void;
  booksCount?: number;
}) => {
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Reader';
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'R';
  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_PIC_KEY);
      if (saved) setProfilePic(saved);
    } catch { /* ignore */ }
  }, []);

  const handleProfilePicUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setProfilePic(dataUrl);
        try { localStorage.setItem(PROFILE_PIC_KEY, dataUrl); } catch { /* ignore */ }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="max-w-screen-xl mx-auto px-8 py-12 space-y-10">
      {/* Cover Banner */}
      <div className="relative rounded-3xl overflow-hidden h-56 md:h-64 book-shadow">
        <div className="absolute inset-0 primary-gradient" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-black/10 blur-3xl" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Profile Info Card - overlapping the banner */}
      <div className="-mt-24 relative z-10 px-4">
        <div className="rounded-3xl border border-outline-variant/20 bg-white p-8 md:p-10 book-shadow">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Avatar with upload */}
            <div className="relative group -mt-20 md:-mt-24 flex-shrink-0">
              <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white book-shadow overflow-hidden bg-primary text-on-primary flex items-center justify-center text-4xl font-bold tracking-wider">
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <button
                type="button"
                onClick={handleProfilePicUpload}
                className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-2 border-white"
                title="Upload profile picture"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Name and info */}
            <div className="flex-grow text-center md:text-left space-y-3 pt-2">
              <div>
                <h1 className="font-headline text-4xl md:text-5xl text-primary italic">{fullName}</h1>
                <p className="text-on-surface-variant mt-1">{user?.email ?? 'No email available'}</p>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <span className="rounded-full bg-surface-container-low border border-outline-variant/30 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {(user?.role ?? 'USER').toUpperCase()}
                </span>
                <span className="rounded-full bg-primary/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                  Active Member
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 space-y-2 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Books Read</p>
          </div>
          <p className="font-headline text-4xl text-primary">{booksCount ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 space-y-2 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Library Size</p>
          </div>
          <p className="font-headline text-4xl text-primary">{booksCount ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 space-y-2 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Member Since</p>
          </div>
          <p className="font-headline text-3xl text-primary">2025</p>
        </div>
      </div>

      {/* Account Details & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
        <section className="rounded-2xl border border-outline-variant/20 bg-white p-8">
          <h3 className="font-headline text-3xl text-primary italic mb-6">Account Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1 bg-surface-container-low rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">First Name</p>
              <p className="text-sm text-on-surface font-medium">{user?.firstName ?? '-'}</p>
            </div>
            <div className="space-y-1 bg-surface-container-low rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Last Name</p>
              <p className="text-sm text-on-surface font-medium">{user?.lastName ?? '-'}</p>
            </div>
            <div className="space-y-1 md:col-span-2 bg-surface-container-low rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Email</p>
              <p className="text-sm text-on-surface break-all font-medium">{user?.email ?? '-'}</p>
            </div>
            <div className="space-y-1 md:col-span-2 bg-surface-container-low rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">User ID</p>
              <p className="text-sm text-on-surface break-all font-mono">{user?.userId ?? '-'}</p>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8 space-y-6">
          <h3 className="font-headline text-3xl text-primary italic">Quick Actions</h3>
          <div className="space-y-3">
            {[
              { label: 'View Library', icon: BookOpen, page: 'personal-library' as Page },
              { label: 'Browse Catalog', icon: Search, page: 'public-library' as Page },
              { label: 'Manage Subscription', icon: CreditCard, page: 'subscription' as Page },
              { label: 'Shopping Cart', icon: ShoppingCart, page: 'cart' as Page },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => setPage?.(action.page)}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-white border border-outline-variant/15 hover:border-primary hover:shadow-md transition-all group"
              >
                <action.icon className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors flex-grow text-left">{action.label}</span>
                <ArrowRight className="w-4 h-4 text-on-surface-variant/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

const AdminAddBookPage = ({
  categories,
  busy,
  error,
  onCancel,
  onRefreshCategories,
  onSubmit,
}: {
  categories: CategoryRow[];
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onRefreshCategories: () => Promise<void>;
  onSubmit: (payload: {
    categoryId: string;
    title: string;
    author: string;
    sku: string;
    format: string;
    price: number;
    contentType?: string;
    status?: string;
    description?: string;
    file?: File;
    fileUrl?: string;
  }) => Promise<void>;
}) => {
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [sku, setSku] = useState(generateDraftSku());
  const [format, setFormat] = useState('ebook');
  const [price, setPrice] = useState('9.99');
  const [contentType, setContentType] = useState('digital');
  const [status, setStatus] = useState('published');
  const [description, setDescription] = useState('');
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const OTHER_CATEGORY_VALUE = '__other__';

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-5xl text-primary italic">Add New Manuscript</h1>
          <p className="text-on-surface-variant mt-2">
            Fill all book metadata fields below and add either a direct book URL or upload a file. You can also provide both.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 rounded-xl border border-outline-variant/30 text-sm font-semibold hover:bg-surface-container-low transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      {error ? <p className="text-sm text-on-surface-variant" role="alert">{error}</p> : null}
      {formError ? <p className="text-sm text-on-surface-variant" role="alert">{formError}</p> : null}

      <form
        className="bg-white rounded-2xl border border-outline-variant/20 p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          setFormError('');
          void (async () => {
            const parsedPrice = Number(price);
            if (!title.trim() || !author.trim() || !sku.trim()) {
              setFormError('Title, author, and SKU are required.');
              return;
            }
            let resolvedCategoryId = categoryId;
            if (!resolvedCategoryId) {
              setFormError('Select a category or choose Other.');
              return;
            }
            if (resolvedCategoryId === OTHER_CATEGORY_VALUE) {
              const trimmedName = newCategoryName.trim();
              if (!trimmedName) {
                setFormError('Enter a category name for Other.');
                return;
              }
              const existingCategory = categories.find(
                (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
              );
              if (existingCategory) {
                resolvedCategoryId = existingCategory.categoryId;
              } else {
                const generatedSlug = trimmedName
                  .toLowerCase()
                  .replace(/[^a-z0-9\s-]/g, '')
                  .replace(/\s+/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-|-$/g, '')
                  .slice(0, 120);
                if (!generatedSlug) {
                  setFormError('Category name must contain letters or numbers.');
                  return;
                }
                try {
                  const createdCategory = await createAdminCategory({
                    name: trimmedName,
                    slug: generatedSlug,
                  });
                  resolvedCategoryId = createdCategory.categoryId;
                  await onRefreshCategories();
                } catch (createCategoryError) {
                  setFormError(
                    createCategoryError instanceof Error
                      ? createCategoryError.message
                      : 'Failed to create new category.'
                  );
                  return;
                }
              }
            }
            if (!resolvedCategoryId) {
              setFormError('Unable to resolve category. Please try again.');
              return;
            }
            const trimmedUrl = fileUrl.trim();
            if (!bookFile && !trimmedUrl) {
              setFormError('Provide either a book URL or upload a file.');
              return;
            }
            if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
              setFormError('Book URL must start with http:// or https://');
              return;
            }
            if (trimmedUrl) {
              try {
                const parsed = new URL(trimmedUrl);
                const isDesignrrS3 = parsed.hostname.toLowerCase() === 'designrr.s3.amazonaws.com';
                const isPdf = parsed.pathname.toLowerCase().endsWith('.pdf');
                const hasSignedQuery =
                  parsed.searchParams.has('X-Amz-Signature') ||
                  parsed.searchParams.has('x-amz-signature');
                if (isDesignrrS3 && isPdf && !hasSignedQuery) {
                  setFormError('This Designrr S3 PDF URL is private and returns 403. Use a public Designrr share URL (designrr.page) or a signed URL.');
                  return;
                }
              } catch {
                setFormError('Book URL is invalid. Please provide a full public URL.');
                return;
              }
            }
            if (bookFile) {
              const lowerName = bookFile.name.toLowerCase();
              if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.epub')) {
                setFormError('Only PDF or EPUB files are supported for upload.');
                return;
              }
            }
            if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
              setFormError('Price must be a valid positive number.');
              return;
            }

            await onSubmit({
              categoryId: resolvedCategoryId,
              title: title.trim(),
              author: author.trim(),
              sku: sku.trim(),
              format: format.trim(),
              price: parsedPrice,
              contentType: contentType.trim(),
              status: status.trim(),
              description: description.trim() || undefined,
              file: bookFile ?? undefined,
              fileUrl: trimmedUrl || undefined,
            });
          })();
        }}
      >
        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
            ))}
            <option value={OTHER_CATEGORY_VALUE}>Other (Create New Category)</option>
          </select>
          <p className="text-xs text-on-surface-variant">Choose an existing category or select Other to create a new one.</p>
        </label>

        {categoryId === OTHER_CATEGORY_VALUE ? (
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">New Category Name</span>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none"
              placeholder="Enter category name"
            />
            <p className="text-xs text-on-surface-variant">If this category already exists, it will be reused automatically.</p>
          </label>
        ) : null}

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" required />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Author</span>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" required />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">SKU</span>
          <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" required />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Format</span>
          <input value={format} onChange={(e) => setFormat(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" required />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Price</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0.01" step="0.01" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" required />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Content Type</span>
          <input value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</span>
          <input value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Book URL (optional)</span>
          <input
            type="url"
            placeholder="https://designrr.page/?id=..."
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none"
          />
          <p className="text-xs text-on-surface-variant">Use this for hosted files like Designrr links.</p>
          <p className="text-xs text-on-surface-variant">If both URL and file are provided, URL is used for reading and the file is downloaded locally.</p>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Book File Upload (optional)</span>
          <input
            type="file"
            accept="application/pdf,.pdf,application/epub+zip,.epub"
            onChange={(e) => setBookFile(e.target.files?.[0] ?? null)}
            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none"
          />
          <p className="text-xs text-on-surface-variant">If provided, file is stored at Supabase S3 path: <span className="font-semibold">books/&lt;productId&gt;/files/...</span></p>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none resize-y" />
        </label>

        <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="px-5 py-3 rounded-xl border border-outline-variant/30 text-sm font-semibold hover:bg-surface-container-low transition-colors">Cancel</button>
          <button type="submit" disabled={busy} className="primary-gradient text-on-primary px-6 py-3 rounded-xl font-bold text-sm shadow-xl disabled:opacity-70">
            {busy ? 'Saving...' : 'Create Book'}
          </button>
        </div>
      </form>
    </div>
  );
};

const AdminEditBookPage = ({
  book,
  categories,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  book: ProductRow;
  categories: CategoryRow[];
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (payload: {
    categoryId: string;
    title: string;
    author: string;
    sku: string;
    format: string;
    price: number;
    contentType?: string;
    status?: string;
    description?: string;
  }) => Promise<void>;
}) => {
  const [categoryId, setCategoryId] = useState(book.categoryId || '');
  const [title, setTitle] = useState(book.title || '');
  const [author, setAuthor] = useState(book.author || '');
  const [sku, setSku] = useState(book.sku || '');
  const [format, setFormat] = useState(book.format || 'ebook');
  const [price, setPrice] = useState((book.price || 0).toString());
  const [contentType, setContentType] = useState(book.contentType || 'digital');
  const [status, setStatus] = useState(book.status || 'published');
  const [description, setDescription] = useState(book.description || '');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].categoryId);
    }
  }, [categories, categoryId]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-5xl text-primary italic">Edit Manuscript</h1>
          <p className="text-on-surface-variant mt-2">
            Update book metadata fields below. To change the book file, use the upload option from the dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 rounded-xl border border-outline-variant/30 text-sm font-semibold hover:bg-surface-container-low transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      {error ? <p className="text-sm text-on-surface-variant" role="alert">{error}</p> : null}
      {formError ? <p className="text-sm text-on-surface-variant" role="alert">{formError}</p> : null}

      <form
        className="bg-white rounded-2xl border border-outline-variant/20 p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          setFormError('');
          void (async () => {
            const parsedPrice = Number(price);
            if (!categoryId) {
              setFormError('Category is required.');
              return;
            }
            if (!title.trim() || !author.trim() || !sku.trim()) {
              setFormError('Title, author, and SKU are required.');
              return;
            }
            if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
              setFormError('Price must be a valid positive number.');
              return;
            }

            await onSubmit({
              categoryId,
              title: title.trim(),
              author: author.trim(),
              sku: sku.trim(),
              format: format.trim(),
              price: parsedPrice,
              contentType: contentType.trim(),
              status: status.trim(),
              description: description.trim() || undefined,
            });
          })();
        }}
      >
        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none"
            required
          >
            <option value="" disabled>Select category</option>
            {categories.map((c) => (
              <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" required />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Author</span>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" required />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">SKU</span>
          <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" required />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Format</span>
          <input value={format} onChange={(e) => setFormat(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" required />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Price</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0.01" step="0.01" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" required />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Content Type</span>
          <input value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</span>
          <input value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none resize-y" />
        </label>

        <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="px-5 py-3 rounded-xl border border-outline-variant/30 text-sm font-semibold hover:bg-surface-container-low transition-colors">Cancel</button>
          <button type="submit" disabled={busy} className="primary-gradient text-on-primary px-6 py-3 rounded-xl font-bold text-sm shadow-xl disabled:opacity-70">
            {busy ? 'Saving...' : 'Update Book'}
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage);
  const [activeReadingBookId, setActiveReadingBookId] = useState<string | null>(null);
  const [subscriptionActionError, setSubscriptionActionError] = useState('');
  const [publicActionMsg, setPublicActionMsg] = useState('');
  const [libraryActionMsg, setLibraryActionMsg] = useState('');
  const [adminActionError, setAdminActionError] = useState('');
  const [optimisticallyDeletedBookIds, setOptimisticallyDeletedBookIds] = useState<Set<string>>(new Set());
  const [optimisticallyDeletedCartItemIds, setOptimisticallyDeletedCartItemIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(DELETED_CART_ITEMS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch { /* ignore */ }
    return new Set();
  });
  const [adminBookSaving, setAdminBookSaving] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState('');
  const [landingLibraryTab, setLandingLibraryTab] = useState<'reading' | 'collections'>('reading');
  const [landingLibrarySort, setLandingLibrarySort] = useState('Recent Activity');
  const [publicSortMode, setPublicSortMode] = useState<'latest' | 'title'>('latest');
  const [publicViewMode, setPublicViewMode] = useState<'grid' | 'list'>('grid');
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [savedForLater, setSavedForLater] = useState<Book[]>([]);
  const [wishlistExpanded, setWishlistExpanded] = useState(false);
  const [wishlistActionMsg, setWishlistActionMsg] = useState('');
  const [latestInvoice, setLatestInvoice] = useState<{
    invoiceNumber: string;
    orderId: string;
    amountLabel: string;
    dateLabel: string;
    paymentLabel: string;
  } | null>(null);
  const [cartUiBooks, setCartUiBooks] = useState<Book[]>([]);
  const [adminEditingBookId, setAdminEditingBookId] = useState<string | null>(null);
  const [adminBookEditSaving, setAdminBookEditSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [publicCategories, setPublicCategories] = useState<CategoryRow[]>([]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const { user, signIn, signInAdmin, signUp, signOut, signInWithGoogle, googleAuthLoading, initializing, isAuthenticated } = useAuth();
  const isAdminUser = (user?.role ?? '').toUpperCase() === 'ADMIN';
  const publicPag = usePaginationState(0, PUBLIC_PAGE_SIZE);
  const adminPag = usePaginationState(0, 50);
  const ordersPag = usePaginationState(0, 20);
  const protectedPages: Page[] = ['public-library', 'profile', 'personal-library', 'cart', 'wishlist', 'subscription', 'checkout', 'admin', 'admin-add-book', 'admin-edit-book', 'admin-contacts', 'reader'];

  const navigateToPage = (target: Page) => {
    if (!isAuthenticated && protectedPages.includes(target)) {
      setPage('login');
      return;
    }
    setPage(target);
  };

  useEffect(() => {
    return subscribeAppErrors((evt) => {
      console.warn("[errorBus]", {
        topic: evt.topic,
        message: evt.message,
        endpoint: evt.endpoint,
        method: evt.method,
        requestId: evt.requestId,
        payloadSummary: evt.payloadSummary,
        toastCandidate: evt.toastReady,
      });
    });
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_WISHLIST_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Book[];
      if (Array.isArray(parsed)) {
        setSavedForLater(parsed);
      }
    } catch {
      // ignore invalid local cache
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_WISHLIST_STORAGE_KEY, JSON.stringify(savedForLater));
    } catch {
      // ignore storage errors
    }
  }, [savedForLater]);

  useEffect(() => {
    try {
      sessionStorage.setItem(LAST_PAGE_STORAGE_KEY, page);
    } catch {
      // ignore storage errors
    }
  }, [page]);

  useEffect(() => {
    getPublicCategories()
      .then(setPublicCategories)
      .catch(() => { /* silently ignore */ });
  }, []);

  const catalogState = useFetch(() => fetchMergedPublicCatalog(), []);
  const catalogRows = catalogState.data ?? [];

  const newReleases = useMemo(
    () => catalogRows.slice(0, 4).map(publicRowToUiBook),
    [catalogRows]
  );

  const catalogBooks = useMemo(() => {
    const mapped = catalogRows.map(publicRowToUiBook);
    if (publicSortMode === 'title') {
      return [...mapped].sort((left, right) => left.title.localeCompare(right.title));
    }
    return mapped;
  }, [catalogRows, publicSortMode]);

  const filteredCatalogBooks = useMemo(() => {
    let result = catalogBooks;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.category && b.category.toLowerCase().includes(q))
      );
    }
    if (categoryFilter) {
      result = result.filter(
        (b) => b.category && b.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    return result;
  }, [catalogBooks, searchQuery, categoryFilter]);

  useEffect(() => {
    publicPag.syncClientPagination(filteredCatalogBooks.length, PUBLIC_PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCatalogBooks.length]);

  useEffect(() => {
    publicPag.setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, categoryFilter]);

    const publicBooks = useMemo(() => {
      const start = publicPag.page * PUBLIC_PAGE_SIZE;
      return filteredCatalogBooks
        .slice(start, start + PUBLIC_PAGE_SIZE);
    }, [filteredCatalogBooks, publicPag.page]);

    const categoriesWithCounts = useMemo(() => {
      const counts = new Map<string, number>();
      for (const book of catalogBooks) {
        const catName = String(book.category ?? '').trim();
        if (catName) {
          const normalized = catName.toLowerCase();
          counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
        }
      }

      const mergedList: CategoryRow[] = [];
      const seenNames = new Set<string>();

      for (const cat of publicCategories) {
        const normalized = String(cat.name ?? '').trim().toLowerCase();
        seenNames.add(normalized);
        const dynamicCount = counts.get(normalized) ?? 0;
        mergedList.push({
          ...cat,
          bookCount: dynamicCount
        });
      }

      for (const book of catalogBooks) {
        const catName = String(book.category ?? '').trim();
        if (!catName) continue;
        const normalized = catName.toLowerCase();
        if (!seenNames.has(normalized)) {
          seenNames.add(normalized);
          mergedList.push({
            categoryId: `dynamic-${normalized}`,
            name: catName,
            bookCount: counts.get(normalized) ?? 0,
            isActive: true,
          });
        }
      }

      return mergedList.sort((a, b) => {
        if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
          return a.displayOrder - b.displayOrder;
        }
        return a.name.localeCompare(b.name);
      });
    }, [catalogBooks, publicCategories]);

  const publicCatalogByProductId = useMemo(() => {
    const byId = new Map<string, Book>();
    for (const row of catalogRows) {
      const mapped = publicRowToUiBook(row);
      const key = String(mapped.id ?? '').trim().toLowerCase();
      if (!key) continue;
      if (!byId.has(key)) byId.set(key, mapped);
    }
    return byId;
  }, [catalogRows]);

  const publicCatalogBySignature = useMemo(() => {
    const bySignature = new Map<string, Book>();
    for (const row of catalogRows) {
      const mapped = publicRowToUiBook(row);
      const signature = getBookSignature(mapped);
      if (!signature || signature === '::') continue;
      if (!bySignature.has(signature)) bySignature.set(signature, mapped);
    }
    return bySignature;
  }, [catalogRows]);

  const libState = useFetch(
    () => {
      if (initializing) return Promise.resolve([] as LibraryRow[]);
      if (!user) return Promise.resolve([]);
      return getUserLibraryPage(0, 20);
    },
    [user?.userId, initializing]
  );

  const cartState = useFetch(
    () =>
      initializing || !user
        ? Promise.resolve(null as CartRow | null)
        : getCart().catch(() => null),
    [user?.userId, initializing]
  );

  const plansState = useFetch(() => getSubscriptionPlansPublic(), []);

  const subStatusState = useFetch(
    () => (initializing || !user ? Promise.resolve(null as SubscriptionStatusRow | null) : getMySubscriptionStatus().catch(() => null)),
    [user?.userId, initializing]
  );

  const adminCategoriesState = useFetch(
    () => (initializing || (user?.role ?? '').toUpperCase() !== 'ADMIN' ? Promise.resolve([] as CategoryRow[]) : getAdminCategories().catch(() => [] as CategoryRow[])),
    [user?.userId, user?.role, initializing]
  );

  const adminFetch = useFetch(
    () => {
      if (initializing) return Promise.resolve(null as PagedResult<ProductRow> | null);
      if ((page !== 'admin' && page !== 'admin-edit-book') || (user?.role ?? '').toUpperCase() !== 'ADMIN') {
        return Promise.resolve(null);
      }
      return getAdminBooksPaged(adminPag.page, adminPag.size).catch(() => null);
    },
    [page, user?.userId, user?.role, adminPag.page, adminPag.size, initializing]
  );

  const adminOrdersState = useFetch(
    () => {
      if (initializing) return Promise.resolve(null as PagedResult<AdminOrderRow> | null);
      if ((page !== 'admin' && page !== 'personal-library') || (user?.role ?? '').toUpperCase() !== 'ADMIN') {
        return Promise.resolve(null);
      }
      return getAdminOrdersPaged(ordersPag.page, ordersPag.size).catch(() => null);
    },
    [page, user?.userId, user?.role, ordersPag.page, ordersPag.size, initializing]
  );

  useEffect(() => {
    const isAdminPage = page === 'admin' || page === 'personal-library';
    if (!isAdminPage || (user?.role ?? '').toUpperCase() !== 'ADMIN') return;

    const refreshAdminOrders = () => {
      adminOrdersState.refetch();
    };

    refreshAdminOrders();

    const timer = window.setInterval(refreshAdminOrders, ADMIN_STATS_REFRESH_MS);
    const handleFocus = () => refreshAdminOrders();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAdminOrders();
      }
    };
    const handleOrderActivity = () => refreshAdminOrders();

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener(ORDER_ACTIVITY_EVENT, handleOrderActivity as EventListener);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener(ORDER_ACTIVITY_EVENT, handleOrderActivity as EventListener);
    };
  }, [page, user?.role, adminOrdersState.refetch]);

  const adminPublicLibraryState = useFetch(
    () => {
      if (initializing) return Promise.resolve([] as { publicLibraryId?: string }[]);
      if (page !== 'admin' || (user?.role ?? '').toUpperCase() !== 'ADMIN') {
        return Promise.resolve([] as { publicLibraryId?: string }[]);
      }
      return getAdminPublicLibrary().catch(() => [] as { publicLibraryId?: string }[]);
    },
    [page, user?.userId, user?.role, initializing]
  );

  useEffect(() => {
    const d = adminFetch.data;
    if (d) adminPag.applyResult(d);
    // applyResult is stable; avoid depending on whole pagination object identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminFetch.data]);

  const personalBooks = useMemo(() => {
    return (libState.data ?? []).map((row) => {
      const local = libraryRowToUiBook(row);
      const catalogMatch =
        publicCatalogByProductId.get(String(local.id ?? '').trim().toLowerCase()) ||
        publicCatalogBySignature.get(getBookSignature(local));

      if (!catalogMatch) {
        return local;
      }

      const mergedUrl =
        (local.fileUrl ?? '').trim() ||
        (catalogMatch.downloadUrl ?? '').trim() ||
        undefined;

      const mergedIsFlipbook =
        Boolean(local.isFlipbook) ||
        Boolean(catalogMatch.isFlipbook) ||
        Boolean(mergedUrl && /(designrr\.page|designrr\.s3\.amazonaws\.com|type=fp|flipbook)/i.test(mergedUrl));

      return {
        ...local,
        isFlipbook: mergedIsFlipbook,
        fileUrl: mergedUrl,
        downloadUrl: local.downloadUrl ?? catalogMatch.downloadUrl,
      };
    });
  }, [libState.data, publicCatalogByProductId, publicCatalogBySignature]);
  const purchasedPersonalBooks = useMemo(
    () => personalBooks.filter((book) => (book.accessType ?? '').toLowerCase() === 'purchased'),
    [personalBooks]
  );
  const readingBook =
    purchasedPersonalBooks.find((b) => b.progress != null && b.progress > 0) ??
    purchasedPersonalBooks[0];

  const cart = cartState.data ?? null;
  const cartBooks = useMemo(
    () => (cart?.items ?? []).map(cartItemToUiBook),
    [cart]
  );

  useEffect(() => {
    // Keep optimistic removals hidden until backend cart no longer contains them.
    setOptimisticallyDeletedCartItemIds((current) => {
      if (current.size === 0) return current;
      const serverIds = new Set(
        cartBooks
          .map((book) => String(book.cartItemId || book.id || '').trim())
          .filter(Boolean)
      );
      const next = new Set<string>();
      let changed = false;

      current.forEach((id) => {
        if (serverIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [cartBooks]);

  // Persist optimistic cart deletions to sessionStorage so they survive page refresh
  useEffect(() => {
    try {
      if (optimisticallyDeletedCartItemIds.size > 0) {
        sessionStorage.setItem(
          DELETED_CART_ITEMS_STORAGE_KEY,
          JSON.stringify([...optimisticallyDeletedCartItemIds])
        );
      } else {
        sessionStorage.removeItem(DELETED_CART_ITEMS_STORAGE_KEY);
      }
    } catch { /* ignore storage errors */ }
  }, [optimisticallyDeletedCartItemIds]);

  useEffect(() => {
    // Sync from backend, but exclude optimistically deleted items
    setCartUiBooks(
      cartBooks.filter((book) => {
        const lineId = String(book.cartItemId || book.id || '').trim();
        return lineId ? !optimisticallyDeletedCartItemIds.has(lineId) : true;
      })
    );
  }, [cartBooks, optimisticallyDeletedCartItemIds]);

  const savedBookIds = useMemo(
    () => new Set(savedForLater.map((book) => book.productId).filter(Boolean)),
    [savedForLater]
  );

  const activeCartBooks = useMemo(
    () => cartUiBooks.filter((book) => {
      // Exclude items that are in the saved-for-later list
      return !savedBookIds.has(book.productId);
    }),
    [cartUiBooks, savedBookIds]
  );

  const checkoutSubtotalNum = useMemo(
    () =>
      activeCartBooks.reduce(
        (sum, book) => sum + parseCurrencyAmount(book.price),
        0
      ),
    [activeCartBooks]
  );

  const uiPlans = useMemo(
    () => (plansState.data ?? []).map(subscriptionRowToUiPlan),
    [plansState.data]
  );

  const adminBooks = useMemo(
    () =>
      (adminFetch.data?.content ?? [])
        .filter((row) => !optimisticallyDeletedBookIds.has(String(row.productId ?? '').trim()))
        .map(productRowToVaultBook),
    [adminFetch.data, optimisticallyDeletedBookIds]
  );

  const adminOrderRows = useMemo(
    () => adminOrdersState.data?.content ?? [],
    [adminOrdersState.data]
  );

  const readerTitle = readingBook?.title || 'Reader';
  const readerFormat = readingBook && isFlipbookBook(readingBook) ? 'flipbook' : readingBook?.fileFormat;
  const readerUrl = readingBook?.fileUrl ?? readingBook?.downloadUrl;

  const handleBeginReading = () => {
    const readingBookIsFlipbook = readingBook ? isFlipbookBook(readingBook) : false;
    if (readingBookIsFlipbook && readerUrl) {
      const blockedReason = getBlockedFlipbookReason(readerUrl);
      if (blockedReason) {
        setLibraryActionMsg(blockedReason);
        return;
      }
      window.open(readerUrl, '_blank', 'noopener,noreferrer');
      setLibraryActionMsg('');
      return;
    }
    if (readingBook) {
      navigateToPage('reader');
      return;
    }
    setLibraryActionMsg('Purchase a book to unlock reading access.');
    navigateToPage('public-library');
  };

  const handleViewLandingDetails = () => {
    navigateToPage('public-library');
  };

  const handleOpenReader = (book?: Book) => {
    const targetBook = book?.id ? book : readingBook;
    const fallbackCatalogMatch = targetBook
      ? publicCatalogByProductId.get(String(targetBook.id ?? '').trim().toLowerCase()) ||
      publicCatalogBySignature.get(getBookSignature(targetBook))
      : undefined;
    const targetUrl =
      targetBook?.fileUrl ??
      targetBook?.downloadUrl ??
      fallbackCatalogMatch?.downloadUrl;
    const targetIsFlipbook =
      (targetBook ? isFlipbookBook(targetBook) : false) ||
      (fallbackCatalogMatch ? isFlipbookBook(fallbackCatalogMatch) : false);
    if (targetIsFlipbook && targetUrl) {
      const blockedReason = getBlockedFlipbookReason(targetUrl);
      if (blockedReason) {
        setLibraryActionMsg(blockedReason);
        return;
      }
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      setLibraryActionMsg('');
      return;
    }
    if (!targetBook) {
      setLibraryActionMsg('Purchase a book to read it in your private library.');
      return;
    }
    setLibraryActionMsg('');
    setActiveReadingBookId(targetBook.id);
    navigateToPage('reader');
  };

  const handleOpenCatalog = () => {
    navigateToPage('public-library');
  };

  const handleToggleBillingCycle = () => {
    setBillingCycle((current) => (current === 'annual' ? 'monthly' : 'annual'));
  };

  const handlePublicSortToggle = () => {
    setPublicSortMode((current) => (current === 'latest' ? 'title' : 'latest'));
  };

  const handlePublicViewMode = (mode: 'grid' | 'list') => {
    setPublicViewMode(mode);
  };

  const handleWishlistMoveToWishlist = (book: Book) => {
    setWishlistActionMsg('');
    const isAlreadySaved = (savedForLater || []).some((item) => item.id === book.id);

    if (isAlreadySaved) {
      setWishlistActionMsg('Item already in wishlist.');
      setTimeout(() => setWishlistActionMsg(''), 3000);
      return;
    }

    setSavedForLater((current) => [...current, book]);
    setWishlistActionMsg('Moved to wishlist.');
    setTimeout(() => setWishlistActionMsg(''), 3000);

    if (book.cartItemId) {
      handleRemoveCartLine(book.cartItemId);
    }
  };

  const handleWishlistSaveForLater = (book: Book) => {
    handleWishlistMoveToWishlist(book);
  };

  const handleMoveSavedToCart = (book: Book) => {
    setWishlistActionMsg('');
    // Remove from wishlist using consistent ID
    setSavedForLater((current) => current.filter((item) => item.id !== book.id));
    handleAddToCart(book);
  };

  const handleRemoveFromWishlist = (book: Book) => {
    setWishlistActionMsg('');
    // Use only the ID field as primary key for reliable matching
    const bookIdToRemove = book.id;
    console.log('[wishlist] Removing book:', { id: book.id, productId: book.productId, title: book.title });

    // Remove from state
    setSavedForLater((current) => {
      const beforeCount = current.length;
      const updated = current.filter((item) => item.id !== bookIdToRemove);
      const afterCount = updated.length;
      console.log('[wishlist] Filter result:', { beforeCount, afterCount, removed: beforeCount > afterCount });
      return updated;
    });

    // Show confirmation
    setWishlistActionMsg('Item removed from wishlist.');
    setTimeout(() => setWishlistActionMsg(''), 3000);
  };

  const handleToggleWishlistExpanded = () => {
    setWishlistExpanded((current) => !current);
  };

  const handleRemoveCartLine = (cartItemId: string) => {
    setWishlistActionMsg('');
    // Track this as optimistically deleted so it doesn't come back
    const normalizedCartItemId = String(cartItemId || '').trim();
    if (!normalizedCartItemId) return;
    setOptimisticallyDeletedCartItemIds((current) => new Set([...current, normalizedCartItemId]));

    // Remove item from UI state optimistically
    setCartUiBooks((current) =>
      current.filter((book) => {
        const lineId = String(book.cartItemId || book.id || '').trim();
        return lineId !== normalizedCartItemId;
      })
    );
    void (async () => {
      try {
        // Resolve against the latest backend cart first to avoid deleting with a stale UI id.
        const latestBefore = await getCart().catch(() => cartState.data ?? null);
        const latestItems = latestBefore?.items ?? [];
        const resolvedCartItemId =
          latestItems.find(
            (item) => String(item.cartItemId ?? '').trim() === normalizedCartItemId
          )?.cartItemId ??
          latestItems.find(
            (item) => String(item.productId ?? '').trim() === normalizedCartItemId
          )?.cartItemId ??
          normalizedCartItemId;

        const resolvedId = String(resolvedCartItemId).trim();
        await removeCartItem(resolvedId);

        // Verify deletion from the latest cart snapshot; fallback to quantity=0 if needed.
        let verifyCart = await getCart().catch(() => null);
        const isStillPresent = (row: CartRow | null) =>
          Boolean(
            row?.items?.some(
              (item) => String(item.cartItemId ?? '').trim() === resolvedId
            )
          );

        if (isStillPresent(verifyCart)) {
          await updateCartItemQuantity(resolvedId, 0).catch(async () => {
            await removeCartItem(resolvedId);
          });
          verifyCart = await getCart().catch(() => null);
        }

        if (isStillPresent(verifyCart)) {
          throw new Error('Cart item still exists on server.');
        }

        cartState.refetch();

        // Show success message
        setWishlistActionMsg('Item removed from cart.');
        // Auto-clear success message after 3 seconds
        setTimeout(() => setWishlistActionMsg(''), 3000);
      } catch (e) {
        // Only roll back optimistic hiding if item truly still exists on server.
        const latestAfterError = await getCart().catch(() => null);
        const stillExists = Boolean(
          latestAfterError?.items?.some(
            (item) => String(item.cartItemId ?? '').trim() === normalizedCartItemId
          )
        );
        if (stillExists) {
          setOptimisticallyDeletedCartItemIds((current) => {
            const updated = new Set(current);
            updated.delete(normalizedCartItemId);
            return updated;
          });
        }
        cartState.refetch();
        setWishlistActionMsg(e instanceof Error ? e.message : 'Unable to remove item.');
      }
    })();
  };

  const handleAddToCart = (book: Book) => {
    setPublicActionMsg('');
    void (async () => {
      if (!user) {
        setPublicActionMsg('Sign in to add books to cart.');
        navigateToPage('login');
        return;
      }
      if ((user.role ?? '').toUpperCase() === 'ADMIN') {
        setPublicActionMsg('Admin accounts cannot add books to cart.');
        return;
      }
      const productId = book.productId || book.id;
      if (!productId) return;
      try {
        // Check if item is already in cart before adding
        const isAlreadyInCart = (cartState.data?.items || []).some(
          (item) => item.productId === productId
        );

        await addCartItem(productId, 1);
        // Remove from wishlist using consistent ID matching
        setSavedForLater((current) => current.filter((item) => item.id !== book.id));

        // Wait before refetch to let state settle
        await new Promise(resolve => setTimeout(resolve, 100));
        cartState.refetch();

        // Show appropriate message based on whether it was already in cart
        const msg = isAlreadyInCart ? 'Item already in cart.' : 'Item added to cart.';
        setPublicActionMsg(msg);
        showToast(isAlreadyInCart ? `"${book.title}" is already in your cart` : `"${book.title}" added to cart âœ“`);
        // Auto-clear success message after 3 seconds
        setTimeout(() => setPublicActionMsg(''), 3000);
      } catch (e) {
        setPublicActionMsg(e instanceof Error ? e.message : 'Unable to add to cart.');
      }
    })();
  };

  const handleSubscribePlan = (planId: string) => {
    setSubscriptionActionError('');
    void (async () => {
      if (!user) {
        setSubscriptionActionError('Sign in to subscribe.');
        return;
      }
      try {
        await postSubscribe(planId);
        subStatusState.refetch();
      } catch (e) {
        try {
          await activateUserSubscription(planId);
          subStatusState.refetch();
        } catch (e2) {
          setSubscriptionActionError(
            e2 instanceof Error ? e2.message : 'Subscription failed.'
          );
        }
      }
    })();
  };

  const handleFinalizeCheckout = async () => {
    setCheckoutErr('');

    // Razorpay test keys are charged in INR; treat the numeric cart total as rupees.
    const amountPaise = Math.round(checkoutSubtotalNum * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      setCheckoutErr('Your cart total is too low to start a payment.');
      return;
    }

    try {
      await loadRazorpayCheckoutScript();
    } catch {
      setCheckoutErr('Unable to load the payment gateway. Check your connection and retry.');
      return;
    }
    if (typeof window === 'undefined' || !window.Razorpay) {
      setCheckoutErr('Unable to load the payment gateway. Please retry.');
      return;
    }

    let rzpOrder: { order_id: string; amount: number; currency: string; key_id: string };
    try {
      rzpOrder = await postRazorpayCreateOrder({
        amountPaise,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        customerEmail: user?.email,
      });
    } catch (e) {
      setCheckoutErr(e instanceof Error ? e.message : 'Could not start the payment.');
      return;
    }

    const customerName = [user?.firstName, user?.lastName]
      .filter((part) => Boolean(part && part.trim()))
      .join(' ')
      .trim();

    const completePurchase = async (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      try {
        // Convert the cart into an internal order only after the payment succeeds,
        // so a cancelled payment never empties the cart.
        const checkoutResult = (await postCheckout({
          gateway: 'razorpay',
          paymentMethod: 'card',
          currency: 'INR',
        })) as {
          order?: { orderId?: string; totalAmount?: number | string; items?: Array<{ totalPrice?: number | string }> };
          payment?: { amount?: number | string };
        };

        const internalOrderId = String(checkoutResult?.order?.orderId ?? '').trim();
        if (!internalOrderId) {
          setCheckoutErr(
            `Payment succeeded but the order could not be created. Keep this payment id for support: ${response.razorpay_payment_id}`
          );
          return;
        }

        // Verify the signature server-side, then unlock the purchased books.
        await postRazorpayVerifyPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          internalOrderId,
        });

        const lineItems = Array.isArray(checkoutResult?.order?.items) ? checkoutResult.order!.items! : [];
        const lineItemTotal = lineItems.reduce((sum, item) => sum + Number(item.totalPrice ?? 0), 0);
        const backendTotalRaw = checkoutResult?.order?.totalAmount ?? checkoutResult?.payment?.amount;
        const backendTotal = typeof backendTotalRaw === 'number' ? backendTotalRaw : Number(backendTotalRaw ?? 0);
        const totalAmount = Number.isFinite(lineItemTotal) && lineItemTotal > 0 ? lineItemTotal : backendTotal;

        setLatestInvoice({
          invoiceNumber: `INV-${Date.now()}`,
          orderId: internalOrderId,
          amountLabel: formatMoney(Number.isFinite(totalAmount) ? totalAmount : 0),
          dateLabel: new Date().toLocaleString(),
          paymentLabel: `Razorpay \u2022 ${response.razorpay_payment_id}`,
        });

        libState.refetch();
        adminOrdersState.refetch();
        window.dispatchEvent(new CustomEvent(ORDER_ACTIVITY_EVENT));
        setLibraryActionMsg('Payment successful. Purchased books are now in your private library.');
        setPage('personal-library');
        cartState.refetch();
      } catch (e) {
        setCheckoutErr(
          e instanceof Error
            ? e.message
            : 'We could not confirm your payment. If you were charged, contact support.'
        );
      }
    };

    const rzp = new window.Razorpay({
      key: rzpOrder.key_id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      name: 'Masuki Books',
      description: 'Digital library purchase',
      order_id: rzpOrder.order_id,
      prefill: {
        name: customerName || undefined,
        email: user?.email || undefined,
      },
      theme: { color: '#6750A4' },
      modal: {
        ondismiss: () => setCheckoutErr('Payment was cancelled before completion.'),
      },
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        void completePurchase(response);
      },
    });

    rzp.on('payment.failed', (resp: { error?: { description?: string } }) => {
      setCheckoutErr(resp?.error?.description || 'Payment failed. Please try again.');
    });

    rzp.open();
  };

  const handleDownloadInvoice = () => {
    if (!latestInvoice) return;
    const lines = [
      'Masuki Books - Payment Invoice',
      `Invoice No: ${latestInvoice.invoiceNumber}`,
      `Order ID: ${latestInvoice.orderId}`,
      `Date: ${latestInvoice.dateLabel}`,
      `Amount: ${latestInvoice.amountLabel}`,
      `Payment: ${latestInvoice.paymentLabel}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `${latestInvoice.invoiceNumber}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(href);
  };

  const handlePublicPurchaseRequired = (book: Book) => {
    setPublicActionMsg('');
    void (async () => {
      if (!user) {
        setPublicActionMsg('Sign in to purchase books.');
        navigateToPage('login');
        return;
      }
      if ((user.role ?? '').toUpperCase() === 'ADMIN') {
        setPublicActionMsg('Admin accounts cannot purchase titles from the public library.');
        return;
      }
      const productId = book.productId || book.id;
      if (!productId) {
        setPublicActionMsg('This title is not available for purchase yet.');
        return;
      }
      try {
        const isAlreadyInCart = (cartState.data?.items || []).some(
          (item) => item.productId === productId
        );
        if (!isAlreadyInCart) {
          await addCartItem(productId, 1);
          // Let the cart state settle before navigating.
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        cartState.refetch();
        navigateToPage('cart');
      } catch (e) {
        setPublicActionMsg(e instanceof Error ? e.message : 'Unable to start the purchase.');
      }
    })();
  };

  const handleAdminCreateBook = () => {
    setAdminActionError('');
    setPage('admin-add-book');
  };

  const handleAdminSubmitBookForm = async (payload: {
    categoryId: string;
    title: string;
    author: string;
    sku: string;
    format: string;
    price: number;
    contentType?: string;
    status?: string;
    description?: string;
    file?: File;
    fileUrl?: string;
  }) => {
    setAdminActionError('');
    setAdminBookSaving(true);
    try {
      const { file, fileUrl, ...bookBody } = payload;
      let usedRetrySku = false;
      let created;
      try {
        created = await createAdminBook({ ...bookBody, fileUrl });
      } catch (createError) {
        if (!isDuplicateSkuError(createError)) {
          throw createError;
        }
        usedRetrySku = true;
        created = await createAdminBook({
          ...bookBody,
          sku: generateDraftSku(),
          fileUrl,
        });
      }
      const hasUrl = Boolean(fileUrl?.trim());
      const hasFile = Boolean(file);

      if (hasFile && hasUrl && file) {
        // Preserve URL-based reader behavior and save selected file locally.
        triggerLocalFileDownload(file);
      } else if (file) {
        await uploadAdminBookFile(created.productId, file);
      }
      adminFetch.refetch();
      catalogState.refetch();
      adminCategoriesState.refetch();
      if (hasFile && hasUrl) {
        setAdminActionError(
          usedRetrySku
            ? 'Book created with a regenerated SKU and URL. Selected file downloaded locally.'
            : 'Book created with URL. Selected file downloaded locally.'
        );
      } else {
        setAdminActionError(
          usedRetrySku
            ? 'Book created successfully with a regenerated SKU.'
            : 'Book created successfully.'
        );
      }
      setPage('admin');
    } catch (e) {
      setAdminActionError(e instanceof Error ? e.message : 'Failed to create book.');
      throw e;
    } finally {
      setAdminBookSaving(false);
    }
  };

  const handleAdminCreateCategory = () => {
    setAdminActionError('');
    void (async () => {
      try {
        const name = window.prompt('Category name');
        if (!name) return;
        const suggestedSlug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        const slug = (window.prompt('Category slug', suggestedSlug) ?? '').trim();
        if (!slug) {
          setAdminActionError('Slug is required.');
          return;
        }
        await createAdminCategory({ name, slug });
        adminCategoriesState.refetch();
        setAdminActionError('Category created successfully.');
      } catch (e) {
        setAdminActionError(e instanceof Error ? e.message : 'Failed to create category.');
      }
    })();
  };

  const handleAdminCreatePlan = () => {
    setAdminActionError('');
    void (async () => {
      try {
        const planName = window.prompt('Plan name');
        if (!planName) return;
        const priceRaw = window.prompt('Plan price', '9.99') ?? '9.99';
        const durationRaw = window.prompt('Duration (days)', '30') ?? '30';
        const price = Number(priceRaw);
        const durationDays = Number(durationRaw);
        if (Number.isNaN(price) || Number.isNaN(durationDays) || durationDays < 1) {
          setAdminActionError('Provide valid price and duration days.');
          return;
        }
        await createAdminSubscriptionPlan({ planName, price, durationDays });
        plansState.refetch();
        setAdminActionError('Subscription plan created.');
      } catch (e) {
        setAdminActionError(e instanceof Error ? e.message : 'Failed to create subscription plan.');
      }
    })();
  };

  const handleAdminUpsertPublicLibrary = () => {
    setAdminActionError('');
    void (async () => {
      try {
        const productId = window.prompt('Product ID to publish in public library');
        if (!productId) return;
        await upsertAdminPublicLibrary({
          productId,
          visibility: 'PUBLIC',
          editable: true,
        });
        adminPublicLibraryState.refetch();
        catalogState.refetch();
        setAdminActionError('Public library entry upserted.');
      } catch (e) {
        setAdminActionError(e instanceof Error ? e.message : 'Failed to upsert public library entry.');
      }
    })();
  };

  const handleAdminUpdateOrderStatus = () => {
    setAdminActionError('');
    void (async () => {
      try {
        const orderId = window.prompt('Order ID');
        if (!orderId) return;
        const status = window.prompt('New status', 'CONFIRMED') ?? 'CONFIRMED';
        await updateAdminOrderStatus(orderId, status);
        adminOrdersState.refetch();
        setAdminActionError('Order status updated.');
      } catch (e) {
        setAdminActionError(e instanceof Error ? e.message : 'Failed to update order status.');
      }
    })();
  };

  const handleAdminUploadBookFile = (bookId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.epub,application/pdf,application/epub+zip';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void (async () => {
        try {
          await uploadAdminBookFile(bookId, file);
          adminFetch.refetch();
          catalogState.refetch();
          adminCategoriesState.refetch();
          setAdminActionError('Book file uploaded.');
        } catch (e) {
          setAdminActionError(e instanceof Error ? e.message : 'Failed to upload book file.');
        }
      })();
    };
    input.click();
  };

  const handleAdminEditBook = (bookId: string) => {
    setAdminActionError('');
    setAdminEditingBookId(bookId);
    setPage('admin-edit-book');
  };

  const handleAdminSubmitEditBookForm = async (payload: {
    categoryId: string;
    title: string;
    author: string;
    sku: string;
    format: string;
    price: number;
    contentType?: string;
    status?: string;
    description?: string;
  }) => {
    if (!adminEditingBookId) return;
    setAdminActionError('');
    setAdminBookEditSaving(true);
    try {
      await updateAdminBook(adminEditingBookId, payload);
      adminFetch.refetch();
      catalogState.refetch();
      adminCategoriesState.refetch();
      setAdminActionError('Book updated successfully.');
      setPage('admin');
      setAdminEditingBookId(null);
    } catch (e) {
      setAdminActionError(e instanceof Error ? e.message : 'Failed to update book.');
      throw e;
    } finally {
      setAdminBookEditSaving(false);
    }
  };

  const handleAdminDeleteFirstPublicLibraryRecord = () => {
    setAdminActionError('');
    void (async () => {
      try {
        const firstId = adminPublicLibraryState.data?.[0]?.publicLibraryId;
        if (!firstId) {
          setAdminActionError('No public library records to delete.');
          return;
        }
        await deleteAdminPublicLibrary(firstId);
        adminPublicLibraryState.refetch();
        catalogState.refetch();
        setAdminActionError('Deleted one public library record.');
      } catch (e) {
        setAdminActionError(e instanceof Error ? e.message : 'Failed to delete public library record.');
      }
    })();
  };

  const handleAdminDeleteBooks = (bookIds: string[]) => {
    const ids = bookIds.map((id) => String(id).trim()).filter(Boolean);
    if (ids.length === 0) return;

    setAdminActionError('');
    setOptimisticallyDeletedBookIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });

    void (async () => {
      try {
        for (const bookId of ids) {
          adminCategoriesState.refetch();
          await deleteAdminBook(bookId);
        }
        adminFetch.refetch();
        catalogState.refetch();
        setAdminActionError(`Deleted ${ids.length} book(s).`);
      } catch (e) {
        // Roll back optimistic removal on error and resync with server state.
        setOptimisticallyDeletedBookIds((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
        adminFetch.refetch();
        adminCategoriesState.refetch();
        setAdminActionError(e instanceof Error ? e.message : `Failed to delete ${ids.length} book(s).`);
      }
    })();
  };

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  useEffect(() => {
    if (initializing || isAuthenticated) return;
    if (protectedPages.includes(page)) {
      setPage('login');
    }
  }, [initializing, isAuthenticated, page, protectedPages]);

  const showNavbar = !['login', 'reader'].includes(page);
  const showFooter = !['login', 'reader'].includes(page);

  return (
    <div className="min-h-screen flex flex-col">
      {showNavbar && <Navbar currentPage={page} setPage={navigateToPage} isAuthenticated={isAuthenticated} isAdmin={isAdminUser} onLogout={signOut} onSearch={(q) => { setSearchQuery(q); setCategoryFilter(''); navigateToPage('public-library'); }} />}

      <main className="flex-grow pb-[5.75rem] md:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {page === 'landing' && (
              <LandingPage
                setPage={navigateToPage}
                onBeginReading={handleBeginReading}
                onViewDetails={handleViewLandingDetails}
                isAuthenticated={isAuthenticated}
                newReleases={newReleases}
                catalogTotal={catalogRows.length}
                categories={publicCategories}
                onBookClick={(book) => { navigateToPage('public-library'); }}
                onCategoryClick={(catId) => {
                  const cat = publicCategories.find(c => c.categoryId === catId);
                  if (cat) {
                    setCategoryFilter(cat.name);
                    setSearchQuery('');
                    navigateToPage('public-library');
                  }
                }}
              />
            )}
            {page === 'personal-library' && (
              isAdminUser ? (
                <AdminUserStats orders={adminOrderRows} />
              ) : (
                <PersonalLibrary
                  books={purchasedPersonalBooks}
                  readingBook={readingBook}
                  actionMessage={libraryActionMsg}
                  activeTab={landingLibraryTab}
                  onTabChange={setLandingLibraryTab}
                  onOpenReader={handleOpenReader}
                  onOpenCatalog={handleOpenCatalog}
                  onSortChange={() => setLandingLibrarySort((current) => (current === 'Recent Activity' ? 'Progress' : 'Recent Activity'))}
                  sortLabel={landingLibrarySort}
                />
              )
            )}
            {page === 'profile' && !isAdminUser && (
              <UserProfilePage user={user} setPage={navigateToPage} booksCount={purchasedPersonalBooks.length} />
            )}
            {page === 'public-library' && (
              <PublicLibrary
                books={publicBooks}
                totalCount={filteredCatalogBooks.length}
                onAddToCart={handleAddToCart}
                onRequestPurchaseAccess={handlePublicPurchaseRequired}
                showAddToCart={!isAdminUser}
                showPurchaseToView={!isAdminUser}
                actionMessage={publicActionMsg}
                pagination={{
                  onPrev: publicPag.goPrev,
                  onNext: publicPag.goNext,
                  onSelectPage: (n) => publicPag.setPage(n - 1),
                  currentPage1Based: publicPag.page + 1,
                  totalPages: Math.max(1, publicPag.totalPages),
                }}
                viewMode={publicViewMode}
                onToggleViewMode={handlePublicViewMode}
                sortMode={publicSortMode}
                onToggleSortMode={handlePublicSortToggle}
                searchQuery={searchQuery}
                onSearchChange={(q) => { setSearchQuery(q); setCategoryFilter(''); }}
                categoryFilter={categoryFilter}
                categories={publicCategories}
                onCategoryClick={(name) => { setCategoryFilter(name); setSearchQuery(''); }}
              />
            )}
            {page === 'cart' && (
              <CartPage
                cart={cart}
                cartBooks={activeCartBooks}
                onRemoveLine={handleRemoveCartLine}
                onProceedCheckout={() => navigateToPage('checkout')}
                onMoveToWishlist={handleWishlistMoveToWishlist}
                onBrowseCatalog={handleOpenCatalog}
                actionMessage={wishlistActionMsg}
              />
            )}
            {page === 'wishlist' && (
              <WishlistPage
                savedBooks={savedForLater}
                onMoveSavedToCart={handleMoveSavedToCart}
                onRemoveFromWishlist={handleRemoveFromWishlist}
                onBrowseCatalog={handleOpenCatalog}
                actionMessage={wishlistActionMsg}
              />
            )}
            {page === 'subscription' && (
              <SubscriptionPage
                plans={uiPlans}
                status={subStatusState.data ?? null}
                onSubscribe={handleSubscribePlan}
                actionError={subscriptionActionError}
                catalogTotal={catalogRows.length}
                billingCycle={billingCycle}
                onToggleBillingCycle={handleToggleBillingCycle}
              />
            )}
            {page === 'checkout' && (
              <CheckoutPage
                setPage={setPage}
                cartBooks={activeCartBooks}
                subtotalLabel={formatMoney(checkoutSubtotalNum)}
                onFinalize={handleFinalizeCheckout}
                onDownloadInvoice={handleDownloadInvoice}
                invoice={latestInvoice}
                checkoutError={checkoutErr}
              />
            )}
            {page === 'login' && (
              <LoginPage
                setPage={setPage}
                onSignIn={signIn}
                onSignInAdmin={signInAdmin}
                onSignUp={signUp}
                onSignInWithGoogle={signInWithGoogle}
                googleAuthLoading={googleAuthLoading}
              />
            )}
            {page === 'admin' && (
              <AdminVaultPage
                books={adminBooks}
                onEditBook={handleAdminEditBook}
                onUploadBookFile={handleAdminUploadBookFile}
                onDeleteBooks={handleAdminDeleteBooks}
                adminActionError={adminActionError}
                pagination={{
                  onPrev: adminPag.goPrev,
                  onNext: adminPag.goNext,
                  onSelectPage: (n) => adminPag.setPage(n - 1),
                  currentPage1Based: adminPag.page + 1,
                  totalPages: Math.max(1, adminPag.totalPages),
                  totalElements: adminPag.totalElements,
                }}
              />
            )}
            {page === 'admin-add-book' && (
              <AdminAddBookPage
                categories={adminCategoriesState.data ?? []}
                busy={adminBookSaving}
                error={adminActionError}
                onCancel={() => navigateToPage('admin')}
                onRefreshCategories={async () => { adminCategoriesState.refetch(); }}
                onSubmit={handleAdminSubmitBookForm}
              />
            )}
            {page === 'admin-edit-book' && adminEditingBookId && adminFetch.data?.content?.find(b => b.productId === adminEditingBookId) && (
              <AdminEditBookPage
                book={adminFetch.data.content.find(b => b.productId === adminEditingBookId)!}
                categories={adminCategoriesState.data ?? []}
                busy={adminBookEditSaving}
                error={adminActionError}
                onCancel={() => navigateToPage('admin')}
                onSubmit={handleAdminSubmitEditBookForm}
              />
            )}
            {page === 'admin-contacts' && <AdminContactSubmissionsPage />}
            {page === 'my-queries' && <UserContactSubmissionsPage />}
            {page === 'reader' && (
              <>
                {purchasedPersonalBooks.length > 0 ? (
                  <Suspense fallback={null}>
                    <ReaderPageLazy setPage={setPage} readerTitle={readerTitle} readerBookId={readingBook?.id ?? purchasedPersonalBooks[0]?.id ?? ''} readerFormat={readerFormat} readerUrl={readerUrl} />
                  </Suspense>
                ) : (
                  <div className="max-w-screen-md mx-auto px-8 py-24 space-y-6 text-center">
                    <h1 className="font-headline text-5xl text-primary italic">Purchase required</h1>
                    <p className="text-lg text-on-surface-variant">You need to buy a book before the reader can open.</p>
                    <button
                      type="button"
                      className="primary-gradient text-on-primary px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-xs"
                      onClick={() => setPage('public-library')}
                    >
                      Browse Public Library
                    </button>
                  </div>
                )}
              </>
            )}
            {page === 'terms-of-service' && <TermsOfServicePage setPage={navigateToPage} />}
            {page === 'privacy-policy' && <PrivacyPolicyPage setPage={navigateToPage} />}
            {page === 'archive-ethics' && <ArchiveEthicsPage setPage={navigateToPage} />}
            {page === 'contact-support' && <ContactSupportPage setPage={navigateToPage} />}
            {page === 'help-center' && <HelpCenterPage setPage={navigateToPage} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {showFooter && <Footer onNavigate={navigateToPage} isAuthenticated={isAuthenticated} />}

      <FloatingMenu currentPage={page} onNavigate={navigateToPage} isAuthenticated={isAuthenticated} isAdmin={isAdminUser} />

      <Toast message={toastMsg} show={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
}

