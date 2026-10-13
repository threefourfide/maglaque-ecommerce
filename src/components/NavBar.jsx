import { useState } from 'react';
import LogoutDialog from './LogoutDialog';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, Menu, X } from 'lucide-react';

export default function NavBar({ cartCount, user, onLogout }) {
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#F9F6F0]/90 backdrop-blur-md border-b border-[#2D3831]/10">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-20 sm:px-6">
        
        <Link to="/" className="text-2xl font-serif tracking-[0.2em] text-[#2D3831]">
          ELLE
        </Link>

        <nav className="hidden items-center justify-self-center space-x-10 text-sm tracking-widest text-[#2D3831]/70 md:flex">
          <Link to="/" className="transition-colors hover:text-[#2D3A31]">HOME</Link>
          <Link to="/catalog" className="transition-colors hover:text-[#2D3A31]">COLLECTION</Link>
          <Link to="/about" className="transition-colors hover:text-[#2D3A31]">ABOUT US</Link>
        </nav>

        <div className="flex items-center justify-self-end gap-3 sm:gap-5 md:gap-6">
          <Link aria-label="Search collection" to="/catalog" className="flex h-11 w-11 items-center justify-center text-[#2D3831]/70 transition-colors hover:text-[#2D3A31]">
            <Search className="w-5 h-5 stroke-[1.5]" />
          </Link>
          
          <Link aria-label={`Shopping bag${cartCount ? `, ${cartCount} items` : ''}`} to="/cart" className="relative flex h-11 w-11 items-center justify-center text-[#2D3831]/70 transition-colors hover:text-[#2D3A31]">
            <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#2D3831] text-[#F9F6F0] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-sans">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            /* LOGGED IN: user icon, hover shows Account + Logout */
            <div className="relative group">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label={`Open account menu for ${user.name.split(' ')[0]}. Active now`}
                className="flex h-11 items-center gap-2 text-[#2D3831]/70 transition-colors hover:text-[#2D3A31] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D3A31]"
              >
                <span className="relative flex h-6 w-6 items-center justify-center">
                  <User className="h-5 w-5 stroke-[1.5]" />
                  <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#F9F6F0] bg-[#2D6A4F]" />
                </span>
                <span className="hidden sm:inline text-sm tracking-widest">
                  {user.name.split(' ')[0].toUpperCase()}
                </span>
              </button>

              <div className={`absolute right-2 top-full pt-2 transition-all duration-200 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 sm:pt-4 ${accountOpen ? 'visible opacity-100' : 'invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'}`}>
                <div className="w-52 bg-[#F9F6F0] border border-[#2D3831]/10 shadow-lg">
                  <div className="px-5 py-4 border-b border-[#2D3831]/10">
                    <p className="text-sm text-[#2D3831] truncate">{user.name}</p>
                    <p className="text-xs text-[#2D3831]/60 truncate">{user.email}</p>
                    <p className="mt-2 flex items-center gap-2 text-xs text-[#2D6A4F]">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#2D6A4F]" />
                      Active now
                    </p>
                  </div>
                  <Link
                    to={user.role === 'admin' ? '/admin/orders' : '/account'}
                    onClick={() => setAccountOpen(false)}
                    className="block px-5 py-3 text-xs tracking-widest text-[#2D3831]/80 transition-colors hover:bg-[#2D3A31] hover:text-[#F9F6F0]"
                  >
                    {user.role === 'admin' ? 'ADMIN DASHBOARD' : 'ACCOUNT'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmLogout(true)}
                    className="w-full text-left px-5 py-3 text-xs tracking-widest text-[#2D3831]/80 hover:bg-[#2D3A31] hover:text-[#F9F6F0] transition-colors"
                  >
                    LOGOUT
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* NOT LOGGED IN */
            <Link aria-label="Sign in" to="/auth" className="flex h-11 items-center px-1 text-xs tracking-widest text-[#2D3831]/70 transition-colors hover:text-[#2D3A31] sm:text-sm">
              <span className="hidden sm:inline">LOGIN</span>
              <User className="h-5 w-5 sm:hidden" />
            </Link>
          )}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center text-[#2D3831] md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

      </div>
      {mobileMenuOpen && (
        <nav aria-label="Mobile navigation" className="border-t border-[#2D3831]/10 bg-[#F9F6F0] px-4 py-3 md:hidden">
          {[
            ['/', 'Home'],
            ['/catalog', 'Collection'],
            ['/about', 'About Us'],
            ...(user ? [[user.role === 'admin' ? '/admin/orders' : '/account', user.role === 'admin' ? 'Admin dashboard' : 'My account']] : [['/auth', 'Sign in']]),
          ].map(([to, label]) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              className="block border-b border-[#2D3831]/10 px-3 py-4 text-xs uppercase tracking-[0.18em] text-[#2D3831]/80 last:border-0"
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      <LogoutDialog
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          handleLogout();
        }}
      />
    </header>
  );
}