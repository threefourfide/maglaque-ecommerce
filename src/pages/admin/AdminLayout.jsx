import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Boxes, Tag, Users, LogOut, User, ScrollText, Archive, BarChart3, MessageSquare, Settings, ChevronDown, Store, ExternalLink, Menu, X } from 'lucide-react';
import AddAdminModal from './AddAdminModal';
import { ToastProvider, SlidingTabs, ConfirmModal } from './AdminUI';
import { AlertsProvider, StockReminder, useAlerts } from './AdminAlerts';
import './admin.css';

const baseNav = [
  { key: '/admin/reports', label: 'Reports', Icon: BarChart3 },
  { key: '/admin/orders', label: 'Orders', Icon: Boxes },
  { key: '/admin/products', label: 'Products', Icon: Tag },
  { key: '/admin/homepage', label: 'Homepage Content', Icon: Store },
  { key: '/admin/users', label: 'Users', Icon: Users },
  { key: '/admin/reviews', label: 'Reviews', Icon: MessageSquare },
  { key: '/admin/action-logs', label: 'Action Logs', Icon: ScrollText },
  { key: '/admin/archive', label: 'Archive', Icon: Archive },
];

function Shell({ user, onLogout, onUserChange }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { unseen } = useAlerts();
  const [menuOpen, setMenuOpen] = useState(false);
  const [addAdmin, setAddAdmin] = useState(false);
  const [navState, setNavState] = useState({ pathname, open: false });
  const navOpen = navState.pathname === pathname && navState.open;
  const [confirmLogout, setConfirmLogout] = useState(false);
  const closeTimer = useRef();
  const onSettings = pathname === '/admin/settings';

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const openMenu = () => {
    clearTimeout(closeTimer.current);
    setMenuOpen(true);
  };

  const closeMenuSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenuOpen(false), 150);
  };
  const navItems = baseNav.map(({ key, label, Icon }) => ({
    key,
    content: (
      <span className="flex w-full items-center gap-3">
        <Icon className="h-5 w-5 stroke-[1.5]" />
        {label}
        {key === '/admin/orders' && unseen > 0 && (
          <span
            key={unseen}
            aria-label={`${unseen} new orders`}
            className="admin-pop ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#B3261E] px-1.5 text-[11px] leading-none text-white"
          >
            {unseen > 99 ? '99+' : unseen}
          </span>
        )}
      </span>
    ),
  }));
  const active = navItems.find((i) => pathname.startsWith(i.key))?.key;

  const logout = () => {
    onLogout();
    navigate('/auth');
  };

  return (
      <div className="flex min-h-screen flex-col bg-[#EDE5DB] text-[#2D3831] md:flex-row" style={{ fontFamily: "'Marcellus', serif" }}>
        {!onSettings && (
        <aside className="relative flex shrink-0 flex-col bg-[#FAF6EF] px-4 py-4 md:sticky md:top-0 md:h-screen md:w-[210px] md:px-5 md:py-6">
          <button
            type="button"
            onClick={() => setNavState({ pathname, open: !navOpen })}
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={navOpen}
            className="absolute right-3 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-md border border-[#2D3831]/20 bg-white md:hidden"
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div
            className="relative"
            onMouseEnter={openMenu}
            onMouseLeave={closeMenuSoon}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setMenuOpen(false);
            }}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex w-full items-center gap-3 rounded-md text-left transition-opacity hover:opacity-80"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2D3A31] text-[#F9F6F0]">
                {user.photo ? (
                  <img src={user.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-7 w-7 stroke-[1.5]" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate pr-12 text-xl leading-tight md:pr-0" title={user.name}>{user.name}</span>
                <span className="mt-0.5 block truncate text-xs text-[#2D3831]/70">Admin Account</span>
              </span>
            </button>
            <p className="mt-2 flex items-center justify-center gap-1 border-t border-[#2D3831]/10 pt-2 text-[10px] uppercase tracking-[0.15em] text-[#2D3831]/50">
              <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`} />
              {/* Hover for options */}
            </p>

            {menuOpen && (
              <div
                role="menu"
                className="admin-modal absolute left-0 top-full z-40 mt-2 w-56 border border-[#2D3831]/10 bg-white py-1 shadow-xl"
              >
                <span className="absolute -top-1.5 left-6 h-3 w-3 rotate-45 border-l border-t border-[#2D3831]/10 bg-white" aria-hidden="true" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/admin/settings');
                  }}
                  className="relative flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[#2D3831]/5"
                >
                  <Settings className="h-4 w-4 stroke-[1.5]" />
                  Account Settings
                </button>
                {/*
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setAddAdmin(true);
                  }}
                  className="relative flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[#2D3831]/5"
                >
                  <UserPlus className="h-4 w-4 stroke-[1.5]" />
                  Add Admin Account
                </button>
                */}
              </div>
            )}
          </div>

          <div className={`${navOpen ? 'flex' : 'hidden'} flex-col md:flex md:flex-1`}>
          <SlidingTabs
            items={navItems}
            value={active}
            onChange={(key) => navigate(key)}
            className="mt-4 flex flex-col gap-2 md:mt-8"
            pillClassName="rounded-md bg-[#2D3A31]"
            buttonClassName="w-full rounded-md px-4 py-3 text-left text-sm"
            activeClassName="text-[#F9F6F0]"
            inactiveClassName="hover:bg-[#2D3831]/5"
          />

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title="Opens the store in a new tab. You stay signed in here."
            className="mt-6 flex items-center gap-3 rounded-md px-4 py-3 text-left text-sm transition-colors hover:bg-[#2D3831]/5 md:mt-auto"
          >
            <Store className="h-5 w-5 stroke-[1.5]" />
            View Live Store
            <ExternalLink className="ml-auto h-3.5 w-3.5 stroke-[1.5] text-[#2D3831]/50" />
          </a>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="mt-1 flex items-center gap-3 rounded-md px-4 py-3 text-left text-sm transition-colors hover:bg-[#2D3831]/5"
          >
            <LogOut className="h-5 w-5 stroke-[1.5]" />
            Logout
          </button>
          </div>
        </aside>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
          <StockReminder />
          <div key={pathname} className="admin-page">
            <Outlet context={{ user, onUserChange }} />
          </div>
        </main>
      {confirmLogout && (
        <ConfirmModal
          title="Log out?"
          message="Are you sure you want to log out?"
          confirmLabel="Log out"
          cancelLabel="Stay signed in"
          onConfirm={logout}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
      {addAdmin && <AddAdminModal onClose={() => setAddAdmin(false)} onCreated={() => setAddAdmin(false)} />}
      </div>
  );
}

export default function AdminLayout(props) {
  return (
    <ToastProvider>
      <AlertsProvider>
        <Shell {...props} />
      </AlertsProvider>
    </ToastProvider>
  );
}
