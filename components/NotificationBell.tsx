'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, Check, Trash2, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '@/lib/api/notifications';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatRelativeTime } from '@/lib/utils';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    link?: string;
    orderId?: string;
    productId?: string;
  };
}

// Static notification type icons - moved outside component
const NOTIFICATION_ICONS: Record<string, string> = {
  order: '📦',
  product: '🛍️',
  review: '⭐',
  payout: '💰',
  default: '🔔',
} as const;

const NotificationBell = memo(function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch initial unread count - useCallback for stable reference
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      setUnreadCount(res.data.data.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Fetch initial unread count when user loads
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, fetchUnreadCount]);

  // Listen for new notifications via Socket.io
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('notification:new', ({ notification, unreadCount }: { notification: Notification; unreadCount: number }) => {
      setUnreadCount(unreadCount);
      setNotifications((prev) => [notification, ...prev]);
    });

    socket.on('notification:unread-count', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    return () => {
      socket.off('notification:new');
      socket.off('notification:unread-count');
    };
  }, [socket, isConnected]);

  // Fetch notifications - useCallback for stable reference
  const fetchNotifications = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await notificationsAPI.getNotifications({ limit: 10 });
      setNotifications(res.data.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Toggle dropdown - useCallback for stable reference
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev && notifications.length === 0) {
        fetchNotifications();
      }
      return !prev;
    });
  }, [notifications.length, fetchNotifications]);

  // Mark notification as read - useCallback for stable reference
  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, []);

  // Mark all as read - useCallback for stable reference
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, []);

  // Delete notification - useCallback for stable reference
  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsAPI.deleteNotification(id);
      setNotifications((prev) => {
        const notification = prev.find((n) => n._id === id);
        const filtered = prev.filter((n) => n._id !== id);
        if (notification && !notification.isRead) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return filtered;
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, []);

  // Handle notification click - useCallback for stable reference
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    if (notification.data?.link) {
      router.push(notification.data.link);
      setIsOpen(false);
    }
  }, [handleMarkAsRead, router]);

  // Get notification icon - memoized helper
  const getNotificationIcon = useCallback((type: string) => {
    return NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
  }, []);

  // Memoize unread badge display
  const unreadBadgeDisplay = useMemo(() => {
    if (unreadCount > 0) {
      return (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full" aria-label={`${unreadCount} unread notifications`}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      );
    }
    return null;
  }, [unreadCount]);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadBadgeDisplay}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            tabIndex={-1}
          />

          {/* Dropdown Content */}
          <div
            className="absolute right-0 top-12 z-50 w-80 md:w-96 bg-background border rounded-lg shadow-lg max-h-[80vh] flex flex-col"
            role="dialog"
            aria-modal="false"
            aria-label="Notifications panel"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Notifications</h2>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-primary hover:underline flex items-center space-x-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded px-1"
                    type="button"
                    aria-label={`Mark all ${unreadCount} notifications as read`}
                  >
                    <CheckCheck className="h-3 w-3" aria-hidden="true" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-accent rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label="Close notifications panel"
                  type="button"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto" role="list" aria-label="Notifications">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground" aria-live="polite" aria-busy="true">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground" role="status">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y" role="list">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNotificationClick(notification);
                        }
                      }}
                      className={`p-4 hover:bg-accent cursor-pointer transition-colors focus-visible:bg-accent focus-visible:outline-none ${
                        !notification.isRead ? 'bg-primary/5' : ''
                      }`}
                      role="listitem"
                      tabIndex={0}
                      aria-label={`${notification.title}: ${notification.message}`}
                      aria-current={!notification.isRead ? 'true' : undefined}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl flex-shrink-0" aria-hidden="true">
                          {NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm" id={`notification-title-${notification._id}`}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <time dateTime={notification.createdAt} aria-label={`Posted ${formatRelativeTime(notification.createdAt)}`}>
                                  {formatRelativeTime(notification.createdAt)}
                                </time>
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDelete(notification._id, e)}
                              className="flex-shrink-0 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                              aria-label={`Delete notification: ${notification.title}`}
                              aria-describedby={`notification-title-${notification._id}`}
                              type="button"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t text-center">
                <button
                  onClick={() => {
                    router.push('/notifications');
                    setIsOpen(false);
                  }}
                  className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded px-2 py-1 -mx-2"
                  type="button"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default NotificationBell;
