import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  postAdminContactReply,
} from '../services/api';

export default function Notifications() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const c = await getUnreadNotificationCount();
        if (!cancelled) setUnread(c);
      } catch { /* ignore */ }
    };
    fetchCount();
    const t = setInterval(fetchCount, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!show) return;
    const handle = async () => {
      setLoading(true);
      try {
        const list = await getNotifications();
        setNotifications(list);
      } catch { /* ignore */ }
      setLoading(false);
    };
    handle();
  }, [show]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    if (show) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [show]);

  const handleClick = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 text-primary"
        onClick={() => setShow(s => !s)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && <span className="text-sm">{unread}</span>}
      </button>
      {show && (
        <div className="absolute right-0 mt-2 w-80 bg-surface-container p-3 rounded shadow-lg border">
          {loading ? (
            <div className="text-sm text-on-surface-variant">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-sm text-on-surface-variant">No notifications</div>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-auto">
              {notifications.map(n => (
                <li key={n.id} className="cursor-pointer" onClick={() => handleClick(n.id)}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-primary truncate">{n.title}</p>
                      <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-on-surface-variant/60 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
