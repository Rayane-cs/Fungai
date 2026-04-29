import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoVideo from "../assets/logo.webm";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export default function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Skip loading if user has already visited
    const hasVisited = sessionStorage.getItem('fungai-visited');
    if (hasVisited) {
      onLoadingComplete();
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          sessionStorage.setItem('fungai-visited', 'true');
          setTimeout(() => {
            setIsExiting(true);
            setTimeout(onLoadingComplete, 300);
          }, 150);
          return 100;
        }
        return prev + Math.random() * 20 + 8;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [onLoadingComplete]);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F5F0E6]"
        >
          {/* Blurred background shapes */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Large blurred circle - top left */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.6 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#013220]/20 blur-[100px]"
            />
            
            {/* Medium blurred circle - bottom right */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.4 }}
              transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
              className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#013220]/15 blur-[80px]"
            />
            
            {/* Small blurred circle - center left */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.3 }}
              transition={{ duration: 2, delay: 0.6, ease: "easeOut" }}
              className="absolute left-1/4 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#45FFB3]/10 blur-[60px]"
            />

            {/* Floating shape - top right */}
            <motion.div
              animate={{ 
                y: [-20, 20, -20],
                rotate: [0, 10, 0]
              }}
              transition={{ 
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute right-20 top-32 h-32 w-32 rounded-3xl bg-[#013220]/10 blur-[40px]"
            />

            {/* Floating shape - bottom left */}
            <motion.div
              animate={{ 
                y: [20, -20, 20],
                x: [-10, 10, -10]
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute bottom-40 left-20 h-24 w-24 rounded-full bg-[#013220]/8 blur-[30px]"
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo Video */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative mb-8 h-[200px] w-[200px] md:h-[280px] md:w-[280px]"
            >
              <video
                src={logoVideo}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-contain mix-blend-multiply"
              />
              
              {/* Glow behind video */}
              <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-[radial-gradient(circle,rgba(1,50,32,0.15)_0%,transparent_70%)] blur-3xl" />
            </motion.div>

            {/* Brand Name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="font-heading mb-8 text-3xl text-black md:text-4xl"
            >
              FUNG<span className="text-[#013220]">AI</span>
            </motion.h1>

            {/* Progress Bar Container */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="w-64 md:w-80"
            >
              {/* Progress Bar Track */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
                {/* Progress Bar Fill */}
                <motion.div
                  className="h-full rounded-full bg-[#013220]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>

              {/* Progress Text */}
              <div className="mt-3 flex justify-between font-body text-sm text-black/60">
                <span>Loading</span>
                <span>{Math.round(Math.min(progress, 100))}%</span>
              </div>
            </motion.div>

            {/* Loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 flex gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-[#013220]"
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
