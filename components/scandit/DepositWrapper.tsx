import { useEffect, useState, useCallback, useMemo } from "react";
import CartTrigger from "../cart-trigger";
import ProductDrawer from "../product-drawer";
import { ICart } from "@/utils/common.interface";
import {
    addProductToCart,
    getAllCartItems,
    getProductByGtin,
} from "@/data-access/product";
import { useSDK } from "./sdk";
import { useStore } from "./store";
import { toast } from "sonner";
import {
    BarcodeCapture,
    BarcodeCaptureListener,
    BarcodeCaptureSession,
} from "scandit-web-datacapture-barcode";

export default function DepositWrapper() {
    const { sdk } = useSDK();
    const { setBarcode, keepCameraOn, setLoading } = useStore();
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

    useEffect(() => {
        sdk.addBarcodeCaptureListener(onScan);
        return () => {
            sdk.removeBarcodeCaptureListener(onScan);
        };
    }, [sdk, onScan]);

    // useEffect to toggle scanning when product drawer is opened/closed
    useEffect(() => {
        async function openHandler() {
            if (!open) await sdk.enableScanning(true);
        }

        openHandler();
        fetchCart();
    }, [open, sdk]);

    // useEffect to toggle scanning when cart drawer is opened/closed
    useEffect(() => {
        async function openHandler() {
            if (cartOpen) await sdk.enableScanning(false);
            else await sdk.enableScanning(true);
        }

        openHandler();
    }, [cartOpen, sdk]);

    async function fetchCart() {
        const data = await getAllCartItems();
        setCartItems(data as unknown as ICart[]);
    }

    return (
        <>
            <ProductDrawer open={open} setOpen={setOpen} product={product} />

            <div className="bottom-24 left-4 absolute">
                <CartTrigger
                    open={cartOpen}
                    setOpen={setCartOpen}
                    fetchCart={fetchCart}
                    cartItems={cartItems}
                    setCartItems={setCartItems}
                />
            </div>
        </>
    );
}
