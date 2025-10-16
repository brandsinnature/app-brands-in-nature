import { useEffect, useState, useCallback, useRef } from "react";
import {
  addProductToCart,
  getRetailerByUpi,
  getProductByName,
} from "@/data-access/product";
import { useStore } from "./store";
import { toast } from "sonner";
import Show from "./Show";
import CartWrapper from "./CartWrapper";
import { parseAsString, useQueryState } from "next-usequerystate";
import { useLocation } from "@/hooks/useLocation";
import DepositWrapper from "./DepositWrapper";
import { set } from "date-fns";
import { useZxing, Result } from "react-zxing";
import { parseUPIString, validateUPIData, UPIData } from "@/utils/upiParser";

interface Detection {
  brand: string;
  name: string;
  material: string;
  description: string;
  net_weight: number;
  measurement_unit: string;
  confidence: number;
}

interface UPI_Data {
  upi_id: string;
  name: string;
}

interface Data {
  detections: Detection[];
}

interface ScannerResult {
  success: boolean;
  data: string;
  deposit_data: string;
  error: string | null;
}

export default function ScannerComponent() {
  const { keepCameraOn, setLoading } = useStore();
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const { lat, lng, acc, getCurrentLocation } = useLocation();
  const [isScanning, setIsScanning] = useState(false);
  const [shouldScan, setShouldScan] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [mode, setMode] = useQueryState(
    "mode",
    parseAsString.withDefault("cart")
  );

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleQRResult = async (result: Result) => {
    try {
      const upiString = result.getText();
      const upiData = parseUPIString(upiString);

      if (!upiData || !validateUPIData(upiData)) {
        toast.error("Invalid UPI QR code");
        return;
      }

      // Use existing flow
      await processDepositQR(upiData);
    } catch (error) {
      console.error("QR parsing failed, trying external service fallback");
      // Fallback to external service if parsing fails
      await connectToScannerService();
    }
  };

  const processDepositQR = async (upiData: UPIData) => {
    await pauseScanning();
    setLoading(true);

    const { error, data: retailerData } = await getRetailerByUpi({
      pa: upiData.pa,
      pn: upiData.pn,
      lat: lat,
      lng: lng,
      acc: acc,
    });

    if (error || !retailerData) {
      setLoading(false);
      return toast.error(error ?? "Error fetching retailer");
    }

    setProduct({
      pa: upiData.pa,
      pn: upiData.pn,
      lat,
      lng,
      acc,
      id: retailerData.id,
    });

    setOpen(true);
    setLoading(false);
  };

  const connectToScannerService = async () => {
    // Fallback to external scanner service
    const frameData = await captureFrame();
    if (!frameData) {
      throw new Error("Failed to capture frame");
    }

    const response = await fetch(
      "https://scanner-service-oe4l.onrender.com/scan-deposit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          frame: frameData,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Scanner service error:", response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result: ScannerResult = await response.json();
    if (result.success === false) {
      console.log(result.error);
      return;
    }

    const retailer: UPI_Data = JSON.parse(result.deposit_data);
    const { error, data: retailerData } = await getRetailerByUpi({
      pa: retailer?.upi_id,
      pn: retailer?.name,
      lat: lat,
      lng: lng,
      acc: acc,
    });

    if (error || !retailerData) {
      setLoading(false);
      return toast.error(error ?? "Error fetching retailer");
    }

    setProduct({
      pa: retailer?.upi_id,
      pn: retailer?.name,
      lat,
      lng,
      acc,
      id: retailerData.id,
    });

    setOpen(true);
    setLoading(false);
  };

  const captureFrame = useCallback(async (): Promise<string | null> => {
    try {
      if (!videoRef.current) {
        throw new Error("No video element found");
      }
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      ctx.drawImage(videoRef.current, 0, 0);
      const frameData = canvas.toDataURL("image/jpeg");
      return frameData;
    } catch (error) {
      console.error("Error capturing frame:", error);
      return null;
    }
  }, []);

  const connectToScanner = useCallback(
    async (forceResume: boolean) => {
      // Skip deposit mode - handled by react-zxing QR scanner
      if (mode === "deposit") return;

      if (!forceResume && (isScanning || !shouldScan)) return;

      toast.info("Scanning...");

      try {
        setIsScanning(true);

        const frameData = await captureFrame();
        if (!frameData) {
          throw new Error("Failed to capture frame");
        }

        var response = null;

        // Cart mode only - try Moondream first, then fallback to existing scanner
        try {
          // Try Moondream API first
          response = await fetch("/api/moondream/scan", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              frame: frameData,
            }),
          });

          if (response.ok) {
            console.log("Moondream scan successful");
          } else {
            // If Moondream fails, throw error to trigger fallback
            const errorText = await response.text();
            console.error("Moondream API error:", response.status, errorText);
            throw new Error(`Moondream API error: ${response.status}`);
          }
        } catch (moondreamError) {
          console.log(
            "Moondream failed, falling back to scanner service:",
            moondreamError
          );

          // Fallback to existing scanner service
          response = await fetch(
            "https://scanner-service-oe4l.onrender.com/scan",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                frame: frameData,
              }),
            }
          );
          console.log("Fallback scanner service used");
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Scanner service error:", response.status, errorText);
          throw new Error(
            `HTTP error! status: ${response.status} - ${errorText}`
          );
        }

        let result: ScannerResult;
        try {
          result = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse scanner response as JSON:", jsonError);
          throw new Error("Invalid response format from scanner service");
        }

        if (result.success === false) {
          console.log(result.error);
          return;
        }

        setIsScanning(false);

        // Process detection results inline to avoid circular dependency
        await pauseScanning();
        setLoading(true);

        if (!result.success || result.error) {
          toast.error(result.error || "Detection failed");
          setLoading(false);
          await resumeScanning();
          return;
        }

        if (mode === "deposit") {
          const retailer: UPI_Data = JSON.parse(result.deposit_data);

          console.log("Retailer: ", retailer);

          const { error, data: retailerData } = await getRetailerByUpi({
            pa: retailer?.upi_id,
            pn: retailer?.name,
            lat: lat,
            lng: lng,
            acc: acc,
          });

          if (error || !retailerData) {
            setLoading(false);
            return toast.error(error ?? "Error fetching retailer");
          }

          setProduct({
            pa: retailer?.upi_id,
            pn: retailer?.name,
            lat,
            lng,
            acc,
            id: retailerData.id,
          });
        } else {
          const parsedData: Data = JSON.parse(result.data);

          const products = parsedData.detections;

          if (products.length === 0) {
            toast.error("No objects detected");
            setLoading(false);
            await resumeScanning();
            return;
          }

          const bestDetection = products.reduce((prev, current) =>
            prev.confidence > current.confidence ? prev : current
          );

          if (bestDetection.confidence < 0.7) {
            toast.error("Detection confidence too low");
            setLoading(false);
            await resumeScanning();
            return;
          }

          console.log("Best detection: ", bestDetection);

          const product = {
            name: bestDetection.name,
            brand: bestDetection.brand,
            material: bestDetection.material,
            description: bestDetection.description,
            weights_and_measures: {
              net_weight: bestDetection.net_weight,
              measurement_unit: bestDetection.measurement_unit,
            },
          };

          setProduct(product);
          const { error } = await addProductToCart(product);
          if (error) console.error(`Here: ${error}`);
        }

        setOpen(true);
        setLoading(false);
      } catch (error) {
        setShouldScan(false);
        console.error("Scanner error:", error);

        // Show user-friendly error message
        if (error instanceof Error) {
          if (error.message.includes("Moondream API error")) {
            toast.error(
              "AI scanning temporarily unavailable. Please try again."
            );
          } else if (error.message.includes("Invalid response format")) {
            toast.error("Scanner service error. Please try again.");
          } else {
            toast.error("Scanning failed. Please try again.");
          }
        } else {
          toast.error("An unexpected error occurred. Please try again.");
        }
      }
    },
    [
      mode,
      isScanning,
      shouldScan,
      captureFrame,
      setShouldScan,
      setLoading,
      lat,
      lng,
      acc,
      setProduct,
      setOpen,
    ]
  );

  // QR scanner hook for deposit mode
  const { ref: qrVideoRef } = useZxing({
    timeBetweenDecodingAttempts: 100,
    onDecodeResult: handleQRResult,
    paused: mode !== "deposit" || !shouldScan,
  });

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  const enableCamera = useCallback(
    async (enable: boolean) => {
      try {
        if (enable) {
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }

          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });

          if (!videoRef.current) {
            throw new Error("Video element not found");
          }

          // Clear any existing source
          videoRef.current.srcObject = null;

          // Set new stream
          setStream(mediaStream);
          videoRef.current.srcObject = mediaStream;

          // Wait for video to be ready before playing
          await new Promise((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => {
                resolve(undefined);
              };
            }
          });

          try {
            await videoRef.current.play();
          } catch (playError) {
            console.error("Error playing video:", playError);
            mediaStream.getTracks().forEach((track) => track.stop());
            throw playError;
          }
        } else {
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);

            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
          }
        }
      } catch (error) {
        console.error("Camera access error:", error);
        throw error;
      }
    },
    [stream]
  );

  const pauseScanning = useCallback(async () => {
    setShouldScan(false);
    if (!keepCameraOn) await enableCamera(false);
  }, [keepCameraOn, enableCamera]);

  const resumeScanning = useCallback(
    async (forceResume = false) => {
      await enableCamera(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setShouldScan(true);
      // Trigger a new scan if not already scanning
      if (!isScanning) {
        connectToScanner(forceResume);
      }
    },
    [isScanning, enableCamera, connectToScanner]
  );

  // Event listener for resume-scanning event
  useEffect(() => {
    const handleResumeScanning = async () => {
      console.log("Resume scanning event received");
      await resumeScanning(true);
    };

    // Add the global event listener
    window.addEventListener("resume-scanning", handleResumeScanning);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener("resume-scanning", handleResumeScanning);
    };
  }, [resumeScanning]);

  // processDetectionResults function removed - logic inlined into connectToScanner

  const startScanning = useCallback(async () => {
    try {
      await enableCamera(true);
      setShouldScan(true);
      console.log("Scanning started");
      // Let resumeScanning handle the connectToScanner call
      await resumeScanning();
    } catch (error) {
      console.error("Camera Error:", error);
      toast.error("Failed to enable camera. Please check camera permissions.");
    }
  }, [enableCamera]);

  useEffect(() => {
    startScanning();

    return () => {
      setShouldScan(false);
      enableCamera(false);
    };
  }, [mode, startScanning, enableCamera]);

  useEffect(() => {
    setProduct(null);
  }, [mode]);

  return (
    <>
      {mode === "cart" && <video ref={videoRef} />}
      {mode === "deposit" && <video ref={qrVideoRef} />}
      <Show when={mode === "cart"}>
        <CartWrapper open={open} setOpen={setOpen} product={product} />
      </Show>

      <Show when={mode === "deposit"}>
        <DepositWrapper open={open} setOpen={setOpen} retailer={product} />
      </Show>
    </>
  );
}
