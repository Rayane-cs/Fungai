import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import bgImage from "../assets/bg.png";
import logo from "../assets/logo.webp";
import { LoadingSpinner } from "../components/Skeleton";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log("Forgot password:", { email });
    setIsLoading(false);
    setSubmitted(true);
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

          <h2 className="font-heading mb-2 text-center text-3xl font-medium text-black">
            Reset Password
          </h2>

          <p className="font-body mb-6 text-center text-black/60">
            Enter your email address and we'll send you instructions to reset your password.
          </p>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#013220]/10">
                <svg className="h-8 w-8 text-[#013220]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-heading mb-2 text-xl text-black">Check your email</h3>
              <p className="font-body text-black/60 mb-6">
                We've sent password reset instructions to {email}
              </p>
              <Link
                to="/login"
                className="font-heading inline-block rounded-xl bg-[#013220] px-8 py-3 text-white font-semibold transition-all hover:bg-[#1a3d2e]"
              >
                Back to Sign In
              </Link>
            </motion.div>
          ) : (
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

              <button
                type="submit"
                disabled={isLoading}
                className="font-heading flex w-full items-center justify-center gap-2 rounded-xl bg-[#013220] py-3.5 font-semibold text-white transition-all hover:bg-[#1a3d2e] hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Sending...</span>
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}

          {/* Back to login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="font-body text-sm text-black/50 transition-colors hover:text-black"
            >
              ← Back to Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
