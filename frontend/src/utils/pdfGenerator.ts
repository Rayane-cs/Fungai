import jsPDF from "jspdf";

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

function hexRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}
function setFill(pdf: jsPDF, hex: string) {
  const [r, g, b] = hexRgb(hex);
  pdf.setFillColor(r, g, b);
}
function setText(pdf: jsPDF, hex: string) {
  const [r, g, b] = hexRgb(hex);
  pdf.setTextColor(r, g, b);
}
function setDraw(pdf: jsPDF, hex: string) {
  const [r, g, b] = hexRgb(hex);
  pdf.setDrawColor(r, g, b);
}

function footer(pdf: jsPDF, rid: string, page: number, total: number) {
  const h = pdf.internal.pageSize.getHeight();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  setText(pdf, "#6C757D");
  pdf.text(`FungAI 2024 | Report ID: ${rid.slice(0, 12)} | Page ${page} of ${total}`, 20, h - 10);
  setDraw(pdf, "#00000010");
  pdf.setLineWidth(0.3);
  pdf.line(20, h - 14, 190, h - 14);
}

function severityColor(conf: number) {
  if (conf > 0.8) return "#DC3545";
  if (conf > 0.5) return "#FFC107";
  return "#28A745";
}
function severityLabel(conf: number) {
  if (conf > 0.8) return "HIGH";
  if (conf > 0.5) return "MEDIUM";
  return "LOW";
}

const DISEASE_INFO: Record<string, string> = {
  "Powdery Mildew": "A common fungal disease appearing as white powdery spots on leaves and stems. It thrives in warm, dry conditions and can spread rapidly.",
  "Leaf Rust": "Produces orange-brown pustules on leaf undersides. Spreads via wind and can defoliate plants in severe cases.",
};

const TREATMENTS: Record<string, string[]> = {
  default: [
    "Isolate infected plants to prevent spread.",
    "Remove severely infected leaves (sterilize tools after each cut).",
    "Apply appropriate fungicide or organic treatment.",
    "Improve air circulation around plants.",
    "Monitor daily for 7-14 days.",
  ],
};

