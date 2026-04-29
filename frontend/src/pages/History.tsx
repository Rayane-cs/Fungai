import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { LoadingSpinner, PageLoader } from "../components/Skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, PieChart, Pie, Cell
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Detection {
  label: string;
  confidence: number;
  bbox: number[];
  class_id: number;
}

interface ScanItem {
  id: string;
  timestamp: string;
  filename: string;
  detection_count: number;
  original_image?: string;
  annotated_image?: string;
  detections?: Detection[];
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COLORS = ["#013220", "#45FFB3", "#1a3d2e", "#2d5a4a", "#3d7a5a", "#4d9a6a"];

// Modal Component for viewing scan details
function ScanModal({ scan, onClose }: { scan: ScanItem; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Calculate stats
  const total = scan.detection_count;
  const avgConfidence = scan.detections && scan.detections.length > 0
    ? scan.detections.reduce((sum, d) => sum + d.confidence, 0) / total
    : 0;
  const mostCommon = scan.detections && scan.detections.length > 0
    ? Object.entries(
        scan.detections.reduce((acc, d) => {
          acc[d.label] = (acc[d.label] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"
    : "-";

  // Chart data
  const classCounts = scan.detections
    ? Object.entries(
        scan.detections.reduce((acc, d) => {
          acc[d.label] = (acc[d.label] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ name, count }))
    : [];

  const confidenceData = scan.detections?.map((d, i) => ({
    id: i,
    confidence: d.confidence * 100,
    label: d.label,
  })) || [];

  // PDF download
  const downloadPDF = async () => {
    if (!modalRef.current) return;
    try {
      const canvas = await html2canvas(modalRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#F5F0E6",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`fungai-scan-${scan.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-black/10 bg-[#F5F0E6] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-3xl text-black">Scan Results</h2>
            <p className="font-body text-black/60">
              {new Date(scan.timestamp).toLocaleString()} • {scan.filename}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-black/50 transition-all hover:bg-black/10 hover:text-black"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
            <p className="font-body text-sm text-black/60">Total Detections</p>
            <p className="font-heading mt-2 text-4xl text-[#013220]">{total}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
            <p className="font-body text-sm text-black/60">Most Common</p>
            <p className="font-heading mt-2 text-xl text-[#013220] truncate">{mostCommon}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
            <p className="font-body text-sm text-black/60">Avg. Confidence</p>
            <p className="font-heading mt-2 text-4xl text-[#013220]">
              {(avgConfidence * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Images */}
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h3 className="font-heading mb-4 text-xl text-black">Original Image</h3>
            {scan.original_image ? (
              <img
                src={`data:image/png;base64,${scan.original_image}`}
                alt="Original"
                className="w-full h-auto rounded-xl"
              />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl bg-black/5">
                <span className="font-body text-black/40">No image</span>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h3 className="font-heading mb-4 text-xl text-black">Detected Mushrooms</h3>
            {scan.annotated_image ? (
              <img
                src={`data:image/png;base64,${scan.annotated_image}`}
                alt="Annotated"
                className="w-full h-auto rounded-xl"
              />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl bg-black/5">
                <span className="font-body text-black/40">No annotated image</span>
              </div>
            )}
          </div>
        </div>

        {/* Charts */}
        {classCounts.length > 0 && (
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
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
            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <h3 className="font-heading mb-4 text-xl text-black">Confidence Scores</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={confidenceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                    <XAxis type="number" dataKey="id" tick={{ fontSize: 12 }} />
                    <YAxis type="number" dataKey="confidence" domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg bg-[#F5F0E6] p-3 border border-black/10">
                              <p className="font-body text-sm">{payload[0].payload.label}</p>
                              <p className="font-heading text-[#013220]">{typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : payload[0].value}%</p>
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
        )}

        {/* Pie Chart */}
        {classCounts.length > 0 && (
          <div className="mb-6 rounded-2xl border border-black/10 bg-white p-6">
            <h3 className="font-heading mb-4 text-xl text-black text-center">Detection Breakdown</h3>
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
        )}

        {/* Detection Details Table */}
        {scan.detections && scan.detections.length > 0 && (
          <div className="mb-6 rounded-2xl border border-black/10 bg-white p-6">
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
                  {scan.detections.map((detection, index) => (
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
        )}

        {/* PDF Download Button */}
        <div className="flex justify-center">
          <button
            onClick={downloadPDF}
            className="font-heading flex items-center gap-2 rounded-xl bg-black px-8 py-4 text-white transition-all hover:bg-black/80"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function History() {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedScan, setSelectedScan] = useState<ScanItem | null>(null);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/history`, {
        headers: {
          "X-User-ID": localStorage.getItem("user_id") || "anonymous",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      setScans(data.scans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scan?")) return;

    setDeletingId(id);
    try {
      const response = await fetch(`${API_URL}/api/history/${id}`, {
        method: "DELETE",
        headers: {
          "X-User-ID": localStorage.getItem("user_id") || "anonymous",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete scan");
      }

      setScans(scans.filter((scan) => scan.id !== id));
    } catch (err) {
      alert("Failed to delete scan. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] pb-20 pt-20">
      {/* Header */}
      <div className="border-b border-black/10 bg-white/50 px-6 py-8 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-4xl text-black md:text-5xl">
                Scan <span className="text-[#013220]">History</span>
              </h1>
              <p className="font-body mt-2 text-black/60">
                View and manage your past scans
              </p>
            </div>
            <Link
              to="/scan"
              className="font-heading rounded-xl bg-[#013220] px-6 py-3 text-white transition-all hover:bg-[#1a3d2e]"
            >
              New Scan
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 rounded-xl bg-red-50 p-4 text-red-600"
          >
            {error}
          </motion.div>
        )}

        {scans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-black/10 bg-white p-12 text-center"
          >
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-black/5">
              <svg
                className="h-10 w-10 text-black/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-heading text-xl text-black">No scans yet</h3>
            <p className="font-body mt-2 text-black/60">
              Start by scanning your first image
            </p>
            <Link
              to="/scan"
              className="font-heading mt-6 inline-block rounded-xl bg-[#013220] px-6 py-3 text-white transition-all hover:bg-[#1a3d2e]"
            >
              Start Scanning
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {scans.map((scan, index) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition-all hover:shadow-xl"
              >
                {/* Image Container - Fixed aspect ratio */}
                <div className="relative aspect-[4/3] bg-[#F5F0E6] overflow-hidden">
                  {scan.original_image ? (
                    <img
                      src={`data:image/png;base64,${scan.original_image}`}
                      alt={scan.filename}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg className="h-12 w-12 text-black/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Detection count badge */}
                  <div className="absolute left-3 top-3 rounded-full bg-[#013220] px-3 py-1.5 shadow-md">
                    <span className="font-body text-xs font-semibold text-white">
                      {scan.detection_count} detection{scan.detection_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex flex-1 flex-col p-5">
                  {/* Filename */}
                  <h3 className="font-heading line-clamp-1 text-lg text-black" title={scan.filename}>
                    {scan.filename}
                  </h3>
                  
                  {/* Date */}
                  <p className="font-body mt-1 text-sm text-black/50">
                    {formatDate(scan.timestamp)}
                  </p>

                  {/* Actions */}
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setSelectedScan(scan)}
                      className="font-heading flex-1 rounded-xl bg-[#013220] py-3 text-center text-sm font-medium text-white transition-all hover:bg-[#1a3d2e] hover:scale-[1.02] active:scale-[0.98]"
                    >
                      View Results
                    </button>
                    <button
                      onClick={() => handleDelete(scan.id)}
                      disabled={deletingId === scan.id}
                      className="flex items-center justify-center rounded-xl border border-red-200 px-4 text-red-500 transition-all hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
                      title="Delete scan"
                    >
                      {deletingId === scan.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedScan && (
          <ScanModal
            scan={selectedScan}
            onClose={() => setSelectedScan(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
