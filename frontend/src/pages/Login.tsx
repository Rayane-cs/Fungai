import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import bgImage from "../assets/bg.png";
import logo from "../assets/logo.webp";
import { LoadingSpinner } from "../components/Skeleton";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token and redirect
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err: any) {
      if (err.message === "Failed to fetch") {
        setError("Server is unreachable. Please make sure the backend is running on " + API_URL);
      } else {
        setError(err.message || "Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background with blur - same as hero section */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-md"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F0E6]/50 via-transparent to-[#F5F0E6]/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
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
            Welcome Back
          </h2>

          {error && (
            <div className="mb-4 rounded-xl bg-red-100 border border-red-300 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="font-body mb-2 block text-sm text-black/70">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-body w-full rounded-xl border border-black/20 bg-white/50 px-4 py-3 text-black placeholder-black/40 outline-none transition-all focus:border-[#013220] focus:bg-white"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="font-body mb-2 block text-sm text-black/70">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-body w-full rounded-xl border border-black/20 bg-white/50 px-4 py-3 pr-12 text-black placeholder-black/40 outline-none transition-all focus:border-[#013220] focus:bg-white"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="font-body flex items-center gap-2 text-black/70">
                <input type="checkbox" className="rounded border-black/30" />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                className="font-body text-[#013220] transition-colors hover:text-[#1a3d2e]"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="font-heading flex w-full items-center justify-center gap-2 rounded-xl bg-[#013220] py-3.5 font-semibold text-white transition-all hover:bg-[#1a3d2e] hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="font-body mt-6 text-center text-black/70">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-[#013220] font-medium transition-colors hover:text-[#1a3d2e]"
            >
              Sign up
            </Link>
          </p>

          {/* Back to home */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="font-body text-sm text-black/50 transition-colors hover:text-black"
            >
              ← Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