export async function generateScanPDF(
  result: ScanResult,
  userName?: string
) {
  const pdf = new jsPDF("p", "mm", "a4");
  const w = 210;
  const rid = result.id || "unknown";
  const detections = result.detections || [];
  const total = result.total_detections ?? result.detection_count ?? detections.length;
  const origImg = result.original_image_base64 || result.original_image;
  const annImg = result.annotated_image_base64 || result.annotated_image;
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

  // --- Page 1: Cover ---
  setFill(pdf, "#E8F5E9");
  pdf.rect(0, 0, w, 80, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  setText(pdf, "#013220");
  pdf.text("FUNGAI", w / 2, 45, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  setText(pdf, "#6C757D");
  pdf.text("AI-Powered Fungal Disease Detection & Analysis", w / 2, 55, { align: "center" });

  pdf.setFontSize(22);
  setText(pdf, "#013220");
  pdf.text("PLANT HEALTH ANALYSIS REPORT", w / 2, 100, { align: "center" });
  setDraw(pdf, "#013220");
  pdf.setLineWidth(1);
  pdf.line(60, 108, w - 60, 108);

  // Metadata table
  const meta = [
    ["Report ID", rid.slice(0, 12)],
    ["Scan Date & Time", new Date(result.timestamp).toLocaleString("en-GB")],
    ["User", userName || "Guest"],
    ["Filename", result.filename || "-"],
    ["Report Generated", new Date().toLocaleString("en-GB")],
  ];
  let y = 120;
  pdf.setFontSize(11);
  meta.forEach(([label, value]) => {
    setText(pdf, "#212529");
    pdf.setFont("helvetica", "bold");
    pdf.text(`${label}:`, 25, y);
    pdf.setFont("helvetica", "normal");
    setText(pdf, "#6C757D");
    pdf.text(String(value), 80, y);
    y += 8;
  });

  // Quick summary box
  y += 4;
  setFill(pdf, "#F8F9FA");
  pdf.roundedRect(20, y, w - 40, 40, 3, 3, "F");
  setDraw(pdf, "#013220");
  pdf.setLineWidth(0.5);
  pdf.roundedRect(20, y, w - 40, 40, 3, 3, "S");

  pdf.setFontSize(10);
  setText(pdf, "#013220");
  pdf.setFont("helvetica", "bold");
  pdf.text("QUICK SUMMARY", 25, y + 8);

  const status = total === 0 ? "HEALTHY" : "INFECTED";
  const statusColor = total === 0 ? "#28A745" : avgConf > 0.8 ? "#DC3545" : "#FFC107";
  const summaryItems = [
    ["Overall Status", status],
    ["Total Detections", `${total}`],
    ["Confidence Level", `${(avgConf * 100).toFixed(1)}%`],
    ["Primary Threat", mostCommon],
  ];
  let sx = 25;
  summaryItems.forEach(([k, v]) => {
    pdf.setFontSize(8);
    setText(pdf, "#6C757D");
    pdf.setFont("helvetica", "normal");
    pdf.text(String(k), sx, y + 18);
    pdf.setFontSize(10);
    if (k === "Overall Status") setText(pdf, statusColor);
    else setText(pdf, "#212529");
    pdf.setFont("helvetica", "bold");
    pdf.text(String(v), sx, y + 26);
    sx += 45;
  });

  footer(pdf, rid, 1, 5);

  // --- Page 2: Visual Analysis ---
  pdf.addPage();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  setText(pdf, "#013220");
  pdf.text("Visual Analysis", 20, 28);
  setDraw(pdf, "#013220");
  pdf.line(20, 32, 60, 32);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  setText(pdf, "#212529");
  pdf.text(
    "The AI model analyzed your plant image using deep learning (YOLO architecture).",
    20, 38
  );

  // Images
  const imgY = 48;
  const imgW = 82;
  const imgH = 82;
  if (origImg) {
    try {
      pdf.setFontSize(9);
      setText(pdf, "#212529");
      pdf.text("Original Image", 20, imgY - 2);
      pdf.addImage(origImg, "PNG", 20, imgY, imgW, imgH);
    } catch {}
  }
  if (annImg) {
    try {
      pdf.setFontSize(9);
      setText(pdf, "#212529");
      pdf.text("AI-Annotated Image", w / 2 + 5, imgY - 2);
      pdf.addImage(annImg, "PNG", w / 2 + 5, imgY, imgW, imgH);
    } catch {}
  }

  pdf.setFontSize(9);
  setText(pdf, "#6C757D");
  pdf.text("Figure 1: Original scan (left) vs AI detection overlay (right)", 20, imgY + imgH + 6);

  // Legend
  let ly = imgY + imgH + 18;
  pdf.setFontSize(10);
  setText(pdf, "#013220");
  pdf.setFont("helvetica", "bold");
  pdf.text("Detection Legend", 20, ly);
  ly += 8;
  const legend = [
    ["#013220", "Detected fungal infection area"],
    ["#FF4444", "High-severity region (>80% confidence)"],
    ["#FFA500", "Medium-severity region (50-80% confidence)"],
  ];
  legend.forEach(([color, text]) => {
    setFill(pdf, color);
    pdf.rect(20, ly - 3, 4, 4, "F");
    pdf.setFont("helvetica", "normal");
    setText(pdf, "#212529");
    pdf.setFontSize(9);
    pdf.text(text, 28, ly);
    ly += 6;
  });

  footer(pdf, rid, 2, 5);

  // --- Page 3: Detailed Detection Results ---
  pdf.addPage();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  setText(pdf, "#013220");
  pdf.text("Detailed Detection Results", 20, 28);
  setDraw(pdf, "#013220");
  pdf.line(20, 32, 90, 32);

  if (detections.length === 0) {
    pdf.setFontSize(11);
    setText(pdf, "#6C757D");
    pdf.text("No detections found. The plant appears healthy.", 20, 42);
  } else {
    // Table header
    const cols = ["#", "Disease", "Confidence", "Severity", "Bounding Box"];
    const colX = [20, 35, 85, 115, 145];
    const rowH = 8;
    let ty = 42;

    setFill(pdf, "#013220");
    pdf.rect(20, ty - 5, 170, rowH, "F");
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    setText(pdf, "#FFFFFF");
    cols.forEach((c, i) => pdf.text(c, colX[i], ty));
    ty += rowH;

    detections.forEach((d, i) => {
      if (i % 2 === 0) {
        setFill(pdf, "#F8F9FA");
        pdf.rect(20, ty - 5, 170, rowH, "F");
      }
      const sev = severityLabel(d.confidence);
      const sevC = severityColor(d.confidence);
      setText(pdf, "#212529");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(String(i + 1), colX[0], ty);
      pdf.text(d.label, colX[1], ty);
      pdf.text(`${(d.confidence * 100).toFixed(1)}%`, colX[2], ty);
      setText(pdf, sevC);
      pdf.setFont("helvetica", "bold");
      pdf.text(sev, colX[3], ty);
      setText(pdf, "#212529");
      pdf.setFont("helvetica", "normal");
      pdf.text(`(${d.bbox.map((n) => Math.round(n)).join(", ")})`, colX[4], ty);
      ty += rowH;
    });

    // Severity distribution simple bars
    ty += 8;
    pdf.setFontSize(10);
    setText(pdf, "#013220");
    pdf.setFont("helvetica", "bold");
    pdf.text("Severity Distribution", 20, ty);
    ty += 6;
    const high = detections.filter((d) => d.confidence > 0.8).length;
    const med = detections.filter((d) => d.confidence > 0.5 && d.confidence <= 0.8).length;
    const low = detections.filter((d) => d.confidence <= 0.5).length;
    const dist = [
      ["High (>80%)", high, "#DC3545"],
      ["Medium (50-80%)", med, "#FFC107"],
      ["Low (<50%)", low, "#28A745"],
    ];
    dist.forEach(([label, count, color]) => {
      const pct = total > 0 ? (Number(count) / total) * 100 : 0;
      setText(pdf, "#212529");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(String(label), 20, ty);
      setFill(pdf, String(color));
      pdf.rect(70, ty - 4, pct * 1.2, 5, "F");
      setText(pdf, "#212529");
      pdf.text(`${count} (${pct.toFixed(1)}%)`, 70 + pct * 1.2 + 3, ty);
      ty += 8;
    });
  }

  footer(pdf, rid, 3, 5);

  // --- Page 4: Disease Profiles & Treatment ---
  pdf.addPage();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  setText(pdf, "#013220");
  pdf.text("Disease Profiles & Treatment", 20, 28);
  setDraw(pdf, "#013220");
  pdf.line(20, 32, 95, 32);

  if (detections.length === 0) {
    pdf.setFontSize(11);
    setText(pdf, "#6C757D");
    pdf.text("No diseases detected.", 20, 42);
  } else {
    const unique = [...new Set(detections.map((d) => d.label))];
    let dy = 42;
    unique.forEach((name) => {
      if (dy > 260) {
        footer(pdf, rid, 4, 5);
        pdf.addPage();
        dy = 28;
      }
      pdf.setFontSize(13);
      setText(pdf, "#013220");
      pdf.setFont("helvetica", "bold");
      pdf.text(name, 20, dy);
      dy += 6;

      const info = DISEASE_INFO[name] || "A fungal disease affecting plant foliage. Early detection and treatment are recommended to prevent spread.";
      pdf.setFontSize(9);
      setText(pdf, "#212529");
      pdf.setFont("helvetica", "normal");
      const lines = pdf.splitTextToSize(info, 170);
      pdf.text(lines, 20, dy);
      dy += lines.length * 4 + 4;

      setText(pdf, "#6C757D");
      pdf.setFont("helvetica", "bold");
      pdf.text("Recommended Actions:", 20, dy);
      dy += 5;
      const actions = TREATMENTS[name] || TREATMENTS.default;
      pdf.setFont("helvetica", "normal");
      actions.forEach((action, idx) => {
        pdf.text(`${idx + 1}. ${action}`, 24, dy);
        dy += 5;
      });
      dy += 6;

      setDraw(pdf, "#00000010");
      pdf.setLineWidth(0.3);
      pdf.line(20, dy - 2, 190, dy - 2);
    });
  }

  footer(pdf, rid, 4, 5);

  // --- Page 5: Appendix & Disclaimer ---
  pdf.addPage();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  setText(pdf, "#013220");
  pdf.text("Appendix & References", 20, 28);
  setDraw(pdf, "#013220");
  pdf.line(20, 32, 75, 32);

  pdf.setFontSize(11);
  setText(pdf, "#013220");
  pdf.setFont("helvetica", "bold");
  pdf.text("Glossary", 20, 42);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  setText(pdf, "#212529");
  const glossary = [
    "Confidence Score: The probability (0-100%) that the AI correctly identified the disease.",
    "Bounding Box: Rectangular coordinates (x1,y1,x2,y2) marking the detected infection area.",
    "Foliar: Relating to leaves.",
    "Pathogen: Disease-causing organism.",
  ];
  let gy = 48;
  glossary.forEach((g) => {
    const gl = pdf.splitTextToSize(g, 170);
    pdf.text(gl, 20, gy);
    gy += gl.length * 4 + 2;
  });

  gy += 8;
  pdf.setFontSize(11);
  setText(pdf, "#013220");
  pdf.setFont("helvetica", "bold");
  pdf.text("References", 20, gy);
  gy += 6;
  pdf.setFontSize(9);
  setText(pdf, "#212529");
  pdf.setFont("helvetica", "normal");
  [
    "PlantVillage Dataset - Hughes et al. (2015)",
    "YOLO: Real-Time Object Detection - Redmon et al.",
  ].forEach((r) => {
    pdf.text(`- ${r}`, 20, gy);
    gy += 5;
  });

  gy += 10;
  setFill(pdf, "#F8F9FA");
  pdf.roundedRect(20, gy, 170, 35, 3, 3, "F");
  pdf.setFontSize(8);
  setText(pdf, "#6C757D");
  const disc = pdf.splitTextToSize(
    "Disclaimer: This report is generated by an AI system and is intended for informational purposes only. Always consult with a certified agronomist or plant pathologist before making treatment decisions. FungAI does not guarantee 100% accuracy in disease identification.",
    165
  );
  pdf.text(disc, 25, gy + 8);

  footer(pdf, rid, 5, 5);

  pdf.save(`fungai-scan-${rid.slice(0, 8)}.pdf`);
}
