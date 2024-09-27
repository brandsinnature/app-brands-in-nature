import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
    BarcodeCapture,
    BarcodeCaptureListener,
    BarcodeCaptureSession,
} from "scandit-web-datacapture-barcode";
import { useSDK } from "./sdk";
import { useStore } from "./store";
import { CgSpinnerAlt } from "react-icons/cg";
import { useLocation } from "@/hooks/useLocation";
import { countCartItems, getRetailerByUpi } from "@/data-access/product";
import { toast } from "sonner";
import { IGetRetailer } from "@/utils/common.interface";
import RetailerDrawer from "../drawers/retailer-drawer";

export default function DepositComponent() {
    const { sdk } = useSDK();
    const { setBarcode, keepCameraOn, setLoading } = useStore();
    const { lat, lng, acc, getCurrentLocation } = useLocation();

    const [open, setOpen] = useState(false);
    const [count, setCount] = useState(0);
    const [retailer, setRetailer] = useState<IGetRetailer | null>(null);

    const getCartItemsCount = useCallback(async () => {
        const count = await countCartItems();
        setCount(count || 0);
    }, []);

    useEffect(() => {
        getCurrentLocation();
        getCartItemsCount();
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

                    await sdk.enableScanning(false);
                    await shouldKeepCameraOn();
                    setBarcode(scannedJson);

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
                        return toast.error(error ?? "Error fetching retailer");
                    }

                    setRetailer({ pa, pn, lat, lng, acc, id: data.id });
                    setOpen(true);
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

    useEffect(() => {
        async function openHandler() {
            if (!open) await sdk.enableScanning(true);
        }

        openHandler();
    }, [open, sdk]);

    return (
        <RetailerDrawer
            open={open}
            setOpen={setOpen}
            retailer={retailer}
            count={count}
        />
    );
}
