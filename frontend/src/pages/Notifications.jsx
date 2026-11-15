import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileCheck,
  CreditCard,
  ShieldAlert,
  ArrowRight,
  Check,
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(1, 50);
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id, link) => {
    try {
      await notificationService.markAsRead(id);
      fetchNotifications();
      if (link) navigate(link);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'INVOICE_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-700" />;
      case 'PAYMENT_OVERDUE':
      case 'INVOICE_REJECTED':
        return <AlertTriangle className="w-4 h-4 text-rose-700" />;
      case 'DUPLICATE_DETECTED':
      case 'ANOMALY_DETECTED':
        return <ShieldAlert className="w-4 h-4 text-amber-700" />;
      case 'PAYMENT_RECORDED':
        return <CreditCard className="w-4 h-4 text-slate-700" />;
      default:
        return <Receipt className="w-4 h-4 text-slate-700" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Audit & Workflow Notifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit alerts, manager approval requests, OCR ingestion confirmations, and duplicate warnings
          </p>
        </div>

        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary text-xs py-1.5 px-3">
            <Check className="w-3.5 h-3.5" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="card p-0 overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <LoadingSpinner label="Loading notification ledger..." />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All Clear — No Notifications"
            description="You are caught up. There are no pending audit notices or workflow alerts."
          />
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleMarkRead(n._id, n.link)}
              className={`p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors ${
                !n.read ? 'bg-slate-50/60' : ''
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-white border border-slate-200 flex-shrink-0 mt-0.5">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-slate-900">{n.title}</h4>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {new Date(n.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {n.link && (
                <div className="flex-shrink-0 self-center">
                  <span className="p-1 text-slate-400 hover:text-slate-800 block">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
