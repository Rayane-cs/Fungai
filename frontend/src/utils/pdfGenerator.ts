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

function bgShape(pdf: jsPDF, x: number, y: number, w: number, h: number, r: number, color: string) {
  setFill(pdf, color);
  pdf.roundedRect(x, y, w, h, r, r, "F");
}

function drawHBarChart(
  pdf: jsPDF,
  data: { label: string; value: number; color: string }[],
  x: number,
  y: number,
  w: number,
  h: number,
  title: string
) {
  pdf.setFontSize(9);
  setText(pdf, "#013220");
  pdf.setFont("helvetica", "bold");
  pdf.text(title, x, y - 3);

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barH = (h - 6) / data.length;
  const labelW = 55;
  const barMaxW = w - labelW - 8;

  data.forEach((d, i) => {
    const by = y + i * barH + 2;
    pdf.setFontSize(7);
    setText(pdf, "#212529");
    pdf.setFont("helvetica", "normal");
    pdf.text(d.label, x, by + barH / 2 + 1);

    const bw = (d.value / maxVal) * barMaxW;
    setFill(pdf, d.color);
    pdf.roundedRect(x + labelW, by, bw, barH - 3, 1.5, 1.5, "F");

    pdf.setFontSize(7);
    setText(pdf, "#212529");
    pdf.text(`${d.value}`, x + labelW + bw + 2, by + barH / 2 + 1);
  });
}

