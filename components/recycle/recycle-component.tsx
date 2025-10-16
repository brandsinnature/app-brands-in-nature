import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useStore } from "../scandit/store";
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
import UnifiedScanner from "../scandit/UnifiedScanner";
import { parseUPIString, validateUPIData } from "@/utils/upiParser";

export default function RecycleComponent() {
  // const { sdk } = useSDK();
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
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<"products" | "retailer">("products");

  // const shouldKeepCameraOn = useCallback(async () => {
  //     if (!keepCameraOn) await sdk.enableCamera(false);
  // }, [sdk, keepCameraOn]);

  useEffect(() => {
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = useCallback(
    async (data: string, type: "barcode" | "qr") => {
      setIsScanning(true);
      setLoading(true);

      try {
        if (type === "barcode" && scanMode === "products") {
          // Handle product barcode scanning
          const foundCart = cartItems.filter(
            (item) => item.product.gtin === data
          );

          if (foundCart.length < 1) {
            toast.error("Product not found in selected items");
            return;
          }

          const foundSelected = selectedItems.filter(
            (item) => item.product.gtin === data
          );

          if (foundSelected.length === 0) {
            setFoundCartItem(foundCart[0]);
            setOpen(true);
            return;
          }

          // Add to scanned items
          setScannedItems([...scannedItems, foundSelected[0]]);
          toast.success("Product added to recycle bag");
        } else if (type === "qr" && scanMode === "retailer") {
          // Handle retailer QR scanning
          const upiData = parseUPIString(data);

          if (!upiData || !validateUPIData(upiData)) {
            toast.error("Invalid UPI QR code");
            return;
          }

          const { error, data: retailerData } = await getRetailerByUpi({
            pa: upiData.pa,
            pn: upiData.pn,
            lat,
            lng,
            acc,
          });

          if (error || !retailerData) {
            toast.error(error ?? "Error fetching retailer");
            return;
          }

          setRetailer({
            pa: upiData.pa,
            pn: upiData.pn,
            lat,
            lng,
            acc,
            id: retailerData.id,
          });
          setRecycleConfirmation(true);
        }
      } catch (error) {
        console.error("Scan processing error:", error);
        toast.error("Error processing scan");
      } finally {
        setIsScanning(false);
        setLoading(false);
      }
    },
    [
      scanMode,
      cartItems,
      selectedItems,
      scannedItems,
      setScannedItems,
      lat,
      lng,
      acc,
      setLoading,
    ]
  );

  const handleScanError = useCallback(
    (error: string) => {
      console.error("Scanner error:", error);
      toast.error(error);
      setIsScanning(false);
      setLoading(false);
    },
    [setLoading]
  );

  // const onScan = useMemo<BarcodeCaptureListener>(
  //     () => ({
  //         didScan: async (
  //             _: BarcodeCapture,
  //             session: BarcodeCaptureSession
  //         ) => {
  //             setLoading(true);
  //             if (session.newlyRecognizedBarcodes.length > 0) {
  //                 const scannedJson = session.newlyRecognizedBarcodes[0];

  //                 await sdk.enableScanning(false);
  //                 await shouldKeepCameraOn();
  //                 setBarcode(scannedJson);

  //                 const scannedCode = `${scannedJson.data}`;

  //                 if (isNaN(Number(scannedCode))) {
  //                     const urlObj = new URL(`${scannedJson.data}`);
  //                     const searchParams = new URLSearchParams(urlObj.search);

  //                     const pa = searchParams.get("pa");
  //                     const pn = searchParams.get("pn");

  //                     const { error, data } = await getRetailerByUpi({
  //                         pa,
  //                         pn,
  //                         lat,
  //                         lng,
  //                         acc,
  //                     });

  //                     setLoading(false);

  //                     if (error || !data) {
  //                         await sdk.enableScanning(true);
  //                         return toast.error(
  //                             error ?? "Error fetching retailer"
  //                         );
  //                     }

  //                     setRecycleConfirmation(true);
  //                     return setRetailer({
  //                         pa,
  //                         pn,
  //                         lat,
  //                         lng,
  //                         acc,
  //                         id: data.id,
  //                     });
  //                 }

  //                 const foundCart = cartItems.filter(
  //                     (item) => item.product.gtin === scannedCode
  //                 );

  //                 if (foundCart.length < 1) {
  //                     await sdk.enableScanning(true);
  //                     setLoading(false);
  //                     return toast.error("Product not found in cart");
  //                 }

  //                 setFoundCartItem(foundCart[0]);

  //                 const foundSelected = selectedItems.filter(
  //                     (item) => item.product.gtin === scannedCode
  //                 );

  //                 if (!foundSelected) {
  //                     setOpen(true);
  //                     return setLoading(false);
  //                 }

  //                 setScannedItems([...scannedItems, foundSelected[0]]);

  //                 toast.success("Product added to recycle bag");
  //                 await wait();
  //                 await sdk.enableScanning(true);
  //             }
  //             setLoading(false);
  //         },
  //     }),
  //     // eslint-disable-next-line react-hooks/exhaustive-deps
  //     [
  //         setLoading,
  //         sdk,
  //         shouldKeepCameraOn,
  //         setBarcode,
  //         cartItems,
  //         selectedItems,
  //         // setScannedItems,
  //         // scannedItems,
  //         lat,
  //         lng,
  //         acc,
  //     ]
  // );

  // useEffect(() => {
  //     sdk.addBarcodeCaptureListener(onScan);
  //     return () => {
  //         sdk.removeBarcodeCaptureListener(onScan);
  //     };
  // }, [sdk, onScan]);

  // // useEffect to toggle scanning when main drawer is opened/closed
  // useEffect(() => {
  //     async function openHandler() {
  //         if (!open) await sdk.enableScanning(true);
  //     }

  //     openHandler();
  // }, [open, sdk]);

  // // useEffect to toggle scanning when confirmation drawer is opened/closed
  // useEffect(() => {
  //     async function openHandler() {
  //         if (!recycleConfirmation) await sdk.enableScanning(true);
  //     }

  //     openHandler();
  // }, [recycleConfirmation, sdk]);

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
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-semibold mb-2">
            {scanMode === "products"
              ? "Scan Product Barcodes"
              : "Scan Retailer QR Code"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {scanMode === "products"
              ? "Scan barcodes of products you want to recycle"
              : "Scan the retailer's UPI QR code to complete recycling"}
          </p>
        </div>

        <div className="w-full max-w-md h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden">
          <UnifiedScanner
            onScan={handleScan}
            onError={handleScanError}
            paused={isScanning}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant={scanMode === "products" ? "default" : "outline"}
            onClick={() => setScanMode("products")}
            disabled={isScanning}
          >
            Scan Products
          </Button>
          <Button
            variant={scanMode === "retailer" ? "default" : "outline"}
            onClick={() => setScanMode("retailer")}
            disabled={isScanning}
          >
            Scan Retailer QR
          </Button>
        </div>
      </div>

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
