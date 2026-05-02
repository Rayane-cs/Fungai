import { useRef } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import logo from "../assets/logo.webp";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

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
  detections?: Detection[];
  original_image_base64?: string;
  annotated_image_base64?: string;
  original_image?: string;
  annotated_image?: string;
  total_detections?: number;
  detection_count?: number;
}

interface ScanReportProps {
  result: ScanResult;
  userName?: string;
}

const DISEASE_INFO: Record<string, string> = {
  "Powdery Mildew": "A common fungal disease appearing as white powdery spots on leaves and stems. It thrives in warm, dry conditions and can spread rapidly.",
  "Leaf Rust": "Produces orange-brown pustules on leaf undersides. Spreads via wind and can defoliate plants in severe cases.",
  "Puccinia": "Rust fungus causing yellow-orange pustules on leaves. Reduces photosynthesis and plant vigor. Highly contagious in humid conditions.",
  "Black Spot": "Causes black circular spots on leaves with yellow halos. Common in roses and humid conditions.",
  "Downy Mildew": "Appears as yellow spots on upper leaf surfaces with gray fuzz underneath. Favors cool, wet conditions.",
  "Anthracnose": "Causes sunken lesions on leaves, stems, and fruit. Spreads in warm, wet weather.",
  "Botrytis": "Gray mold that affects flowers and fruit. Spreads rapidly in cool, humid conditions.",
  "Fusarium": "Soil-borne fungus causing wilting and yellowing. Can persist in soil for years.",
  "Alternaria": "Causes dark brown to black spots with concentric rings. Often called early blight. Thrives in warm, humid conditions.",
  "Pythium": "Causes root rot and damping-off. Common in overwatered or poorly drained soils.",
};

const TREATMENTS: Record<string, string[]> = {
  "Powdery Mildew": [
    "Remove and destroy infected plant parts.",
    "Apply sulfur-based or neem oil fungicide.",
    "Ensure proper air circulation between plants.",
    "Water at the base, avoid wetting leaves.",
  ],
  "Leaf Rust": [
    "Remove infected leaves immediately.",
    "Apply copper-based fungicide weekly.",
    "Avoid overhead irrigation.",
    "Space plants for better airflow.",
  ],
  "Puccinia": [
    "Remove and destroy infected plant material.",
    "Apply fungicide with active ingredients mancozeb or propiconazole.",
    "Increase plant spacing to reduce humidity.",
    "Rotate crops if growing in agricultural settings.",
  ],
  "Black Spot": [
    "Prune infected canes and remove fallen leaves.",
    "Apply fungicide containing chlorothalonil.",
    "Water early in the day to allow drying.",
    "Plant resistant varieties when possible.",
  ],
  "Fusarium": [
    "Remove and destroy infected plants completely.",
    "Sterilize soil or use fresh sterile potting mix.",
    "Apply soil fungicide containing thiophanate-methyl.",
    "Ensure proper drainage to prevent waterlogging.",
  ],
  "Alternaria": [
    "Remove and destroy infected leaves and stems.",
    "Apply copper-based or mancozeb fungicide.",
    "Mulch around plants to prevent soil splash.",
    "Rotate crops and practice good field sanitation.",
  ],
  default: [
    "Isolate infected plants to prevent spread.",
    "Remove severely infected leaves (sterilize tools after each cut).",
    "Apply appropriate fungicide or organic treatment.",
    "Improve air circulation around plants.",
    "Monitor daily for 7-14 days.",
  ],
};

