import { useEffect, useState, useCallback, useMemo } from "react";
import {
    addProductToCart,
    getProductByGtin,
    getRetailerByUpi,
} from "@/data-access/product";
import { useSDK } from "./sdk";
import { useStore } from "./store";
import { toast } from "sonner";
import {
    BarcodeCapture,
    BarcodeCaptureListener,
    BarcodeCaptureSession,
} from "scandit-web-datacapture-barcode";
import Show from "./Show";
import CartWrapper from "./CartWrapper";
import { parseAsString, useQueryState } from "next-usequerystate";
import { useLocation } from "@/hooks/useLocation";
import DepositWrapper from "./DepositWrapper";

export default function ScannerComponent() {
    const { sdk } = useSDK();
    const { setBarcode, keepCameraOn, setLoading } = useStore();
    const [open, setOpen] = useState(false);
    const [product, setProduct] = useState<any>(null);
    const { lat, lng, acc, getCurrentLocation } = useLocation();

    const [mode, _] = useQueryState("mode", parseAsString.withDefault("cart"));

    useEffect(() => {
        getCurrentLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

                    await shouldKeepCameraOn();
                    await sdk.enableScanning(false);

                    const scannedCode = `${scannedJson.data}`;

                    // Check if scanned code is a number
                    if (isNaN(Number(scannedCode))) {
                        if (mode === "cart") {
                            toast.error("Invalid barcode");
                            await sdk.enableScanning(true);
                            return setLoading(false);
                        }

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

                        setProduct({ pa, pn, lat, lng, acc, id: data.id });
                        return setOpen(true);
                    }

                    setBarcode(scannedJson);
                    const { data, error: findError } = await getProductByGtin(
                        scannedCode
                    );

                    if (!findError) {
                        setProduct(data);
                        setOpen(true);

                        const { error } = await addProductToCart(data);
                        if (error) toast.error(error);
                    } else {
                        await sdk.enableScanning(true);
                        toast.error(findError);
                    }
                }
                setLoading(false);
            },
        }),
        [setLoading, shouldKeepCameraOn, sdk, setBarcode, mode, lat, lng, acc]
    );

    useEffect(() => {
        sdk.addBarcodeCaptureListener(onScan);
        return () => {
            sdk.removeBarcodeCaptureListener(onScan);
        };
    }, [sdk, onScan]);

    // Reset product state when mode changes
    useEffect(() => {
        setProduct(null);
    }, [mode]);

    return (
        <>
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
