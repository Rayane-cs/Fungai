import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { LoadingSpinner } from "../components/Skeleton";
import { Link, useNavigate } from "react-router-dom";
import { generateScanPDFFromComponent } from "../utils/generatePDF";

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

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

const COLORS = ["#013220", "#45FFB3", "#1a3d2e", "#2d5a4a", "#3d7a5a", "#4d9a6a"];

export default function Scan() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();

  // Attach stream to video element after it mounts
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("user")) {
      setShowAuthModal(true);
    }
  }, []);

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
    // Stop camera if active so we don't have two sources
    if (cameraActive) stopCamera();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const enumerateDevices = async () => {
    try {
      // Request permission first so labels are available
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch {
      // ignore enumeration errors
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      await enumerateDevices();

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraActive(true);
      setError(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setResult(null);
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(
        "Could not access camera. Please allow camera permissions and ensure no other app is using it."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureFromCamera = (): File | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraActive) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const byteString = atob(dataUrl.split(",")[1]);
    const mime = dataUrl.split(",")[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new File([ab], `microscope-capture-${Date.now()}.jpg`, { type: mime });
  };

  const handleScan = async () => {
    let file = selectedFile;
    if (cameraActive) {
      const captured = captureFromCamera();
      if (!captured) {
        setError("Failed to capture image from camera.");
        return;
      }
      file = captured;
      setSelectedFile(captured);
      setPreviewUrl(URL.createObjectURL(captured));
    }

    if (!file) {
      setError("Please select an image or start the camera first");
      return;
    }

    setIsScanning(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const userStr = localStorage.getItem("user");
      const userId = userStr ? JSON.parse(userStr).id : (localStorage.getItem("user_id") || "anonymous");

      const response = await fetch(`${API_URL}/api/detect`, {
        method: "POST",
        body: formData,
        headers: {
          "X-User-ID": userId,
        },
      });

      if (!response.ok) {
        throw new Error(`Scan failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      
      // Save to localStorage for debug page
      localStorage.setItem("last_scan_result", JSON.stringify(data));
      
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

  const showPDF = async () => {
    if (!result) return;
    try {
      const userStr = localStorage.getItem("user");
      const userName = userStr ? JSON.parse(userStr).username : undefined;
      const pdfBytes = await generateScanPDFFromComponent(result, userName, false);
      // Create blob and open in new tab
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const downloadPDF = async () => {
    if (!result) return;
    try {
      const userStr = localStorage.getItem("user");
      const userName = userStr ? JSON.parse(userStr).username : undefined;
      await generateScanPDFFromComponent(result, userName, true);
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
    <div className="min-h-screen bg-[#F5F0E6] pb-20 pt-20">
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
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Upload dropzone */}
            <div className="flex-1">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-3xl border-2 border-dashed p-12 text-center transition-all h-full flex flex-col items-center justify-center ${
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
            </div>

            {/* Microscope Camera Feed */}
            <div className="flex-1">
              <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-3 gap-3">
                  <p className="font-body text-sm text-black/60">
                    Microscope Camera
                  </p>
                  <div className="flex items-center gap-2">
                    {videoDevices.length > 1 && (
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => {
                          setSelectedDeviceId(e.target.value);
                          if (cameraActive) {
                            stopCamera();
                            setTimeout(() => startCamera(), 200);
                          }
                        }}
                        className="font-body text-xs rounded-lg border border-black/10 bg-[#F5F0E6] px-2 py-1.5 text-black/70 outline-none focus:border-[#013220]"
                      >
                        {videoDevices.map((d) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Camera ${videoDevices.indexOf(d) + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cameraActive ? stopCamera() : startCamera();
                      }}
                      className={`font-heading text-xs px-3 py-1.5 rounded-lg transition-all ${
                        cameraActive
                          ? "bg-red-100 text-red-600 hover:bg-red-200"
                          : "bg-[#013220]/10 text-[#013220] hover:bg-[#013220]/20"
                      }`}
                    >
                      {cameraActive ? "Stop Camera" : "Start Camera"}
                    </button>
                  </div>
                </div>

                <div className="relative flex items-center justify-center bg-[#F5F0E6] rounded-xl overflow-hidden h-[320px]">
                  {cameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-contain rounded-xl"
                    />
                  ) : previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#013220]/10">
                        <svg
                          className="h-8 w-8 text-[#013220]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <p className="font-body text-sm text-black/40">
                        Click "Start Camera" to begin live preview
                      </p>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <p className="mt-2 text-xs text-red-500">{cameraError}</p>
                )}
              </div>
            </div>
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

          {(previewUrl || cameraActive) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <div className="flex gap-4">
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
                      {cameraActive ? "Capture & Scan" : "Scan Image"}
                    </>
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setResult(null);
                    if (cameraActive) stopCamera();
                  }}
                  disabled={isScanning}
                  className="font-heading rounded-xl border-2 border-black/20 px-6 py-4 text-black transition-all hover:bg-black/5"
                >
                  Clear
                </button>
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
              
              <div className="flex gap-2">
                <button
                  onClick={showPDF}
                  className="font-heading flex items-center gap-2 rounded-xl border-2 border-black px-4 py-3 text-black transition-all hover:bg-black/5"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Show PDF
                </button>
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
                    src={`data:image/jpeg;base64,${result.original_image_base64}`}
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
                  src={`data:image/jpeg;base64,${result.annotated_image_base64}`}
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
                                  {typeof payload[0].value === "number" ? payload[0].value.toFixed(1) : payload[0].value}%
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
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {classCounts.map((_entry, index) => (
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

      {/* Auth Required Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-black/10 bg-[#F5F0E6] p-8 shadow-2xl text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#013220]/10">
                <svg className="h-8 w-8 text-[#013220]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-heading text-2xl text-black mb-2">Account Required</h3>
              <p className="font-body text-black/60 mb-6">
                You need an account to use the scan feature and save your results.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/login"
                  onClick={() => setShowAuthModal(false)}
                  className="font-heading block w-full rounded-xl bg-[#013220] py-3 text-white transition-all hover:bg-[#1a3d2e]"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setShowAuthModal(false)}
                  className="font-heading block w-full rounded-xl border-2 border-[#013220] py-3 text-[#013220] transition-all hover:bg-[#013220]/5"
                >
                  Create New Account
                </Link>
                <button
                  onClick={() => navigate("/")}
                  className="font-body text-sm text-black/50 transition-colors hover:text-black"
                >
                  Go Home
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
