import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createContext, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { ICart, IRecycleContext } from "@/utils/common.interface";
import RecycleProviderWrapper from "./recycle-provider-wrapper";
import RecycleCart from "./recycle-cart";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
    selectedItems: ICart[];
};

export const RecycleContext = createContext<IRecycleContext>({
    selectedItems: [],
    scannedItems: [],
    setScannedItems: () => {},
});

export default function RecycleRcc({ open, setOpen, selectedItems }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    const [scannedItems, setScannedItems] = useState<ICart[]>([]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const totalChecked = selectedItems?.length || 0;

    if (!isMounted) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className="bottom-20 left-0 fixed mx-2 w-[calc(100%-1rem)]"
                    onClick={() => setOpen(true)}
                    disabled={!totalChecked}
                >
                    Recycle {totalChecked} packages
                </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col justify-between items-start gap-10 p-0 w-screen h-dvh overflow-hidden">
                <DialogHeader className="z-50 bg-background shadow-lg px-4 py-6 rounded-b-3xl w-full text-left">
                    <DialogTitle className="font-normal font-voska text-2xl text-left tracking-[0.0125em]">
                        Recycling {totalChecked} package(s)
                    </DialogTitle>
                    <DialogDescription>
                        Scan barcode of selected items to start recycling. Once
                        done scanning products, scan Retailer&apos;s QR code to
                        complete recycling process.
                    </DialogDescription>
                </DialogHeader>
                <RecycleContext.Provider
                    value={{
                        scannedItems,
                        setScannedItems,
                        selectedItems,
                    }}
                >
                    <RecycleProviderWrapper />

                    <RecycleCart />
                </RecycleContext.Provider>
            </DialogContent>
        </Dialog>
    );
}
