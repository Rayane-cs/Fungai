import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  detections: Detection[];
  original_image_base64?: string;
  annotated_image_base64: string;
  total_detections: number;
}

export default function ScanReportDebug() {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to load from localStorage first (set by Scan page)
    const stored = localStorage.getItem("last_scan_result");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setResult(parsed);
        console.log("Loaded from localStorage:", {
          hasOrig: !!parsed.original_image_base64,
          hasAnn: !!parsed.annotated_image_base64,
          origLen: parsed.original_image_base64?.length,
          annLen: parsed.annotated_image_base64?.length,
        });
        return;
      } catch (e) {
        console.error("Failed to parse stored result:", e);
      }
    }

    // Try to load from URL param
    const dataParam = searchParams.get("data");
    if (dataParam) {
      try {
        const decoded = JSON.parse(atob(dataParam));
        setResult(decoded);
        return;
      } catch (e) {
        setError("Invalid data parameter");
        return;
      }
    }

    setError("No scan data found. Please run a scan first.");
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-black/10 bg-white p-8">
          <h1 className="font-heading mb-4 text-2xl text-red-600">Debug Error</h1>
          <p className="font-body text-black">{error}</p>
          <p className="mt-4 text-sm text-black/60">
            Go to the Scan page, run a scan, then come back here.
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-black/10 bg-white p-8">
          <h1 className="font-heading mb-4 text-2xl">Loading Scan Data...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-heading mb-4 text-2xl text-[#013220]">
          ScanReport Debug View
        </h1>
        
        {/* Debug info */}
        <div className="mb-6 rounded-xl border border-black/10 bg-white p-4">
          <h2 className="font-heading mb-2 text-lg">Image Data Status</h2>
          <div className="font-body space-y-1 text-sm">
            <p>Original image: {result.original_image_base64 ? "✅ Present" : "❌ Missing"} ({result.original_image_base64?.length || 0} chars)</p>
            <p>Annotated image: {result.annotated_image_base64 ? "✅ Present" : "❌ Missing"} ({result.annotated_image_base64?.length || 0} chars)</p>
            <p>Detections: {result.total_detections}</p>
            <p>Filename: {result.filename}</p>
          </div>
        </div>

        {/* Raw image preview */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {result.original_image_base64 && (
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <h3 className="font-heading mb-2">Raw Original Image</h3>
              <img
                src={`data:image/jpeg;base64,${result.original_image_base64}`}
                alt="Original"
                className="w-full rounded-lg"
                onLoad={() => console.log("Raw original image loaded")}
                onError={() => console.error("Raw original image failed")}
              />
            </div>
          )}
          {result.annotated_image_base64 && (
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <h3 className="font-heading mb-2">Raw Annotated Image</h3>
              <img
                src={`data:image/jpeg;base64,${result.annotated_image_base64}`}
                alt="Annotated"
                className="w-full rounded-lg"
                onLoad={() => console.log("Raw annotated image loaded")}
                onError={() => console.error("Raw annotated image failed")}
              />
            </div>
          )}
        </div>

        {/* The actual ScanReport component */}
        <div className="mb-6 rounded-xl border border-black/10 bg-white p-4">
          <h2 className="font-heading mb-4 text-lg">ScanReport Component</h2>
          <ScanReport result={result} userName="Debug User" />
        </div>
      </div>
    </div>
  );
}
