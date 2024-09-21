import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
    BarcodeCapture,
    BarcodeCaptureListener,
    BarcodeCaptureSession,
} from "scandit-web-datacapture-barcode";

import { useSDK } from "./sdk";
import { useStore } from "./store";
import {
    addProductToCart,
    getAllCartItems,
    getProductByGtin,
} from "@/data-access/product";
import { CgSpinnerAlt } from "react-icons/cg";
import ProductDrawer from "../product-drawer";
import { toast } from "sonner";
import CartTrigger from "../cart-trigger";
import Show from "./Show";
import { ICart } from "@/utils/common.interface";

export default function ScannerComponent() {
    const host = useRef<HTMLDivElement | null>(null);
    const { loaded, sdk } = useSDK();
    const { barcode, setBarcode, keepCameraOn, loading, setLoading } =
        useStore();

    const [open, setOpen] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const [product, setProduct] = useState(null);
    const [cartItems, setCartItems] = useState<ICart[]>([]);

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

                    await shouldKeepCameraOn();
                    await sdk.enableScanning(false);

                    const scannedCode = `${scannedJson.data}`;

                    // Check if scanned code is a number
                    if (isNaN(Number(scannedCode))) {
                        toast.error("Invalid barcode");
                        await sdk.enableScanning(true);
                        return setLoading(false);
                    }

                    setBarcode(scannedJson);
                    const { data } = await getProductByGtin(scannedCode);

                    setProduct(data);
                    setOpen(true);

                    const { error } = await addProductToCart(data);
                    if (error) toast.error(error);
                }
                setLoading(false);
            },
        }),
        [setLoading, sdk, shouldKeepCameraOn, setBarcode]
    );

    // useEffect to attach the scanner to the host element
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

    // useEffect to toogle scanning when product drawer is opened/closed
    useEffect(() => {
        async function openHandler() {
            if (!open) await sdk.enableScanning(true);
        }

        openHandler();
    }, [open, sdk]);

    // useEffect to toogle scanning when cart drawer is opened/closed
    useEffect(() => {
        async function openHandler() {
            if (cartOpen) await sdk.enableScanning(false);
            else await sdk.enableScanning(true);
        }

        openHandler();
    }, [cartOpen, sdk]);

    const fetchCart = useCallback(async () => {
        const data = await getAllCartItems();
        setCartItems(data as unknown as ICart[]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [barcode?.data]);

    useEffect(() => {
        fetchCart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [barcode?.data]);

    return (
        <>
            <div ref={host} className="w-full h-full">
                <Show when={loading}>
                    <div className="top-1/2 left-1/2 z-50 absolute -translate-x-1/2 -translate-y-1/2">
                        <CgSpinnerAlt className="mr-2 animate-spin" size={64} />
                    </div>
                </Show>
            </div>

            <ProductDrawer open={open} setOpen={setOpen} product={product} />

            <div className="bottom-24 left-4 absolute">
                <CartTrigger
                    open={cartOpen}
                    setOpen={setCartOpen}
                    cartItems={cartItems}
                    setCartItems={setCartItems}
                    fetchCart={fetchCart}
                />
            </div>
        </>
    );
}
