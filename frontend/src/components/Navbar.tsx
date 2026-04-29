import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface User {
  id: string;
  username: string;
  email: string;
}

interface NavbarProps {
  logoSrc?: string;
}

// Default profile icon component matching the theme
function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-full w-full"
      stroke="#013220"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="8" r="4" fill="#E8F5E9" />
      <path
        d="M4 20c0-4 4-6 8-6s8 2 8 6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DropdownMenu({ onLogout }: { onLogout: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-black/10 bg-[#F5F0E6] py-2 shadow-xl backdrop-blur-md"
    >
      <Link
        to="/profile"
        className="flex items-center gap-3 px-4 py-2.5 text-black transition-colors hover:bg-[#013220]/10"
      >
        <svg className="h-5 w-5 text-[#013220]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="font-heading text-sm">Profile</span>
      </Link>
      <div className="my-1 border-t border-black/10" />
      <button
        onClick={onLogout}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-red-600 transition-colors hover:bg-red-50"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span className="font-heading text-sm">Logout</span>
      </button>
    </motion.div>
  );
}

export default function Navbar({ logoSrc }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    };
    
    checkUser();
    
    // Listen for storage changes (login/logout in other tabs)
    window.addEventListener("storage", checkUser);
    
    // Poll every 1s to detect same-tab changes
    const interval = setInterval(checkUser, 1000);
    
    return () => {
      window.removeEventListener("storage", checkUser);
      clearInterval(interval);
    };
  }, []);

  const isActive = (path: string) => {
    if (path.startsWith('#')) {
      return location.pathname === '/' && location.hash === path;
    }
    return location.pathname === path;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setDropdownOpen(false);
    navigate("/");
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-black/10 bg-[#F5F0E6]/80 px-6 py-4 backdrop-blur-md md:px-12"
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3">
        {logoSrc ? (
          <img src={logoSrc} alt="FUNGAI" width="40" height="40" className="h-10 w-auto" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
            <span className="text-xs font-bold">F</span>
          </div>
        )}
        <span className="font-heading text-2xl tracking-wide text-black uppercase">
          FUNGAI
        </span>
      </Link>

      {/* Center Nav */}
      <div className="hidden items-center gap-8 md:flex absolute left-1/2 -translate-x-1/2">
        <Link
          to="/"
          className={`font-heading text-lg transition-colors hover:opacity-70 ${isActive('/') ? 'text-[#013220]' : 'text-black'}`}
        >
          Home
        </Link>
        <Link
          to="/scan"
          className={`font-heading text-lg transition-colors hover:opacity-70 ${isActive('/scan') ? 'text-[#013220]' : 'text-black'}`}
        >
          Scan
        </Link>
        <Link
          to="/history"
          className={`font-heading text-lg transition-colors hover:opacity-70 ${isActive('/history') ? 'text-[#013220]' : 'text-black'}`}
        >
          History
        </Link>
        <a
          href="/#about"
          className="font-heading text-lg text-black transition-colors hover:opacity-70"
        >
          About
        </a>
        <a
          href="/#contact"
          className="font-heading text-lg text-black transition-colors hover:opacity-70"
        >
          Contact
        </a>
      </div>

      {/* Auth Buttons or Profile */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-[#013220]/30 bg-[#E8F5E9] transition-all hover:border-[#013220]"
            >
              <ProfileIcon />
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <DropdownMenu onLogout={handleLogout} />
              )}
            </AnimatePresence>
          </div>
        ) : (
          <>
            <Link
              to="/login"
              className="font-heading rounded-full border border-black/40 px-6 py-2 text-sm text-black transition-all hover:bg-black/5"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="font-heading rounded-full bg-[#0d1b15] px-6 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </motion.nav>
  );
}
