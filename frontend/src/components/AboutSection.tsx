import { motion } from "framer-motion";
import { useState } from "react";
import logo from "../assets/logo.webp";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: "easeOut" }
};

export default function AboutSection() {
  const [activeTab, setActiveTab] = useState<"model" | "website">("model");

  return (
    <section id="about" className="relative bg-[#F5F0E6] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        
        {/* Who We Are */}
        <motion.div
          {...fadeInUp}
          className="mb-20 text-center"
        >
          <span className="font-body text-sm uppercase tracking-widest text-[#013220]/60">
            Who We Are
          </span>
          <h2 className="font-heading mt-4 text-4xl font-medium text-black md:text-5xl lg:text-6xl">
            Pioneering AI-Powered<br />Plant Health
          </h2>
          <p className="font-body mx-auto mt-6 max-w-3xl text-lg text-black/70">
            FUNGAI is an AI-powered solution developed specifically for Algerian agriculture, 
            targeting the Chlef region where fungal infections cause 20-40% yield losses in key crops 
            including wheat, olives, and vegetables. Our system addresses the 1.5 billion Dinar annual 
            economic impact of soil-borne fungal diseases.
          </p>
        </motion.div>

        {/* About Tabs - Model vs Website */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-20"
        >
          {/* Tab Buttons */}
          <div className="mb-8 flex justify-center gap-4">
            <button
              onClick={() => setActiveTab("model")}
              className={`font-heading rounded-full px-8 py-3 text-sm transition-all ${
                activeTab === "model"
                  ? "bg-[#013220] text-white"
                  : "border border-black/20 text-black hover:bg-black/5"
              }`}
            >
              About Our Model
            </button>
            <button
              onClick={() => setActiveTab("website")}
              className={`font-heading rounded-full px-8 py-3 text-sm transition-all ${
                activeTab === "website"
                  ? "bg-[#013220] text-white"
                  : "border border-black/20 text-black hover:bg-black/5"
              }`}
            >
              About The Platform
            </button>
          </div>

          {/* Tab Content */}
          <div className="rounded-3xl border border-black/10 bg-white/50 p-8 md:p-12 backdrop-blur-sm">
            {activeTab === "model" ? (
              <div className="grid gap-8 md:grid-cols-2 md:gap-12">
                <div>
                  <h3 className="font-heading mb-4 text-2xl text-black">Deep Learning Architecture</h3>
                  <p className="font-body mb-4 text-black/70">
                    We trained YOLOv8 using transfer learning on a custom Roboflow dataset of fungal plant infections, achieving a best mAP50 of 86.2% with 84.5% precision and 83.3% recall over 100 epochs.
                  </p>
                  <ul className="font-body space-y-2 text-black/70">
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#013220]" />
                      4 major pathogenic fungi detected
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#013220]" />
                      Fusarium, Alternaria, Aspergillus, Pinicellium
                    </li>
                  </ul>
                </div>
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="h-48 w-48 rounded-2xl bg-gradient-to-br from-[#013220]/10 to-[#013220]/5 flex items-center justify-center">
                      <div className="text-center">
                        <span className="font-heading text-5xl font-bold text-[#013220]">86.2%</span>
                        <p className="font-body mt-2 text-sm text-black/60">Accuracy</p>
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 rounded-xl bg-[#013220] px-4 py-2 text-white font-heading text-sm">
                      DenseNet121
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 md:gap-12">
                <div>
                  <h3 className="font-heading mb-4 text-2xl text-black">Precision Agriculture for Algeria</h3>
                  <p className="font-body mb-4 text-black/70">
                    Designed specifically for Algerian conditions, our platform addresses local challenges. Outperforms traditional methods 
                    (Visual: 40-60%, Microscopic: 70-80%) with AI-powered detection exceeding 99% accuracy.
                  </p>
                  <ul className="font-body space-y-2 text-black/70">
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#013220]" />
                      Optimized for wheat, olives, citrus, vegetables
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#013220]" />
                      Early-stage infection detection
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#013220]" />
                      Local calibration for Chlef region
                    </li>
                  </ul>
                </div>
                <div className="flex items-center justify-center">
                  <img src={logo} alt="FUNGAI Platform" width="128" height="128" className="h-32 w-auto opacity-80" />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-20"
        >
          <h3 className="font-heading mb-12 text-center text-3xl text-black md:text-4xl">
            How It Works
          </h3>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "Image Capture", desc: "Upload plant or soil images through our intuitive interface" },
              { step: "02", title: "AI Processing", desc: "DenseNet121 or YOLOv8n analyzes for fungal pathogens in real-time" },
              { step: "03", title: "Diagnosis & Action", desc: "Get accurate identification and tailored treatment recommendations" }
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="rounded-2xl border border-black/10 bg-white/50 p-8 text-center backdrop-blur-sm"
              >
                <span className="font-heading text-4xl font-bold text-[#013220]/20">
                  {item.step}
                </span>
                <h4 className="font-heading mt-4 text-xl text-black">{item.title}</h4>
                <p className="font-body mt-2 text-black/60">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div
          id="contact"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="rounded-3xl bg-[#013220] p-8 md:p-12 lg:p-16"
        >
          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div>
              <h3 className="font-heading text-3xl text-white md:text-4xl">
                Get In Touch
              </h3>
              <p className="font-body mt-4 text-white/70">
                Have questions about FUNGAI? Our team is here to help you transform 
                your agricultural practices with AI.
              </p>
              <div className="mt-8 space-y-4">
                <a href="mailto:hello@fungai.com" className="font-body flex items-center gap-3 text-white/80 hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  hello@fungai.com
                </a>
                <a href="tel:+1234567890" className="font-body flex items-center gap-3 text-white/80 hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +1 (234) 567-890
                </a>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center text-white/80">
                <p className="font-body text-sm mb-2">Visit us at</p>
                <p className="font-heading text-lg">Chlef, Algeria</p>
                <p className="font-body text-sm mt-4 text-white/60">
                  Available Monday - Friday<br />9:00 AM - 5:00 PM
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
