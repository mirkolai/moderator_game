import { useEffect, useRef, useState } from 'react';

import type { AppNotification } from '../types';

interface NotificationBellProps {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
}

function BellIcon({ hasUnread }: { hasUnread: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={hasUnread ? 'var(--accent)' : 'none'}
      stroke={hasUnread ? 'var(--accent)' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function formatStep(step: number) {
  return `Step ${step}`;
}

export function NotificationBell({ notifications, onMarkAllRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnread = unreadCount > 0;

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) onMarkAllRead();
      return next;
    });
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div className="notif-bell" ref={containerRef}>
      <button
        type="button"
        className={`notif-bell__trigger ghost-button ${hasUnread ? 'notif-bell__trigger--unread' : ''}`}
        onClick={toggle}
        aria-label={hasUnread ? `${unreadCount} nuove notifiche` : 'Notifiche'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <BellIcon hasUnread={hasUnread} />
        {hasUnread && (
          <span className="notif-bell__badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown card" role="dialog" aria-label="Lista notifiche">
          <div className="notif-dropdown__header">
            <span className="eyebrow">Notifiche</span>
            {notifications.length > 0 && (
              <span className="counter-pill">{notifications.length}</span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notif-dropdown__empty">Nessuna notifica</div>
          ) : (
            <ul className="notif-dropdown__list" role="list">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`notif-item ${n.read ? 'notif-item--read' : 'notif-item--unread'}`}
                  role="listitem"
                >
                  <span className="notif-item__message">{n.message}</span>
                  <span className="notif-item__meta">{formatStep(n.step)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
