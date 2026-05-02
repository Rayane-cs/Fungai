// Re-export from generatePDF utility
export { generateScanPDFFromComponent as generateScanPDF } from "./generatePDF";

// Also export the component and types from ScanReport
export { ScanReport, default } from "../components/ScanReport";

// Types for backward compatibility
export interface Detection {
  label: string;
  confidence: number;
  bbox: number[];
  class_id: number;
}

export interface ScanResult {
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
