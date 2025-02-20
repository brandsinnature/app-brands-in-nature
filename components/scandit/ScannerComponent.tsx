import { useEffect, useState, useCallback, useRef} from "react";
import {
    addProductToCart,
    getRetailerByUpi,
    getProductByName
} from "@/data-access/product";
import { useStore } from "./store";
import { toast } from "sonner";
import Show from "./Show";
import CartWrapper from "./CartWrapper";
import { parseAsString, useQueryState } from "next-usequerystate";
import { useLocation } from "@/hooks/useLocation";
import DepositWrapper from "./DepositWrapper";

interface Detection {
    id: string;
    class: string;
    confidence: number;
    product_name: string;
    product_code: string;
    bounding_box: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

interface ScannerResult {
    success: boolean;
    detections: Detection[];
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

    const [mode, _] = useQueryState("mode", parseAsString.withDefault("cart"));

    const videoRef = useRef<HTMLVideoElement>(null);

    const captureFrame = async (): Promise<string | null> => {
        try {
          if (!videoRef.current) {
            throw new Error("No video element found");
          }
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error("Could not get canvas context");
          }
          ctx.drawImage(videoRef.current, 0, 0);
          const frameData = canvas.toDataURL('image/jpeg');
          return frameData;
        } catch (error) {
          console.error("Error capturing frame:", error);
          return null;
        }
      };

    const connectToScanner = async () => {
        // If already scanning or scanning is paused, skip
        console.log("Scanning...");

        if (isScanning || !shouldScan) return;

        try {
            setIsScanning(true);

            const frameData = await captureFrame();
            if (!frameData) {
                throw new Error("Failed to capture frame");
            }

            const response = await fetch('https://your-python-server.com/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                 body: JSON.stringify({
                    frame: frameData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: ScannerResult = await response.json();

            if (result.success === false) {
                console.log(result.error)
                return;
            }

            await processDetectionResults(result);
        } catch (error) {
            setShouldScan(false);
            console.error("Scanner error:", error);
        } finally {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        getCurrentLocation();
    }, []);

    const enableCamera = async (enable: boolean) => {
        try {
          if (enable) {
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
    
            const mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment' }
            });
    
            if (!videoRef.current) {
              throw new Error('Video element not found');
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
              mediaStream.getTracks().forEach(track => track.stop());
              throw playError;
            }
          } else {
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
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
      };
    

    const pauseScanning = useCallback(async () => {
        setShouldScan(false);
        if (!keepCameraOn) await enableCamera(false);
    }, [keepCameraOn]);

    const resumeScanning = useCallback(async () => {
        await enableCamera(true);
        setShouldScan(true);
        // Trigger a new scan if not already scanning
        if (!isScanning) {
            connectToScanner();
        }
    }, [isScanning]);

    const processDetectionResults = async (result: ScannerResult) => {
        await pauseScanning();
        setLoading(true);
        
        if (!result.success || result.error) {
            toast.error(result.error || "Detection failed");
            setLoading(false);
            await resumeScanning();
            return;
        }

        if (result.detections.length === 0) {
            toast.error("No objects detected");
            setLoading(false);
            await resumeScanning();
            return;
        }

        const bestDetection = result.detections.reduce((prev, current) => 
            (prev.confidence > current.confidence) ? prev : current
        );

        if (bestDetection.confidence < 0.7) {
            toast.error("Detection confidence too low");
            setLoading(false);
            await resumeScanning();
            return;
        }

        if (mode === "deposit") {
            const { error, data } = await getRetailerByUpi({
                pa: bestDetection.product_code,
                pn: bestDetection.class,
                lat,
                lng,
                acc,
            });

            if (error || !data) {
                setLoading(false);
                await resumeScanning();
                return toast.error(error ?? "Error fetching retailer");
            }

            setProduct({
                pa: bestDetection.product_code,
                pn: bestDetection.class,
                lat,
                lng,
                acc,
                id: data.id
            });
        } else {
            const { data, error: findError } = await getProductByName(
                bestDetection.product_name
            );

            if (!findError) {
                setProduct(data);
                const { error } = await addProductToCart(data);
                if (error) toast.error(error);
            } else {
                toast.error(findError);
            }
        }

        setOpen(true);
        setLoading(false);
    };

    const startScanning = async () => {
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
    };

    useEffect(() => {
        startScanning();

        return () => {
            setShouldScan(false);
            enableCamera(false);
        };
    }, [mode]);

    useEffect(() => {
        setProduct(null);
    }, [mode]);

    return (
            <>
                <video
                ref={videoRef}
                />
            <Show when={mode === "cart"}>
                <CartWrapper open={open} setOpen={setOpen} product={product} />
            </Show>

            <Show when={mode === "deposit"}>
                <DepositWrapper
                    open={open}
                    setOpen={setOpen}
                    retailer={product}
                />
            </Show>
        </>
    );
}

// import { useEffect, useState, useCallback, useMemo } from "react";
// import {
//     addProductToCart,
//     getProductByGtin,
//     getRetailerByUpi,
// } from "@/data-access/product";
// import { useSDK } from "./sdk";
// import { useStore } from "./store";
// import { toast } from "sonner";
// import {
//     BarcodeCapture,
//     BarcodeCaptureListener,
//     BarcodeCaptureSession,
// } from "scandit-web-datacapture-barcode";
// import Show from "./Show";
// import CartWrapper from "./CartWrapper";
// import { parseAsString, useQueryState } from "next-usequerystate";
// import { useLocation } from "@/hooks/useLocation";
// import DepositWrapper from "./DepositWrapper";

// export default function ScannerComponent() {
//     const { sdk } = useSDK();
//     const { setBarcode, keepCameraOn, setLoading } = useStore();
//     const [open, setOpen] = useState(false);
//     const [product, setProduct] = useState<any>(null);
//     const { lat, lng, acc, getCurrentLocation } = useLocation();

//     const [mode, _] = useQueryState("mode", parseAsString.withDefault("cart"));

//     useEffect(() => {
//         getCurrentLocation();
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, []);

