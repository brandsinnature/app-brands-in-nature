import { useCallback, useContext, useEffect, useMemo } from "react";
import {
    BarcodeCapture,
    BarcodeCaptureListener,
    BarcodeCaptureSession,
} from "scandit-web-datacapture-barcode";
import { useStore } from "../scandit/store";
import { useSDK } from "../scandit/sdk";
import { RecycleContext } from "./recycle-rcc";
import { getRetailerByUpi } from "@/data-access/product";
import { toast } from "sonner";
import { useLocation } from "@/hooks/useLocation";

export default function RecycleComponent() {
    const { sdk } = useSDK();
    const { setBarcode, keepCameraOn, setLoading } = useStore();
    const { scannedItems, setScannedItems } = useContext(RecycleContext);
    const { lat, lng, acc, getCurrentLocation } = useLocation();

    const shouldKeepCameraOn = useCallback(async () => {
        if (!keepCameraOn) await sdk.enableCamera(false);
    }, [sdk, keepCameraOn]);

    const onScan = useMemo<BarcodeCaptureListener>(
        () => ({
            didScan: async (
                _: BarcodeCapture,
                session: BarcodeCaptureSession
            ) => {
                setLoading(true);
                if (session.newlyRecognizedBarcodes.length > 0) {
                    const scannedJson = session.newlyRecognizedBarcodes[0];

                    await sdk.enableScanning(false);
                    await shouldKeepCameraOn();
                    setBarcode(scannedJson);

                    const scannedCode = `${scannedJson.data}`;

                    if (isNaN(Number(scannedCode))) {
                        if (scannedItems?.length < 1)
                            toast.error(
                                "Scan a product first which you want to recycle"
                            );

                        const urlObj = new URL(`${scannedJson.data}`);
                        const searchParams = new URLSearchParams(urlObj.search);

                        const pa = searchParams.get("pa");
                        const pn = searchParams.get("pn");

                        const { error, data } = await getRetailerByUpi({
                            pa,
                            pn,
                            lat,
                            lng,
                            acc,
                        });

                        if (error || !data) {
                            await sdk.enableScanning(true);
                            setLoading(false);
                            return toast.error(
                                error ?? "Error fetching retailer"
                            );
                        }
                    }
                }
                setLoading(false);
            },
        }),
        [setLoading, sdk, shouldKeepCameraOn, setBarcode, lat, lng, acc]
    );

    useEffect(() => {
        sdk.addBarcodeCaptureListener(onScan);
        return () => {
            sdk.removeBarcodeCaptureListener(onScan);
        };
    }, [sdk, onScan]);

    return <div>RecycleComponent</div>;
}