import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const parseDate = (value) => {
  if (!value) return 0;
  if (Array.isArray(value)) {
    const [y, m, d, h = 0, min = 0, s = 0] = value;
    return new Date(y, m - 1, d, h, min, s).getTime();
  }
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const relativeTimeVi = (value) => {
  const t = parseDate(value);
  if (!t) return '';
  const dayMs = 86400000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(t);
  date.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - date.getTime()) / dayMs);
  if (diff <= 0) return 'Hôm nay';
  if (diff === 1) return '1 ngày';
  if (diff < 7) return `${diff} ngày`;
  const weeks = Math.floor(diff / 7);
  if (weeks < 5) return `${weeks} tuần`;
  return `${String(new Date(t).getDate()).padStart(2, '0')}/${String(new Date(t).getMonth() + 1).padStart(2, '0')}`;
};

const initials = (text) => {
  const parts = String(text || 'TB').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0] || 'TB').slice(0, 2).toUpperCase();
};

const storageKeyForUser = (user) => `readAnnouncementIds:${user?.id || 'guest'}`;

const readStoredIds = (user) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKeyForUser(user)) || '[]').map(String));
  } catch {
    return new Set();
  }
};

const writeStoredIds = (user, ids) => {
  localStorage.setItem(storageKeyForUser(user), JSON.stringify(Array.from(ids)));
};

const normalizeAnnouncement = (item) => {
  const title = item?.title || item?.content || 'Thông báo';
  const content = item?.content || '';
  const author = item?.createdBy?.fullName || item?.author?.fullName || 'Nhà trường';
  const className = item?.classEntity?.name || item?.class?.name || '';
  return {
    id: String(item?.id ?? `${title}-${item?.createdAt || item?.created_at || ''}`),
    title,
    content,
    author,
    className,
    createdAt: item?.createdAt || item?.created_at,
  };
};

const NotificationBellPopup = ({
  announcements = [],
  user,
  buttonClassName = '',
  iconClassName = '',
  badgeClassName = '',
  bellSize = 20,
  renderIcon,
  showBadge = true,
}) => {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => readStoredIds(user));

  useEffect(() => {
    setReadIds(readStoredIds(user));
  }, [user?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const items = useMemo(() => {
    return (announcements || [])
      .map(normalizeAnnouncement)
      .sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
  }, [announcements]);

  const unreadItems = items.filter((item) => !readIds.has(item.id));

  const markRead = (id) => {
    const next = new Set(readIds);
    next.add(String(id));
    setReadIds(next);
    writeStoredIds(user, next);
  };

  const openAnnouncement = (id) => {
    markRead(id);
    setOpen(false);
    navigate(`/announcements?announcementId=${encodeURIComponent(id)}`);
  };

  const goToAnnouncements = () => {
    const next = new Set(readIds);
    items.forEach((item) => next.add(item.id));
    setReadIds(next);
    writeStoredIds(user, next);
    setOpen(false);
    navigate('/announcements');
  };

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className={buttonClassName}
        aria-label="Thông báo"
        onClick={() => setOpen((value) => !value)}
      >
        {renderIcon ? renderIcon() : <Bell size={bellSize} strokeWidth={2} className={iconClassName} />}
        {showBadge && unreadItems.length > 0 ? (
          <span className={badgeClassName || 'absolute -right-1 -top-1 min-w-5 rounded-full bg-sky-500 px-1.5 text-[11px] font-bold leading-5 text-white'}>
            {Math.min(unreadItems.length, 9)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <h2 className="text-2xl font-extrabold tracking-tight">Thông báo</h2>
            <button type="button" className="rounded-full px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100">...</button>
          </div>

          <div className="flex items-center justify-between px-4 pb-3">
            <span className="font-bold text-slate-800">Thông báo gần đây</span>
            <button type="button" onClick={goToAnnouncements} className="text-sm font-medium text-sky-400 hover:underline">
              Xem tất cả
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto px-2 pb-3">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Chưa có thông báo nào.
              </div>
            ) : (
              items.slice(0, 8).map((item) => {
                const unread = !readIds.has(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => openAnnouncement(item.id)}
                    className="group flex w-full gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-100"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-sky-100 to-emerald-100 text-slate-700">
                      <div className="flex h-full w-full items-center justify-center text-sm font-extrabold">
                        {initials(item.author)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-white">
                        <UsersRound size={14} />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[15px] leading-snug text-slate-900">
                        <span className="font-bold">{item.author}</span>
                        {': '}
                        <span>{item.title}</span>
                      </p>
                      {item.className ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">{item.className}</p>
                      ) : null}
                      <p className={`mt-0.5 text-xs font-bold ${unread ? 'text-sky-600' : 'text-slate-500'}`}>
                        {relativeTimeVi(item.createdAt)}
                      </p>
                    </div>
                    {unread ? <span className="mt-6 h-3 w-3 shrink-0 rounded-full bg-sky-500" /> : null}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={goToAnnouncements}
              className="w-full rounded-lg bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-200"
            >
              Xem thông báo trước đó
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBellPopup;
