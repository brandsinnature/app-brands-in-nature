import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
    BarcodeCapture,
    BarcodeCaptureListener,
    BarcodeCaptureSession,
} from "scandit-web-datacapture-barcode";

import { useSDK } from "./sdk";
import { useStore } from "./store";
import { getProductByGtin } from "@/data-access/product";

export default function ScannerComponent() {
    const host = useRef<HTMLDivElement | null>(null);
    const { loaded, sdk } = useSDK();
    const { setBarcode, keepCameraOn } = useStore();

    const shouldKeepCameraOn = useCallback(async () => {
        if (!keepCameraOn) {
            await sdk.enableCamera(false);
        }
    }, [sdk, keepCameraOn]);

    const onScan = useMemo<BarcodeCaptureListener>(
        () => ({
            didScan: async (
                _: BarcodeCapture,
                session: BarcodeCaptureSession
            ) => {
                if (session.newlyRecognizedBarcodes.length > 0) {
                    const gtin = session.newlyRecognizedBarcodes[0].data;

                    await sdk.enableScanning(false);
                    await shouldKeepCameraOn();
                    setBarcode(session.newlyRecognizedBarcodes[0]);

                    await getProductByGtin(`${gtin}`);

                    //handle barcode data
                    alert(session.newlyRecognizedBarcodes[0].data);
                }
            },
        }),
        [setBarcode, sdk, shouldKeepCameraOn]
    );

    useEffect(() => {
        async function onMount(): Promise<void> {
            if (loaded && host.current) {
                sdk.connectToElement(host.current);
                await sdk.enableCamera(true);
                await sdk.enableScanning(true);

                sdk.addBarcodeCaptureListener(onScan);
            }
        }

        void onMount();
        return () => {
            if (loaded) {
                sdk.removeBarcodeCaptureListener(onScan);
                sdk.detachFromElement();
            }
        };
    }, [loaded, sdk, onScan]);

    return <div ref={host} className="w-full h-full" />;
}
