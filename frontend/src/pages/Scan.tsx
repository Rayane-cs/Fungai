import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { LoadingSpinner } from "../components/Skeleton";

interface Detection {
  label: string;
  confidence: number;
  bbox: number[];
  class_id: number;
}

interface ScanResult {
  id: string;
  timestamp: string;
  filename: string;
  detections: Detection[];
  original_image_base64?: string;
  annotated_image_base64: string;
  total_detections: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COLORS = ["#013220", "#45FFB3", "#1a3d2e", "#2d5a4a", "#3d7a5a", "#4d9a6a"];

export default function Scan() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file (JPG, PNG, or WebP)");
      return;
    }
    
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setResult(null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) {
      setError("Please select an image first");
      return;
    }

    setIsScanning(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const response = await fetch(`${API_URL}/api/detect`, {
        method: "POST",
        body: formData,
        headers: {
          "X-User-ID": localStorage.getItem("user_id") || "anonymous",
        },
      });

      if (!response.ok) {
        throw new Error(`Scan failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      
      // Store user ID for history
      if (!localStorage.getItem("user_id")) {
        localStorage.setItem("user_id", "user_" + Date.now());
      }
      
      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const downloadPDF = async () => {
    if (!resultsRef.current || !result) return;

    try {
      const canvas = await html2canvas(resultsRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#F5F0E6",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add extra pages if content is long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`fungai-scan-${result.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  // Calculate statistics
  const getClassCounts = () => {
    if (!result) return [];
    const counts: Record<string, number> = {};
    result.detections.forEach((d) => {
      counts[d.label] = (counts[d.label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  };

  const getConfidenceData = () => {
    if (!result) return [];
    return result.detections.map((d, i) => ({
      id: i,
      confidence: d.confidence * 100,
      label: d.label,
    }));
  };

  const getStats = () => {
    if (!result || result.detections.length === 0) {
      return { total: 0, mostCommon: "-", avgConfidence: 0 };
    }
    
    const total = result.detections.length;
    const classCounts: Record<string, number> = {};
    result.detections.forEach((d) => {
      classCounts[d.label] = (classCounts[d.label] || 0) + 1;
    });
    const mostCommon = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0][0];
    const avgConfidence = result.detections.reduce((sum, d) => sum + d.confidence, 0) / total;
    
    return { total, mostCommon, avgConfidence };
  };

  const stats = getStats();
  const classCounts = getClassCounts();
  const confidenceData = getConfidenceData();

  return (
    <div className="min-h-screen bg-[#F5F0E6] pb-20">
      {/* Header */}
      <div className="border-b border-black/10 bg-white/50 px-6 py-8 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-heading text-4xl text-black md:text-5xl">
            Scan <span className="text-[#013220]">Sample</span>
          </h1>
          <p className="font-body mt-2 text-black/60">
            Upload an image to detect fungal infections using AI
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-3xl border-2 border-dashed p-12 text-center transition-all ${
              dragActive
                ? "border-[#013220] bg-[#013220]/5"
                : "border-black/20 hover:border-[#013220]/50 hover:bg-black/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInput}
              className="hidden"
            />
            
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#013220]/10">
              <svg
                className="h-10 w-10 text-[#013220]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            
            <h3 className="font-heading text-xl text-black">
              Drop your image here, or click to browse
            </h3>
            <p className="font-body mt-2 text-sm text-black/60">
              Supports JPG, PNG, WebP up to 10MB
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 rounded-xl bg-red-50 p-4 text-red-600"
            >
              {error}
            </motion.div>
          )}

          {previewUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6"
            >
              <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-4">
                <p className="font-body mb-4 text-sm text-black/60">
                  Selected: {selectedFile?.name}
                </p>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="mx-auto max-h-[400px] rounded-xl object-contain"
                />
                
                <div className="mt-4 flex gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleScan();
                    }}
                    disabled={isScanning}
                    className="font-heading flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#013220] py-4 text-white transition-all hover:bg-[#1a3d2e] hover:scale-[1.02] disabled:opacity-70"
                  >
                    {isScanning ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Scan Image
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setResult(null);
                    }}
                    disabled={isScanning}
                    className="font-heading rounded-xl border-2 border-black/20 px-6 py-4 text-black transition-all hover:bg-black/5"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Results Section */}
        {result && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 space-y-8"
          >
            {/* Results Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-3xl text-black">Scan Results</h2>
                <p className="font-body text-black/60">
                  {new Date(result.timestamp).toLocaleString()} • {result.filename}
                </p>
              </div>
              
              <button
                onClick={downloadPDF}
                className="font-heading flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-white transition-all hover:bg-black/80"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <p className="font-body text-sm text-black/60">Total Detections</p>
                <p className="font-heading mt-2 text-4xl text-[#013220]">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <p className="font-body text-sm text-black/60">Most Common Class</p>
                <p className="font-heading mt-2 text-2xl text-[#013220]">{stats.mostCommon}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <p className="font-body text-sm text-black/60">Avg. Confidence</p>
                <p className="font-heading mt-2 text-4xl text-[#013220]">
                  {(stats.avgConfidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Original vs Annotated Images */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <h3 className="font-heading mb-4 text-xl text-black">Original Image</h3>
                {result.original_image_base64 ? (
                  <img
                    src={`data:image/png;base64,${result.original_image_base64}`}
                    alt="Original"
                    className="mx-auto max-h-[600px] w-auto rounded-xl"
                  />
                ) : (
                  <p className="text-center text-black/40 font-body">Original image not available</p>
                )}
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <h3 className="font-heading mb-4 text-xl text-black">Detected Mushrooms</h3>
                <img
                  src={`data:image/png;base64,${result.annotated_image_base64}`}
                  alt="Detection results"
                  className="mx-auto max-h-[600px] w-auto rounded-xl"
                />
              </div>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Class Distribution */}
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <h3 className="font-heading mb-4 text-xl text-black">Class Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classCounts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#F5F0E6', border: '1px solid #00000020' }}
                        labelStyle={{ color: '#000' }}
                      />
                      <Bar dataKey="count" fill="#013220" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Confidence Distribution */}
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <h3 className="font-heading mb-4 text-xl text-black">Confidence Scores</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={confidenceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                      <XAxis 
                        type="number" 
                        dataKey="id" 
                        name="Detection" 
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Detection #', position: 'bottom', offset: 0 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="confidence" 
                        name="Confidence %" 
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Confidence %', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg bg-[#F5F0E6] p-3 border border-black/10">
                                <p className="font-body text-sm">{payload[0].payload.label}</p>
                                <p className="font-heading text-[#013220]">
                                  {payload[0].value?.toFixed(1)}%
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter dataKey="confidence" fill="#013220" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <h3 className="font-heading mb-4 text-xl text-black">Detection Breakdown</h3>
              <div className="mx-auto h-64 max-w-md">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={classCounts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {classCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Results Table */}
            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <h3 className="font-heading mb-4 text-xl text-black">Detection Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/10">
                      <th className="px-4 py-3 text-left font-heading text-sm text-black/60">#</th>
                      <th className="px-4 py-3 text-left font-heading text-sm text-black/60">Class</th>
                      <th className="px-4 py-3 text-left font-heading text-sm text-black/60">Confidence</th>
                      <th className="px-4 py-3 text-left font-heading text-sm text-black/60">Bounding Box</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.detections.map((detection, index) => (
                      <tr key={index} className="border-b border-black/5 last:border-0">
                        <td className="px-4 py-3 font-body text-black">{index + 1}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#013220]/10 px-3 py-1 font-body text-sm text-[#013220]">
                            {detection.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-body text-black">
                          {(detection.confidence * 100).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-black/60">
                          [{detection.bbox.map((n) => Math.round(n)).join(', ')}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
