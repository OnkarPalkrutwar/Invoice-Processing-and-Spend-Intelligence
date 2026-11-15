import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  UploadCloud,
  CheckSquare,
  Building2,
  TrendingUp,
  FileSpreadsheet,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { approvalService } from '../../services/approvalService';
import { notificationService } from '../../services/notificationService';

export const Sidebar = ({ isCollapsed, toggleCollapse }) => {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    const fetchCounters = async () => {
      try {
        if (hasRole('ADMIN', 'FINANCE_MANAGER')) {
          const res = await approvalService.getPendingApprovals();
          if (res.success && res.data) {
            setPendingApprovalsCount(res.data.length);
          }
        }
        const notifRes = await notificationService.getNotifications(1, 1);
        if (notifRes.success && notifRes.data) {
          setUnreadNotificationsCount(notifRes.data.unreadCount || 0);
        }
      } catch (e) {
        // Silently skip counter fail
      }
    };

    fetchCounters();
    const interval = setInterval(fetchCounters, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const navSections = [
    {
      title: 'Core Workspace',
      items: [
        { label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Invoices', icon: Receipt, path: '/invoices' },
        { label: 'Upload & Process', icon: UploadCloud, path: '/upload' },
      ],
    },
    {
      title: 'Payables & Vendors',
      items: [
        ...(hasRole('ADMIN', 'FINANCE_MANAGER')
          ? [
              {
                label: 'Approval Queue',
                icon: CheckSquare,
                path: '/approvals',
                badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
                badgeAlert: true,
              },
            ]
          : []),
        { label: 'Vendors Ledger', icon: Building2, path: '/vendors' },
      ],
    },
    {
      title: 'Intelligence & Audit',
      items: [
        { label: 'Spend Intelligence', icon: TrendingUp, path: '/spend-intelligence' },
        { label: 'Financial Reports', icon: FileSpreadsheet, path: '/reports' },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          label: 'Notifications',
          icon: Bell,
          path: '/notifications',
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null,
        },
        { label: 'Company Settings', icon: Settings, path: '/settings' },
      ],
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-200 bg-[#0e1117] border-r border-[#1e2330] flex flex-col justify-between ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Top Organization Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#1e2330]">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                AI
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white tracking-tight truncate">
                    Apex Innovations
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-zinc-800 text-zinc-400 rounded border border-zinc-700/60 uppercase tracking-wider">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">Finance Workspace</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-semibold text-sm mx-auto">
              AI
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className={`p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors ${
              isCollapsed ? 'hidden' : 'block'
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {section.title}
                </div>
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(`${item.path}/`));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                      isActive
                        ? 'bg-zinc-800/90 text-white shadow-xs border border-zinc-700/60 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}

                    {/* Badge */}
                    {item.badge && (
                      <span
                        className={`ml-auto px-1.5 py-0.5 text-[10px] font-semibold rounded-md border ${
                          item.badgeAlert
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        } ${isCollapsed ? 'absolute top-1 right-2 w-2 h-2 p-0 rounded-full border-none bg-amber-400' : ''}`}
                      >
                        {!isCollapsed && item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-[#1e2330]">
        <div
          className={`flex items-center gap-2.5 p-2 rounded-lg bg-[#141822]/80 border border-[#1e2330] ${
            isCollapsed ? 'justify-center p-2' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center font-semibold text-xs flex-shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-zinc-400 capitalize truncate">
                {user?.role?.replace('_', ' ').toLowerCase() || 'Employee'}
              </p>
            </div>
          )}

          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-md hover:bg-zinc-800/80 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
