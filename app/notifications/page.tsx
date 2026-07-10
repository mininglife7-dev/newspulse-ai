'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Bell, Trash2, CheckCircle, Clock, Zap } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  entity_type?: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

const NOTIFICATION_COLORS: Record<string, { bg: string; icon: any; text: string }> = {
  deadline_reminder: { bg: 'bg-orange-900/20', icon: Clock, text: 'text-orange-300' },
  evidence_rejected: { bg: 'bg-red-900/20', icon: AlertCircle, text: 'text-red-300' },
  evidence_approved: { bg: 'bg-green-900/20', icon: CheckCircle, text: 'text-green-300' },
  plan_completed: { bg: 'bg-blue-900/20', icon: CheckCircle, text: 'text-blue-300' },
  member_added: { bg: 'bg-purple-900/20', icon: Zap, text: 'text-purple-300' },
  assessment_completed: { bg: 'bg-cyan-900/20', icon: Zap, text: 'text-cyan-300' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingRead, setMarkingRead] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications?limit=50');

      if (res.status === 401) {
        window.location.href = '/auth/signin?redirect=/notifications';
        return;
      }

      if (res.status === 409) {
        setError('Complete workspace setup first');
        return;
      }

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to load notifications');
      }

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: any) {
      setError(err?.message || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId: string, isCurrentlyRead: boolean) => {
    setMarkingRead({ ...markingRead, [notificationId]: true });
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, isRead: !isCurrentlyRead }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to update notification');
      }

      setNotifications(
        notifications.map(n =>
          n.id === notificationId ? { ...n, is_read: !isCurrentlyRead } : n
        )
      );

      setUnreadCount(prev =>
        isCurrentlyRead ? prev + 1 : Math.max(0, prev - 1)
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to update notification');
    } finally {
      setMarkingRead({ ...markingRead, [notificationId]: false });
    }
  };

  const handleDelete = async (notificationId: string) => {
    setDeleting({ ...deleting, [notificationId]: true });
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to delete notification');
      }

      const deleted = notifications.find(n => n.id === notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));

      if (deleted && !deleted.is_read) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete notification');
    } finally {
      setDeleting({ ...deleting, [notificationId]: false });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <div className="rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white">
              {unreadCount} unread
            </div>
          )}
        </div>
        <p className="text-slate-400">
          Deadline alerts, review updates, and team activity
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-2">
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const config = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.assessment_completed;
            const Icon = config.icon;

            return (
              <div
                key={notification.id}
                className={`rounded-lg border ${notification.is_read ? 'border-slate-700 bg-slate-900/30' : 'border-blue-700/50 bg-blue-950/20'} p-4 transition hover:bg-slate-800/50`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 rounded-full p-2 ${config.bg}`}>
                    <Icon className={`h-5 w-5 ${config.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${notification.is_read ? 'text-slate-300' : 'text-white'}`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-sm text-slate-400 mt-1">{notification.message}</p>
                        )}
                        <div className="mt-2 text-xs text-slate-500">
                          {new Date(notification.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      {notification.action_url && (
                        <Link
                          href={notification.action_url}
                          className="text-xs font-medium text-blue-400 hover:text-blue-300"
                        >
                          View →
                        </Link>
                      )}
                      <button
                        onClick={() => handleMarkAsRead(notification.id, notification.is_read)}
                        disabled={markingRead[notification.id]}
                        className="text-xs font-medium text-slate-400 hover:text-slate-300 disabled:opacity-50"
                      >
                        {notification.is_read ? 'Mark unread' : 'Mark as read'}
                      </button>
                      <button
                        onClick={() => handleDelete(notification.id)}
                        disabled={deleting[notification.id]}
                        className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        {deleting[notification.id] ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/20 p-8 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">No notifications yet</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-center">
        <p className="text-xs text-slate-400">
          Notifications are automatically created for deadlines, evidence reviews, and team updates
        </p>
      </div>
    </div>
  );
}
