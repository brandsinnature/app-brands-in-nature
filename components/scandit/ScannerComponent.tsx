import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
    BarcodeCapture,
    BarcodeCaptureListener,
    BarcodeCaptureSession,
} from "scandit-web-datacapture-barcode";

import { useSDK } from "./sdk";
import { useStore } from "./store";
import { addProductToCart, getProductByGtin } from "@/data-access/product";
import { CgSpinnerAlt } from "react-icons/cg";
import ProductDrawer from "../product-drawer";
import { toast } from "sonner";
import CartTrigger from "../cart-trigger";
import { useRouter } from "next/navigation";

export default function ScannerComponent() {
    const host = useRef<HTMLDivElement | null>(null);
    const { loaded, sdk } = useSDK();
    const { setBarcode, keepCameraOn, loading, setLoading } = useStore();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const [product, setProduct] = useState(null);

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
                setLoading(true);
                if (session.newlyRecognizedBarcodes.length > 0) {
                    const scannedJson = session.newlyRecognizedBarcodes[0];

                    await sdk.enableScanning(false);
                    await shouldKeepCameraOn();
                    setBarcode(scannedJson);

                    const { data } = await getProductByGtin(
                        `${scannedJson.data}`
                    );

                    setProduct(data);
                    setOpen(true);

                    const { error } = await addProductToCart(data);
                    if (error) toast.error(error);
                    router.refresh();
                }
                setLoading(false);
            },
        }),
        [setLoading, sdk, shouldKeepCameraOn, setBarcode]
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

    useEffect(() => {
        async function openHandler() {
            if (!open) await sdk.enableScanning(true);
        }

        openHandler();
    }, [open, sdk]);

    useEffect(() => {
        async function openHandler() {
            if (cartOpen) await sdk.enableScanning(false);
            else await sdk.enableScanning(true);
        }

        openHandler();
    }, [cartOpen, sdk]);

    return (
        <>
            <div ref={host} className="w-full h-full">
                {loading && (
                    <div className="top-1/2 left-1/2 z-50 absolute -translate-x-1/2 -translate-y-1/2">
                        <CgSpinnerAlt className="mr-2 animate-spin" size={64} />
                    </div>
                )}
            </div>

            <ProductDrawer open={open} setOpen={setOpen} product={product} />

            <div className="bottom-24 left-4 absolute">
                <CartTrigger open={cartOpen} setOpen={setCartOpen} />
            </div>
        </>
    );
}