//     const shouldKeepCameraOn = useCallback(async () => {
//         if (!keepCameraOn) await sdk.enableCamera(false);
//     }, [sdk, keepCameraOn]);

//     const onScan = useMemo<BarcodeCaptureListener>(
//         () => ({
//             didScan: async (
//                 _: BarcodeCapture,
//                 session: BarcodeCaptureSession
//             ) => {
//                 setLoading(true);
//                 if (session.newlyRecognizedBarcodes.length > 0) {
//                     const scannedJson = session.newlyRecognizedBarcodes[0];

//                     await shouldKeepCameraOn();
//                     await sdk.enableScanning(false);

//                     const scannedCode = `${scannedJson.data}`;

//                     // Check if scanned code is a number
//                     if (isNaN(Number(scannedCode))) {
//                         if (mode === "cart") {
//                             toast.error("Invalid barcode");
//                             await sdk.enableScanning(true);
//                             return setLoading(false);
//                         }

//                         const urlObj = new URL(`${scannedJson.data}`);
//                         const searchParams = new URLSearchParams(urlObj.search);

//                         const pa = searchParams.get("pa");
//                         const pn = searchParams.get("pn");

//                         const { error, data } = await getRetailerByUpi({
//                             pa,
//                             pn,
//                             lat,
//                             lng,
//                             acc,
//                         });

//                         if (error || !data) {
//                             await sdk.enableScanning(true);
//                             setLoading(false);
//                             return toast.error(
//                                 error ?? "Error fetching retailer"
//                             );
//                         }

//                         setProduct({ pa, pn, lat, lng, acc, id: data.id });
//                         return setOpen(true);
//                     }

//                     setBarcode(scannedJson);
//                     const { data, error: findError } = await getProductByGtin(
//                         scannedCode
//                     );

//                     if (!findError) {
//                         setProduct(data);
//                         setOpen(true);

//                         const { error } = await addProductToCart(data);
//                         if (error) toast.error(error);
//                     } else {
//                         await sdk.enableScanning(true);
//                         toast.error(findError);
//                     }
//                 }
//                 setLoading(false);
//             },
//         }),
//         [setLoading, shouldKeepCameraOn, sdk, setBarcode, mode, lat, lng, acc]
//     );

//     useEffect(() => {
//         sdk.addBarcodeCaptureListener(onScan);
//         return () => {
//             sdk.removeBarcodeCaptureListener(onScan);
//         };
//     }, [sdk, onScan]);

//     // Reset product state when mode changes
//     useEffect(() => {
//         setProduct(null);
//     }, [mode]);

//     return (
//         <>
//             <Show when={mode === "cart"}>
//                 <CartWrapper open={open} setOpen={setOpen} product={product} />
//             </Show>

//             <Show when={mode === "deposit"}>
//                 <DepositWrapper
//                     open={open}
//                     setOpen={setOpen}
//                     retailer={product}
//                 />
//             </Show>
//         </>
//     );
// }
