import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { PDFDocument } from "pdf-lib";
import { ScanReport } from "../components/ScanReport";

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

export async function generateScanPDFFromComponent(
  result: ScanResult,
  userName?: string,
  autoDownload: boolean = true
): Promise<Uint8Array> {
  // Create a hidden container
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  // Render the actual React ScanReport component
  const root = createRoot(container);
  root.render(<ScanReport result={result} userName={userName || "Guest"} />);

  // Fast wait for React render + images (parallel)
  await new Promise(resolve => setTimeout(resolve, 300));

  // Quick image load check with shorter timeout
  const images = container.querySelectorAll("img");
  if (images.length > 0) {
    await Promise.race([
      Promise.all(
        Array.from(images).map(img =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) { resolve(); return; }
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(() => resolve(), 500); // Reduced from 3000ms
          })
        )
      ),
      new Promise(resolve => setTimeout(resolve, 1500)) // Max 1.5s wait
    ]);
  }

  // Quick wait for charts
  await new Promise(resolve => setTimeout(resolve, 200));
  await document.fonts.ready;

  // Capture the rendered component with html2canvas
  const reportEl = container.querySelector("[style*='210mm']") || container.firstElementChild || container;
  console.log("PDF: Capturing rendered component...");

  // Capture with lower scale for speed (1.5 = good balance quality/speed)
  const canvas = await html2canvas(reportEl as HTMLElement, {
    scale: 1.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    width: 794,
    height: 4491,
    imageTimeout: 2000,
    logging: false,
  });

  // Split into A4 pages (210mm x 297mm)
  const pageHeightPx = Math.round(canvas.height / 4);
  const pageWidthPx = canvas.width;

  function cropPage(srcY: number) {
    const c = document.createElement("canvas");
    c.width = pageWidthPx;
    c.height = pageHeightPx;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(canvas, 0, srcY, pageWidthPx, pageHeightPx, 0, 0, pageWidthPx, pageHeightPx);
    return c;
  }

  const page1Canvas = cropPage(0);
  const page2Canvas = cropPage(pageHeightPx);
  const page3Canvas = cropPage(pageHeightPx * 2);
  const page4Canvas = cropPage(pageHeightPx * 3);

  // Cleanup React root and container
  root.unmount();
  document.body.removeChild(container);

  // Create PDF from cropped images
  const pdfDoc = await PDFDocument.create();
  const rid = result.id || "unknown";

  // Use JPEG instead of PNG for smaller/faster PDF
  const img1Bytes = Uint8Array.from(atob(page1Canvas.toDataURL("image/jpeg", 0.85).split(",")[1]), (c) => c.charCodeAt(0));
  const img2Bytes = Uint8Array.from(atob(page2Canvas.toDataURL("image/jpeg", 0.85).split(",")[1]), (c) => c.charCodeAt(0));
  const img3Bytes = Uint8Array.from(atob(page3Canvas.toDataURL("image/jpeg", 0.85).split(",")[1]), (c) => c.charCodeAt(0));
  const img4Bytes = Uint8Array.from(atob(page4Canvas.toDataURL("image/jpeg", 0.85).split(",")[1]), (c) => c.charCodeAt(0));

  const embeddedImg1 = await pdfDoc.embedJpg(img1Bytes);
  const embeddedImg2 = await pdfDoc.embedJpg(img2Bytes);
  const embeddedImg3 = await pdfDoc.embedJpg(img3Bytes);
  const embeddedImg4 = await pdfDoc.embedJpg(img4Bytes);

  const page1 = pdfDoc.addPage([595.28, 841.89]);
  page1.drawImage(embeddedImg1, { x: 0, y: 0, width: 595.28, height: 841.89 });

  const page2 = pdfDoc.addPage([595.28, 841.89]);
  page2.drawImage(embeddedImg2, { x: 0, y: 0, width: 595.28, height: 841.89 });

  const page3 = pdfDoc.addPage([595.28, 841.89]);
  page3.drawImage(embeddedImg3, { x: 0, y: 0, width: 595.28, height: 841.89 });

  const page4 = pdfDoc.addPage([595.28, 841.89]);
  page4.drawImage(embeddedImg4, { x: 0, y: 0, width: 595.28, height: 841.89 });

  const pdfBytes = await pdfDoc.save();

  if (autoDownload) {
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fungai-scan-${rid.slice(0, 8)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return pdfBytes;
}

export default generateScanPDFFromComponent;
