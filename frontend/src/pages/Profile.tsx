import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import bgImage from "../assets/bg.png";
import logo from "../assets/logo.webp";

interface User {
  id: string;
  username: string;
  email: string;
  created_at?: string;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    
    if (!storedUser || !token) {
      navigate("/login");
      return;
    }
    
    setUser(JSON.parse(storedUser));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="relative min-h-screen overflow-hidden pt-20">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-md"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F0E6]/50 via-transparent to-[#F5F0E6]/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md rounded-3xl border border-black/10 bg-[#F5F0E6]/90 p-8 shadow-2xl backdrop-blur-xl"
        >
          {/* Logo */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <img src={logo} alt="FUNGAI" width="40" height="40" className="h-10 w-auto" />
            <span className="font-heading text-2xl font-bold text-black">
              FUNG<span className="text-[#013220]">AI</span>
            </span>
          </div>

          <h2 className="font-heading mb-6 text-center text-3xl font-medium text-black">
            Your Profile
          </h2>

          {/* Profile Avatar */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#013220]/30 bg-[#E8F5E9]">
              <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12" stroke="#013220" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4" fill="#E8F5E9" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-4">
            <div className="rounded-xl border border-black/10 bg-white/50 px-4 py-3">
              <p className="font-body text-xs text-black/50">Username</p>
              <p className="font-heading text-black">{user.username}</p>
            </div>
            
            <div className="rounded-xl border border-black/10 bg-white/50 px-4 py-3">
              <p className="font-body text-xs text-black/50">Email</p>
              <p className="font-heading text-black">{user.email}</p>
            </div>
            
            {user.created_at && (
              <div className="rounded-xl border border-black/10 bg-white/50 px-4 py-3">
                <p className="font-body text-xs text-black/50">Member Since</p>
                <p className="font-heading text-black">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <Link
              to="/history"
              className="font-heading flex w-full items-center justify-center rounded-xl border border-[#013220] py-3 font-semibold text-[#013220] transition-all hover:bg-[#013220]/5"
            >
              View Scan History
            </Link>
            
            <button
              onClick={handleLogout}
              className="font-heading flex w-full items-center justify-center rounded-xl bg-red-600 py-3 font-semibold text-white transition-all hover:bg-red-700"
            >
              Logout
            </button>
          </div>

          {/* Back */}
          <div className="mt-6 text-center">
            <Link to="/" className="font-body text-sm text-black/50 transition-colors hover:text-black">
              ← Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
