import { motion } from "framer-motion";
import bgImage from "../assets/bg.png";
import det1Image from "../assets/detections/det1.png";
import det2Image from "../assets/detections/det2.png";
import logoVideo from "../assets/logo.webm";

interface DetectionBoxProps {
  imageSrc: string;
  label: string;
  confidence: string;
  side: "left" | "right";
}

function DetectionBox({
  imageSrc,
  label,
  confidence,
  side,
  subLabel,
}: DetectionBoxProps & { subLabel: string }) {
  const isLeft = side === "left";

  return (
    <motion.div
      initial={{ x: isLeft ? -50 : 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="flex flex-col items-center gap-1.5 rounded-xl bg-white/10 p-2 md:p-3 backdrop-blur-xl border border-white/20 shadow-2xl"
    >
      {/* Text Above - Responsive Font Sizes */}
      <div className="flex flex-col items-center">
        <span className="font-body text-[10px] md:text-[13px] font-bold tracking-wide text-black">
          {label.toUpperCase()} {confidence}
        </span>
        <span className="font-body text-[7px] md:text-[9px] font-medium uppercase tracking-[0.1em] text-black/50">
          {subLabel}
        </span>
      </div>

      {/* Image Below - Responsive Dimensions */}
      <div className="relative h-14 w-20 md:h-20 md:w-32 overflow-hidden rounded-lg border border-white/10 shadow-inner">
        <img
          src={imageSrc}
          alt={label}
          width="128"
          height="80"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover grayscale-[0.2] contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
    </motion.div>
  );
}

export default function HeroSection() {
  return (
    <section id="home" className="relative min-h-screen md:h-screen overflow-hidden bg-[#F5F0E6]">
      {/* Background with blurry leaves */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm scale-110"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      
      {/* Split Layout Container */}
      <div className="relative z-10 flex min-h-screen md:h-full items-center px-6 md:px-12 lg:px-24 py-12 md:py-0">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2">
          
          {/* Left Side: Typography & CTA */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-start text-left pt-12 lg:pt-0"
          >
            <h1 className="font-heading text-5xl font-medium leading-[1.1] text-black md:text-7xl lg:text-8xl">
              Detect<br />
              Protect<br />
              Grow
            </h1>
            
            <p className="font-body mt-8 max-w-md text-lg leading-relaxed text-black/70">
              Leveraging AI to revolutionize crop monitoring, disease detection, and sustainable farming for optimized yield.
            </p>
            
            <button className="font-heading mt-10 flex items-center gap-3 rounded-full bg-[#1a2e25] px-8 py-4 text-white transition-all hover:bg-[#0d1b15] hover:scale-105">
              Explore Our Platform
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </motion.div>

          {/* Right Side: High-Tech Dashboard */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
          >
            {/* Dashboard Container */}
            <div className="relative z-10 aspect-square w-full max-w-[600px] rounded-[2rem] border border-white/40 bg-black/10 backdrop-blur-md shadow-2xl p-8 flex items-center justify-center overflow-hidden">
              
              {/* Dashboard UI Elements */}
              <div className="absolute top-8 left-8 flex flex-col gap-1 text-[10px] font-bold tracking-widest text-black/40 uppercase">
                <p>Multi-Spectral Data: <span className="text-[#0d1b15]">OK</span></p>
                <p>Data: <span className="text-[#0d1b15]">OBT - ON</span></p>
                <p>Analysis: In Progress</p>
              </div>

              <div className="absolute bottom-8 right-8 text-[10px] font-bold tracking-widest text-black/40 uppercase text-right">
                <p>Data IOE</p>
                <p>Analysis: In Progress</p>
              </div>

              {/* Central Scanner Circle */}
              <div className="relative flex items-center justify-center">
                {/* Neon Target Rings */}
                <div className="absolute h-64 w-64 rounded-full border border-[#45FFB3]/30 animate-pulse" />
                <div className="absolute h-56 w-56 rounded-full border-2 border-[#45FFB3]/50" />
                <div className="absolute h-full w-full flex items-center justify-center">
                   {/* Crosshair lines */}
                   <div className="absolute h-[2px] w-72 bg-gradient-to-r from-transparent via-[#45FFB3]/40 to-transparent" />
                   <div className="absolute w-[2px] h-72 bg-gradient-to-b from-transparent via-[#45FFB3]/40 to-transparent" />
                </div>

                {/* The Leaf Asset */}
                <div className="relative z-10 w-48 h-48 md:w-64 md:h-64">
                   <video src={logoVideo} autoPlay loop muted playsInline width="256" height="256" className="h-full w-full object-contain mix-blend-multiply opacity-80" />
                </div>
              </div>

              {/* Footer Data Lines */}
              <div className="absolute bottom-4 left-8 right-8 flex justify-between opacity-20 overflow-hidden whitespace-nowrap">
                <p className="text-[6px] tracking-tighter uppercase font-mono">
                  SCAN: 0x45FFB3 // NODE_LEAF_77 // DATA_STREAM_ACTIVE // ANALYSIS_COMPLETE // BOOT_SEQ: OK
                </p>
              </div>
            </div>

            {/* Detection Tags - Flipped positions */}
            <div className="absolute bottom-12 left-0 z-50 -translate-x-4 md:bottom-24 md:left-0 md:-translate-x-1/2">
              <DetectionBox label="Fusarium" confidence="87%" side="left" subLabel="Confidence Score" imageSrc={det1Image} />
            </div>
            
            <div className="absolute top-12 right-0 z-50 translate-x-4 md:top-24 md:right-32 md:translate-x-0">
              <DetectionBox label="Overall" confidence="89%" side="right" subLabel="Health Index" imageSrc={det2Image} />
            </div>
            
            {/* Background Glow */}
            <div className="absolute -inset-20 -z-10 bg-[radial-gradient(circle,rgba(69,255,179,0.15)_0%,transparent_70%)] blur-3xl" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
