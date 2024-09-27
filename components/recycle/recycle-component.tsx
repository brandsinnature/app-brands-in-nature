import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "../ui/button";

export default function RecycleComponent() {
    const { sdk } = useSDK();
    const { setBarcode, keepCameraOn, setLoading } = useStore();
    const { scannedItems, setScannedItems, selectedItems, cartItems } =
        useContext(RecycleContext);
    const { lat, lng, acc, getCurrentLocation } = useLocation();

    const [open, setOpen] = useState(false);

    const shouldKeepCameraOn = useCallback(async () => {
        if (!keepCameraOn) await sdk.enableCamera(false);
    }, [sdk, keepCameraOn]);

    useEffect(() => {
        getCurrentLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                        if (scannedItems?.length < 1) {
                            await sdk.enableScanning(true);
                            setLoading(false);
                            return toast.error(
                                "Scan a product first which you want to recycle"
                            );
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

                        setLoading(false);
                        return toast.success("Returned");
                    }

                    const foundCart = cartItems.filter(
                        (item) => item.product.gtin === scannedCode
                    );

                    if (foundCart.length < 1) {
                        await sdk.enableScanning(true);
                        setLoading(false);
                        return toast.error("Product not found in cart");
                    }

                    const foundSelected = selectedItems.find(
                        (item) => item.product.gtin === scannedCode
                    );

                    if (!foundSelected) {
                        setOpen(true);
                        return setLoading(false);
                    }

                    // Handle case where item is not in selectedItems
                    setScannedItems([...scannedItems, foundSelected]);
                    await sdk.enableScanning(true);
                }
                setLoading(false);
            },
        }),
        [
            setLoading,
            sdk,
            shouldKeepCameraOn,
            setBarcode,
            cartItems,
            selectedItems,
            setScannedItems,
            scannedItems,
            lat,
            lng,
            acc,
        ]
    );

    useEffect(() => {
        sdk.addBarcodeCaptureListener(onScan);
        return () => {
            sdk.removeBarcodeCaptureListener(onScan);
        };
    }, [sdk, onScan]);

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                        <DrawerTitle>Product not selected</DrawerTitle>
                        <DrawerDescription>
                            Add the product to the recycle bag
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 pb-0"></div>
                    <DrawerFooter>
                        <Button>Add</Button>
                        <DrawerClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