function drawPieChart(
  pdf: jsPDF,
  data: { label: string; value: number; color: string }[],
  x: number,
  y: number,
  size: number,
  title: string
) {
  pdf.setFontSize(9);
  setText(pdf, "#013220");
  pdf.setFont("helvetica", "bold");
  pdf.text(title, x, y - 3);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return;

  const canvas = document.createElement("canvas");
  canvas.width = size * 4;
  canvas.height = size * 4;
  const ctx = canvas.getContext("2d")!;
  const dpr = 4;
  const cx = (size * dpr) / 2;
  const cy = (size * dpr) / 2;
  const r = (size * dpr) / 2 - 8;
  const holeR = r * 0.45;

  let angle = -Math.PI / 2;
  data.forEach((d) => {
    const sweep = (d.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    angle += sweep;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, holeR, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Labels around
  angle = -Math.PI / 2;
  data.forEach((d) => {
    const sweep = (d.value / total) * Math.PI * 2;
    const mid = angle + sweep / 2;
    const lx = cx + (r + 20) * Math.cos(mid);
    const ly = cy + (r + 20) * Math.sin(mid);
    ctx.fillStyle = "#212529";
    ctx.font = "bold 22px helvetica";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const pct = ((d.value / total) * 100).toFixed(1) + "%";
    ctx.fillText(`${d.label} ${pct}`, lx, ly);
    angle += sweep;
  });

  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", x, y, size, size);
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
  // Decorative bg shapes
  bgShape(pdf, 0, 0, w, 60, 0, "#E8F5E9");
  bgShape(pdf, w - 50, 230, 50, 67, 0, "#E8F5E9");
  bgShape(pdf, 160, 180, 35, 35, 8, "#01322008");
  bgShape(pdf, 15, 140, 20, 20, 5, "#01322008");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  setText(pdf, "#013220");
  pdf.text("FUNGAI", w / 2, 38, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  setText(pdf, "#6C757D");
  pdf.text("AI-Powered Fungal Disease Detection & Analysis", w / 2, 48, { align: "center" });

  pdf.setFontSize(20);
  setText(pdf, "#013220");
  pdf.text("PLANT HEALTH ANALYSIS REPORT", w / 2, 82, { align: "center" });
  setDraw(pdf, "#013220");
  pdf.setLineWidth(0.8);
  pdf.line(65, 88, w - 65, 88);

  // Compact metadata table
  const meta = [
    ["Report ID", rid.slice(0, 12)],
    ["Scan Date", new Date(result.timestamp).toLocaleString("en-GB")],
    ["User", userName || "Guest"],
    ["Filename", result.filename || "-"],
  ];
  let y = 98;
  pdf.setFontSize(10);
  meta.forEach(([label, value]) => {
    setText(pdf, "#212529");
    pdf.setFont("helvetica", "bold");
    pdf.text(`${label}:`, 25, y);
    pdf.setFont("helvetica", "normal");
    setText(pdf, "#6C757D");
    pdf.text(String(value), 75, y);
    y += 6;
  });

  // Quick summary box (compact)
  y += 3;
  bgShape(pdf, 20, y, w - 40, 32, 3, "#F8F9FA");
  setDraw(pdf, "#013220");
  pdf.setLineWidth(0.4);
  pdf.roundedRect(20, y, w - 40, 32, 3, 3, "S");

  pdf.setFontSize(9);
  setText(pdf, "#013220");
  pdf.setFont("helvetica", "bold");
  pdf.text("QUICK SUMMARY", 25, y + 6);

  const status = total === 0 ? "HEALTHY" : "INFECTED";
  const statusColor = total === 0 ? "#28A745" : avgConf > 0.8 ? "#DC3545" : "#FFC107";
  const summaryItems = [
    ["Overall Status", status, statusColor],
    ["Total Detections", `${total}`, "#212529"],
    ["Confidence", `${(avgConf * 100).toFixed(1)}%`, "#212529"],
    ["Primary Threat", mostCommon, "#212529"],
  ];
  let sx = 25;
  summaryItems.forEach(([k, v, c]) => {
    pdf.setFontSize(7);
    setText(pdf, "#6C757D");
    pdf.setFont("helvetica", "normal");
    pdf.text(String(k), sx, y + 14);
    pdf.setFontSize(9);
    setText(pdf, String(c));
    pdf.setFont("helvetica", "bold");
    pdf.text(String(v), sx, y + 20);
    sx += 44;
  });

  footer(pdf, rid, 1, 4);

  // --- Page 2: Visual Analysis ---
  pdf.addPage();
  bgShape(pdf, 180, 0, 30, 30, 0, "#E8F5E9");
  bgShape(pdf, 10, 260, 25, 25, 6, "#01322008");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  setText(pdf, "#013220");
  pdf.text("Visual Analysis", 20, 26);
  setDraw(pdf, "#013220");
  pdf.line(20, 29, 55, 29);

  pdf.setFontSize(9);
  setText(pdf, "#212529");
  pdf.setFont("helvetica", "normal");
  pdf.text("YOLO deep-learning model detection overlay comparison.", 20, 35);

  // Images (compact)
  const imgY = 40;
  const imgW = 80;
  const imgH = 80;
  if (origImg) {
    try {
      pdf.setFontSize(8);
      setText(pdf, "#212529");
      pdf.text("Original", 20, imgY - 1);
      pdf.addImage(origImg, "PNG", 20, imgY, imgW, imgH);
    } catch {}
  }
  if (annImg) {
    try {
      pdf.setFontSize(8);
      setText(pdf, "#212529");
      pdf.text("AI Annotated", w / 2 + 5, imgY - 1);
      pdf.addImage(annImg, "PNG", w / 2 + 5, imgY, imgW, imgH);
    } catch {}
  }

  pdf.setFontSize(8);
  setText(pdf, "#6C757D");
  pdf.text("Fig 1: Original (left) vs AI overlay (right)", 20, imgY + imgH + 4);

  // Compact legend
  let ly = imgY + imgH + 12;
  pdf.setFontSize(9);
  setText(pdf, "#013220");
  pdf.setFont("helvetica", "bold");
  pdf.text("Legend", 20, ly);
  ly += 5;
  const legend = [
    ["#013220", "Detected infection area"],
    ["#DC3545", "High severity (>80%)"],
    ["#FFC107", "Medium severity (50-80%)"],
  ];
  legend.forEach(([color, text]) => {
    setFill(pdf, color);
    pdf.rect(20, ly - 2, 3, 3, "F");
    pdf.setFont("helvetica", "normal");
    setText(pdf, "#212529");
    pdf.setFontSize(8);
    pdf.text(text, 26, ly);
    ly += 5;
  });

  footer(pdf, rid, 2, 4);

  // --- Page 3: Detection Results + Charts ---
  pdf.addPage();
  bgShape(pdf, 0, 240, 40, 57, 0, "#E8F5E9");
  bgShape(pdf, 170, 140, 30, 30, 8, "#01322008");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  setText(pdf, "#013220");
  pdf.text("Detection Results", 20, 26);
  setDraw(pdf, "#013220");
  pdf.line(20, 29, 65, 29);

  if (detections.length === 0) {
    pdf.setFontSize(10);
    setText(pdf, "#6C757D");
    pdf.text("No detections found. The plant appears healthy.", 20, 38);
  } else {
    // Compact table
    const cols = ["#", "Disease", "Conf", "Sev", "Bounding Box"];
    const colX = [20, 30, 82, 105, 120];
    const rowH = 6.5;
    let ty = 36;

    setFill(pdf, "#013220");
    pdf.rect(20, ty - 4, 170, rowH, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    setText(pdf, "#FFFFFF");
    cols.forEach((c, i) => pdf.text(c, colX[i], ty));
    ty += rowH;

    detections.slice(0, 18).forEach((d, i) => {
      if (i % 2 === 0) {
        setFill(pdf, "#F8F9FA");
        pdf.rect(20, ty - 4, 170, rowH, "F");
      }
      const sev = severityLabel(d.confidence);
      const sevC = severityColor(d.confidence);
      setText(pdf, "#212529");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(String(i + 1), colX[0], ty);
      pdf.text(d.label.length > 16 ? d.label.slice(0, 16) + "..." : d.label, colX[1], ty);
      pdf.text(`${(d.confidence * 100).toFixed(0)}%`, colX[2], ty);
      setText(pdf, sevC);
      pdf.setFont("helvetica", "bold");
      pdf.text(sev, colX[3], ty);
      setText(pdf, "#212529");
      pdf.setFont("helvetica", "normal");
      pdf.text(`(${d.bbox.map((n) => Math.round(n)).join(",")})`, colX[4], ty);
      ty += rowH;
    });

    // Charts area
    const chartY = ty + 6;

    // Severity pie chart
    const high = detections.filter((d) => d.confidence > 0.8).length;
    const med = detections.filter((d) => d.confidence > 0.5 && d.confidence <= 0.8).length;
    const low = detections.filter((d) => d.confidence <= 0.5).length;

    drawPieChart(
      pdf,
      [
        { label: "High", value: high, color: "#DC3545" },
        { label: "Med", value: med, color: "#FFC107" },
        { label: "Low", value: low, color: "#28A745" },
      ],
      75,
      chartY + 38,
      28,
      "Severity Breakdown"
    );

    // Class frequency bar chart
    const classFreq = Object.entries(
      detections.reduce((acc, d) => {
        acc[d.label] = (acc[d.label] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([label, value]) => ({
      label: label.length > 14 ? label.slice(0, 14) + "..." : label,
      value,
      color: "#013220",
    }));

    drawHBarChart(pdf, classFreq, 115, chartY, 82, 38, "Disease Frequency");

    // Confidence distribution mini bars
    const confBuckets = [
      { label: "90-100%", value: detections.filter((d) => d.confidence >= 0.9).length, color: "#DC3545" },
      { label: "80-89%", value: detections.filter((d) => d.confidence >= 0.8 && d.confidence < 0.9).length, color: "#FF6B6B" },
      { label: "70-79%", value: detections.filter((d) => d.confidence >= 0.7 && d.confidence < 0.8).length, color: "#FFC107" },
      { label: "50-69%", value: detections.filter((d) => d.confidence >= 0.5 && d.confidence < 0.7).length, color: "#FFD93D" },
      { label: "<50%", value: detections.filter((d) => d.confidence < 0.5).length, color: "#28A745" },
    ];
    drawHBarChart(pdf, confBuckets, 20, chartY, 82, 38, "Confidence Distribution");
  }

  footer(pdf, rid, 3, 4);

  // --- Page 4: Disease Profiles + Appendix (compact) ---
  pdf.addPage();
  bgShape(pdf, 0, 0, 35, 35, 0, "#E8F5E9");
  bgShape(pdf, 175, 250, 35, 47, 0, "#E8F5E9");
  bgShape(pdf, 20, 180, 15, 15, 4, "#01322008");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  setText(pdf, "#013220");
  pdf.text("Disease Profiles & Treatment", 20, 26);
  setDraw(pdf, "#013220");
  pdf.line(20, 29, 95, 29);

  let dy = 36;
  if (detections.length === 0) {
    pdf.setFontSize(10);
    setText(pdf, "#6C757D");
    pdf.text("No diseases detected.", 20, 38);
    dy = 44;
  } else {
    const unique = [...new Set(detections.map((d) => d.label))];
    unique.slice(0, 3).forEach((name) => {
      pdf.setFontSize(11);
      setText(pdf, "#013220");
      pdf.setFont("helvetica", "bold");
      pdf.text(name, 20, dy);
      dy += 5;

      const info = DISEASE_INFO[name] || "A fungal disease affecting plant foliage. Early detection and treatment are recommended.";
      pdf.setFontSize(8);
      setText(pdf, "#212529");
      pdf.setFont("helvetica", "normal");
      const lines = pdf.splitTextToSize(info, 170);
      pdf.text(lines, 20, dy);
      dy += lines.length * 3 + 3;

      setText(pdf, "#6C757D");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("Actions:", 20, dy);
      dy += 4;
      const actions = TREATMENTS[name] || TREATMENTS.default;
      pdf.setFont("helvetica", "normal");
      actions.slice(0, 3).forEach((action, idx) => {
        pdf.text(`${idx + 1}. ${action}`, 24, dy);
        dy += 4;
      });
      dy += 4;
    });
  }

  // Compact appendix inline
  let ay = dy + 4;
  pdf.setFontSize(10);
  setText(pdf, "#013220");
  pdf.setFont("helvetica", "bold");
  pdf.text("Glossary", 20, ay);
  ay += 5;
  pdf.setFontSize(8);
  setText(pdf, "#212529");
  pdf.setFont("helvetica", "normal");
  [
    "Confidence Score: probability (0-100%) of correct disease identification.",
    "Bounding Box: coordinates (x1,y1,x2,y2) marking detected infection area.",
    "Pathogen: disease-causing organism.",
  ].forEach((g) => {
    const gl = pdf.splitTextToSize(g, 170);
    pdf.text(gl, 20, ay);
    ay += gl.length * 3 + 1;
  });

  ay += 4;
  pdf.setFontSize(10);
  setText(pdf, "#013220");
  pdf.setFont("helvetica", "bold");
  pdf.text("References", 20, ay);
  ay += 5;
  pdf.setFontSize(8);
  setText(pdf, "#212529");
  pdf.setFont("helvetica", "normal");
  [
    "PlantVillage Dataset - Hughes et al. (2015)",
    "YOLO: Real-Time Object Detection - Redmon et al.",
  ].forEach((r) => {
    pdf.text(`- ${r}`, 20, ay);
    ay += 4;
  });

  // Disclaimer box
  ay += 5;
  bgShape(pdf, 20, ay, 170, 22, 2, "#F8F9FA");
  pdf.setFontSize(7);
  setText(pdf, "#6C757D");
  const disc = pdf.splitTextToSize(
    "Disclaimer: This AI-generated report is for informational purposes only. Always consult a certified agronomist or plant pathologist before treatment. FungAI does not guarantee 100% accuracy.",
    165
  );
  pdf.text(disc, 24, ay + 5);

  footer(pdf, rid, 4, 4);

  pdf.save(`fungai-scan-${rid.slice(0, 8)}.pdf`);
}
