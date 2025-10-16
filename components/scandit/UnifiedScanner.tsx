import { useZxing, Result } from "react-zxing";
import { parseUPIString, validateUPIData } from "@/utils/upiParser";

interface UnifiedScannerProps {
  onScan: (data: string, type: "barcode" | "qr") => void;
  paused?: boolean;
  onError?: (error: string) => void;
}

export default function UnifiedScanner({
  onScan,
  paused = false,
  onError,
}: UnifiedScannerProps) {
  const { ref } = useZxing({
    timeBetweenDecodingAttempts: 100,
    onDecodeResult: (result: Result) => {
      const scannedData = result.getText();

      // Auto-detect type based on content
      if (scannedData.startsWith("upi://pay")) {
        // It's a UPI QR code
        const upiData = parseUPIString(scannedData);
        if (upiData && validateUPIData(upiData)) {
          onScan(scannedData, "qr");
        } else {
          onError?.("Invalid UPI QR code");
        }
      } else if (
        /^\d+$/.test(scannedData) ||
        /^[0-9]{8,14}$/.test(scannedData)
      ) {
        // It's likely a barcode (numeric, 8-14 digits typical for GTIN/EAN)
        onScan(scannedData, "barcode");
      } else {
        // Try to parse as UPI anyway, might be malformed
        const upiData = parseUPIString(scannedData);
        if (upiData && validateUPIData(upiData)) {
          onScan(scannedData, "qr");
        } else {
          onError?.("Unrecognized scan format");
        }
      }
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Scanning error";
      onError?.(errorMessage);
    },
    paused,
  });

  return <video ref={ref} className="w-full h-full object-cover" />;
}