export function ScanReport({ result, userName }: ScanReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const rid = result.id || "unknown";
  const detections = result.detections || [];
  const total = result.total_detections ?? result.detection_count ?? detections.length;
  function toDataUrl(val: string | undefined): string | undefined {
    if (!val) return undefined;
    if (val.startsWith("data:")) return val;
    if (val.startsWith("http://") || val.startsWith("https://")) return val;
    // Backend returns raw base64 JPEG images (they start with /9j/ which would
    // match startsWith("/") — so we do NOT treat /-prefixed strings as paths here)
    return `data:image/jpeg;base64,${val}`;
  }
  const origImg = toDataUrl(result.original_image_base64 || result.original_image);
  const annImg = toDataUrl(result.annotated_image_base64 || result.annotated_image);
  const avgConf = total > 0
    ? detections.reduce((s, d) => s + d.confidence, 0) / total
    : 0;
  const mostCommon = total > 0
    ? Object.entries(
        detections.reduce((acc, d) => {
          acc[d.label] = (acc[d.label] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1])[0][0]
    : "None";

  const status = total === 0 ? "HEALTHY" : "INFECTED";
  const statusColor = total === 0 ? "text-emerald-600" : "text-amber-500";

  // Class distribution for chart
  const classFreq = Object.entries(
    detections.reduce((acc, d) => {
      acc[d.label] = (acc[d.label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([label, value]) => ({ label, value }));

  // Confidence data - ALL detections
  const confData = detections.map((d, i) => ({
    label: `#${i + 1}`,
    value: Math.round(d.confidence * 100),
    color: d.confidence > 0.8 ? "#dc2626" : d.confidence > 0.5 ? "#f59e0b" : "#059669",
  }));
  return (
    <div
      ref={reportRef}
      className="bg-white w-[210mm] min-h-[1188mm] mx-auto shadow-lg"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Inject Ciguatera font */}
      <style>{`
        @font-face {
          font-family: 'Ciguatera';
          src: url('/fonts/ciguatera.otf') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `}</style>

      {/* === Page 1 === */}
      <div className="h-[297mm] p-[20mm] relative overflow-hidden">
        {/* Green Header */}
        <div className="bg-[#E8F5E9] -mx-[20mm] -mt-[20mm] px-[20mm] pt-[20mm] pb-[20mm]">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img 
              src={logo} 
              alt="FUNGAI Logo" 
              className="w-[20mm] h-[20mm] object-contain"
            />
          </div>

          {/* FUNGAI Title - Balanced with 20mm logo */}
          <h1 
            className="text-center text-[#013220] text-[48px] tracking-wider"
            style={{ fontFamily: "'Ciguatera', serif", lineHeight: 1.2 }}
          >
            FUNGAI
          </h1>

          {/* Subtitle */}
          <p className="text-center text-[#2d6a4f] text-sm mt-1">
            AI-Powered Fungal Disease Detection & Analysis
          </p>
        </div>

        {/* Report Title */}
        <div className="text-center mt-6">
          <h2 className="text-[#013220] text-[18px] font-bold uppercase">
            Plant Health Analysis Report
          </h2>
          <div className="w-[90mm] h-[1px] bg-[#013220] mx-auto mt-1" />
        </div>

        {/* Metadata */}
        <div className="mt-8 space-y-2 text-sm">
          <div className="flex">
            <span className="font-bold text-[#1a1a1a] w-[45mm]">Report ID:</span>
            <span className="text-[#1a1a1a]">{rid.slice(0, 12)}</span>
          </div>
          <div className="flex">
            <span className="font-bold text-[#1a1a1a] w-[45mm]">Scan Date:</span>
            <span className="text-[#1a1a1a]">{new Date(result.timestamp).toLocaleString("en-GB")}</span>
          </div>
          <div className="flex">
            <span className="font-bold text-[#1a1a1a] w-[45mm]">User:</span>
            <span className="text-[#1a1a1a]">{userName || "Guest"}</span>
          </div>
          <div className="flex">
            <span className="font-bold text-[#1a1a1a] w-[45mm]">Filename:</span>
            <span className="text-[#1a1a1a]">{result.filename || "-"}</span>
          </div>
        </div>

        {/* QUICK SUMMARY Box */}
        <div className="mt-6 bg-[#E8F5E9] border border-[#013220] rounded-lg p-4">
          <h3 className="text-[#013220] font-bold text-sm mb-4">QUICK SUMMARY</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Overall Status</p>
              <p className={`font-bold ${statusColor}`}>{status}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Total Detections</p>
              <p className="font-bold text-[#1a1a1a]">{total}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Confidence</p>
              <p className="font-bold text-[#1a1a1a]">{(avgConf * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Primary Threat</p>
              <p className="font-bold text-[#1a1a1a]">{mostCommon}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-[20mm] left-[20mm] right-[20mm]">
          <div className="border-t border-gray-200 pt-2">
            <p className="text-xs text-gray-500">
              FungAI 2026 | Report ID: {rid.slice(0, 12)} | Page 1 of 4
            </p>
          </div>
        </div>
      </div>

      {/* === Page 2 === */}
      <div className="h-[297mm] p-[20mm] relative border-t border-gray-200 overflow-hidden">
        {/* Visual Analysis */}
        <h3 className="text-[#013220] font-bold text-[20px] mb-1">Visual Analysis</h3>
        <div className="w-[90mm] h-[3px] bg-[#013220] mb-4" />

        <div className="flex gap-4 mb-1">
          {origImg && (
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">Original</p>
              <img
                src={origImg}
                alt="Original"
                className="w-full h-[65mm] object-contain bg-gray-50"
              />
            </div>
          )}
          {annImg && (
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">AI Annotated</p>
              <img
                src={annImg}
                alt="Annotated"
                className="w-full h-[65mm] object-contain bg-gray-50"
              />
            </div>
          )}
        </div>
        <p className="text-[10px] text-gray-500 mb-3">Fig 1: Original (left) vs AI overlay (right)</p>

        {/* Legend */}
        <div className="mb-5">
          <p className="text-sm font-bold text-[#013220] mb-2">Legend</p>
          <div className="flex flex-col gap-1 text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#013220]" />
              <span>Detected infection area</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#dc2626]" />
              <span>High severity (&gt;80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#f59e0b]" />
              <span>Medium severity (50-80%)</span>
            </div>
          </div>
        </div>

        {/* Detection Results */}
        <h3 className="text-[#013220] font-bold text-[20px] mb-1">Detection Results</h3>
        <div className="w-[90mm] h-[3px] bg-[#013220] mb-4" />

        {detections.length > 0 && (
          <>
            {/* Class Distribution - Chart.js Pie */}
            <div className="flex gap-3 mb-3 items-start">
              <div className="w-[80mm]">
                <p className="text-[13px] font-bold text-[#013220] mb-2">Class Distribution</p>
                <div className="h-[140px] w-full">
                  <Pie
                    data={{
                      labels: classFreq.map(item => item.label),
                      datasets: [{
                        data: classFreq.map(item => item.value),
                        backgroundColor: ['#059669', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#6366f1'],
                        borderColor: '#ffffff',
                        borderWidth: 2
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            boxWidth: 12,
                            padding: 8,
                            font: { size: 9 },
                            generateLabels: (chart) => {
                              const data = chart.data;
                              if (data.labels && data.datasets.length) {
                                const total = (data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
                                return data.labels.map((label, i) => {
                                  const val = (data.datasets[0].data as number[])[i];
                                  const bg = (data.datasets[0].backgroundColor as string[])[i];
                                  return {
                                    text: `${label}: ${val} (${Math.round((val / total) * 100)}%)`,
                                    fillStyle: bg,
                                    strokeStyle: bg,
                                    lineWidth: 0,
                                    index: i,
                                    hidden: false
                                  };
                                });
                              }
                              return [];
                            }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const pct = Math.round((context.raw as number / total) * 100);
                              return ` ${context.label}: ${context.raw} detections (${pct}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex-1 pt-5">
                <p className="text-[9px] text-gray-500 leading-relaxed">
                  <strong className="text-gray-700">{mostCommon}</strong> is the most detected disease with{" "}
                  <strong className="text-gray-700">{detections.filter((d) => d.label === mostCommon).length}</strong> occurrence(s).
                </p>
              </div>
            </div>

            {/* Confidence Scores - Chart.js Bar */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1 flex items-center">
                <p className="text-[10px] text-gray-600 leading-tight">
                  Higher percentages indicate stronger AI confidence. Red bars (80%+) are high confidence detections.
                </p>
              </div>
              <div className="w-[95mm]">
                <p className="text-xs font-bold text-[#013220] mb-2">Confidence Scores</p>
                <div className="h-[140px]">
                  <Bar
                    data={{
                      labels: confData.map(d => d.label),
                      datasets: [{
                        label: 'Confidence',
                        data: confData.map(d => d.value),
                        backgroundColor: confData.map(d => d.color + 'cc'),
                        borderColor: confData.map(d => d.color),
                        borderWidth: 1,
                        borderRadius: 2
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(0,0,0,0.85)',
                          titleFont: { size: 11 },
                          bodyFont: { size: 12, weight: 'bold' },
                          callbacks: {
                            label: (context) => ` Confidence: ${context.raw}%`
                          }
                        }
                      },
                      scales: {
                        y: {
                          min: 0,
                          max: 100,
                          title: {
                            display: true,
                            text: 'Confidence %',
                            font: { size: 10, weight: 'bold' },
                            color: '#6b7280'
                          },
                          ticks: {
                            stepSize: 20,
                            callback: (value) => `${value}%`,
                            font: { size: 9, weight: 'bold' },
                            color: '#374151',
                            autoSkip: false,
                            maxTicksLimit: 6
                          },
                          grid: {
                            color: '#e5e7eb'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Detection #',
                            font: { size: 10, weight: 'bold' },
                            color: '#6b7280'
                          },
                          ticks: {
                            font: { size: 9, weight: 'bold' },
                            color: '#374151',
                            maxRotation: 90,
                            minRotation: 45
                          },
                          grid: { display: false }
                        }
                      }
                    }}
                    plugins={[{
                      id: 'barLabels',
                      afterDatasetsDraw(chart) {
                        const { ctx } = chart;
                        ctx.save();
                        ctx.font = 'bold 8px system-ui, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        chart.data.datasets.forEach((dataset, i) => {
                          const meta = chart.getDatasetMeta(i);
                          meta.data.forEach((bar, index) => {
                            const val = dataset.data[index] as number;
                            ctx.fillStyle = '#1f2937';
                            ctx.fillText(`${val}%`, bar.x, bar.y - 2);
                          });
                        });
                        ctx.restore();
                      }
                    }]}
                  />
                </div>
                {/* Threat level legend */}
                <div className="flex items-center gap-3 mt-2 text-[9px] text-gray-600">
                  <span className="font-bold text-gray-700">Threat:</span>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#dc2626' }} />
                    <span>High {'>'}80%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
                    <span>Med 50-80%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#059669' }} />
                    <span>Low {'<'}50%</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="absolute bottom-[20mm] left-[20mm] right-[20mm]">
          <div className="border-t border-gray-200 pt-2">
            <p className="text-xs text-gray-500">
              FungAI 2026 | Report ID: {rid.slice(0, 12)} | Page 2 of 4
            </p>
          </div>
        </div>
      </div>

      {/* === Page 3 === */}
      <div className="h-[297mm] p-[20mm] pb-[35mm] relative border-t border-gray-200 overflow-hidden">
        {/* Detection Details Table */}
        <h3 className="text-[#013220] font-bold text-[18px] mb-1">Detection Details</h3>
        <div className="w-[90mm] h-[2px] bg-[#013220] mb-3" />
        <table className="w-full text-xs mb-4">
          <thead>
            <tr className="bg-[#013220] text-white">
              <th className="p-1 text-left">#</th>
              <th className="p-1 text-left">Class</th>
              <th className="p-1 text-left">Conf</th>
              <th className="p-1 text-left">BBox</th>
            </tr>
          </thead>
          <tbody>
            {detections.map((d, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-[#f8faf9]" : ""}>
                <td className={`${detections.length > 10 ? 'p-0.5 text-[10px]' : 'p-1'}`}>{i + 1}</td>
                <td className={`${detections.length > 10 ? 'p-0.5 text-[10px]' : 'p-1'} ${d.label.length > 12 ? 'text-[10px]' : ''}`}>{d.label.length > 16 ? d.label.slice(0, 14) + "..." : d.label}</td>
                <td className={`${detections.length > 10 ? 'p-0.5 text-[10px]' : 'p-1'}`}>{(d.confidence * 100).toFixed(0)}%</td>
                <td className={`${detections.length > 10 ? 'p-0.5 text-[10px]' : 'p-1'}`}>[{d.bbox.map((n) => Math.round(n)).join(",")}]</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Disease Profiles - Show ALL unique diseases */}
        <h3 className="text-[#013220] font-bold text-[18px] mb-1">Disease Profiles & Treatment</h3>
        <div className="w-[90mm] h-[2px] bg-[#013220] mb-3" />
        {[...new Set(detections.map((d) => d.label))].map((name, i) => (
          <div key={i} className="mb-2">
            <p className="text-sm font-bold text-[#013220]">{name}</p>
            <p className="text-xs text-gray-600 mt-0.5 leading-snug">
              {DISEASE_INFO[name] || "A fungal disease affecting plant foliage. Early detection and treatment are recommended."}
            </p>
            <p className="text-xs font-bold text-[#013220] mt-1">Actions:</p>
            <ol className="text-xs text-gray-600 list-decimal ml-4 mt-0.5 space-y-0">
              {(TREATMENTS[name] || TREATMENTS.default).slice(0, 2).map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ol>
          </div>
        ))}

        {/* Glossary - Compact */}
        <h3 className="text-[#013220] font-bold text-[18px] mb-1">Glossary</h3>
        <div className="w-[90mm] h-[2px] bg-[#013220] mb-2" />
        <div className="text-xs text-gray-600 leading-snug mb-3">
          <strong>Confidence:</strong> Probability (0-100%) of correct identification. <strong>BBox:</strong> Coordinates marking infection area. <strong>Pathogen:</strong> Disease-causing organism.
        </div>

        {/* References - Compact */}
        <h3 className="text-[#013220] font-bold text-[18px] mb-1">References</h3>
        <div className="w-[90mm] h-[2px] bg-[#013220] mb-2" />
        <div className="text-xs text-gray-600 leading-snug">
          - YOLO: Real-Time Object Detection - Redmon et al.
        </div>

        {/* Footer */}
        <div className="absolute bottom-[20mm] left-[20mm] right-[20mm]">
          <div className="border-t border-gray-200 pt-2">
            <p className="text-xs text-gray-500">
              FungAI 2026 | Report ID: {rid.slice(0, 12)} | Page 3 of 4
            </p>
          </div>
        </div>
      </div>

      {/* === Page 4 - Disclaimer Warning (FIXED CONTENT) === */}
      <div className="h-[297mm] p-[20mm] relative border-t border-gray-200 flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-50 border-4 border-red-600 rounded-2xl px-10 py-12 max-w-[140mm] w-full shadow-lg">
            <div className="text-center mb-6">
              <h3 className="text-red-800 font-bold text-2xl mb-2 tracking-wide">WARNING</h3>
              <div className="w-24 h-1.5 bg-red-600 mx-auto rounded-full" />
            </div>
            <div className="text-center space-y-4">
              <p className="text-base text-red-900 leading-relaxed font-medium">
                This AI-generated report is for <strong className="text-red-700">informational purposes only</strong>.
              </p>
              <p className="text-sm text-red-800 leading-relaxed">
                Always consult a certified agronomist or plant pathologist before treatment. FungAI does not guarantee 100% accuracy. Do not rely solely on this report for agricultural or medical decisions.
              </p>
              <div className="pt-4 border-t border-red-200 mt-4">
                <p className="text-xs text-red-700 uppercase tracking-wider font-semibold">
                  FungAI 2026 | Page 4 of 4
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export PDF generator for backward compatibility
export { generateScanPDFFromComponent } from "../utils/generatePDF";

export default ScanReport;
