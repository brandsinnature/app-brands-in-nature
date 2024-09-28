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
} from "@/components/ui/drawer";
import { Button } from "../ui/button";
import { ICart, IGetRetailer } from "@/utils/common.interface";
import RecycleConfirmation from "./recycle-confirmation";

export default function RecycleComponent() {
    const { sdk } = useSDK();
    const { setBarcode, keepCameraOn, setLoading } = useStore();
    const {
        scannedItems,
        setScannedItems,
        selectedItems,
        cartItems,
        setSelectedItems,
    } = useContext(RecycleContext);
    const { lat, lng, acc, getCurrentLocation } = useLocation();

    const [open, setOpen] = useState(false);
    const [foundCartItem, setFoundCartItem] = useState<ICart | null>(null);
    const [recycleConfirmation, setRecycleConfirmation] = useState(false);
    const [retailer, setRetailer] = useState<IGetRetailer | null>(null);

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
                            await wait();
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

                        setLoading(false);

                        if (error || !data) {
                            await sdk.enableScanning(true);
                            return toast.error(
                                error ?? "Error fetching retailer"
                            );
                        }

                        setRecycleConfirmation(true);
                        return setRetailer({
                            pa,
                            pn,
                            lat,
                            lng,
                            acc,
                            id: data.id,
                        });
                    }

                    const foundCart = cartItems.filter(
                        (item) => item.product.gtin === scannedCode
                    );

                    if (foundCart.length < 1) {
                        await sdk.enableScanning(true);
                        setLoading(false);
                        return toast.error("Product not found in cart");
                    }

                    setFoundCartItem(foundCart[0]);

                    const foundSelected = selectedItems.filter(
                        (item) => item.product.gtin === scannedCode
                    );

                    if (!foundSelected) {
                        setOpen(true);
                        return setLoading(false);
                    }

                    setScannedItems([...scannedItems, foundSelected[0]]);

                    toast.success("Product added to recycle bag");
                    await wait();
                    await sdk.enableScanning(true);
                }
                setLoading(false);
            },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [setLoading, sdk, shouldKeepCameraOn, setBarcode, scannedItems]
    );

    useEffect(() => {
        sdk.addBarcodeCaptureListener(onScan);
        return () => {
            sdk.removeBarcodeCaptureListener(onScan);
        };
    }, [sdk, onScan]);

    // useEffect to toggle scanning when main drawer is opened/closed
    useEffect(() => {
        async function openHandler() {
            if (!open) await sdk.enableScanning(true);
        }

        openHandler();
    }, [open, sdk]);

    // useEffect to toggle scanning when confirmation drawer is opened/closed
    useEffect(() => {
        async function openHandler() {
            if (!recycleConfirmation) await sdk.enableScanning(true);
        }

        openHandler();
    }, [recycleConfirmation, sdk]);

    const handleSelect = () => {
        if (foundCartItem) {
            setSelectedItems([...selectedItems, foundCartItem]);
            setScannedItems([...scannedItems, foundCartItem]);
        }

        toast.success("Product added to recycle bag");
        setOpen(false);
    };

    // wait so that it does'nt multiple times immediately
    const wait = async (time?: number) => {
        await new Promise((resolve) => setTimeout(resolve, time ?? 3000));
    };

    return (
        <>
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-sm">
                        <DrawerHeader className="text-left">
                            <DrawerTitle className="font-normal font-voska text-2xl tracking-[0.0125em]">
                                Product not in recycle bag
                            </DrawerTitle>
                            <DrawerDescription>
                                Add the product to the recycle bag?
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="p-4 pb-0"></div>
                        <DrawerFooter>
                            <Button onClick={handleSelect}>Add Product</Button>
                            <DrawerClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>

            <RecycleConfirmation
                open={recycleConfirmation}
                setOpen={setRecycleConfirmation}
                retailer={retailer}
            />
        </>
    );
}
