import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-black/10 ${className}`}
    />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="h-4 animate-pulse rounded bg-black/10"
          style={{ width: `${Math.random() * 30 + 70}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-4 rounded-2xl border border-black/10 bg-white/50 p-6 ${className}`}
    >
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-6 w-3/4" />
      <SkeletonText lines={2} />
    </motion.div>
  );
}

export function SkeletonForm({ className = "" }: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`space-y-6 ${className}`}
    >
      <div className="flex justify-center">
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-48 mx-auto" />
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-12 w-full" />
    </motion.div>
  );
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={`${sizeClasses[size]} rounded-full border-2 border-[#013220]/20 border-t-[#013220]`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F0E6]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <span className="font-body text-sm text-black/60">Loading...</span>
      </div>
    </div>
  );
}
