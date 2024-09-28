import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { returnProducts } from "@/data-access/product";
import { IGetRetailer } from "@/utils/common.interface";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { RecycleContext } from "./recycle-rcc";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Package } from "lucide-react";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
    retailer: IGetRetailer | null;
};

export default function RecycleConfirmation({
    open,
    setOpen,
    retailer,
}: Props) {
    const router = useRouter();
    const { scannedItems } = useContext(RecycleContext);

    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        return () => {
            setMounted(false);
        };
    }, []);

    if (!mounted) return null;

    const handleRecycle = async () => {
        setLoading(true);
        const { error: returnError } = await returnProducts({
            merchantId: `${retailer?.id}`,
            productIds: scannedItems.map((item) => item.id),
        });

        if (!returnError) return router.push("/recycle/success");

        setLoading(false);
        setOpen(false);
        toast.error(returnError);
    };

    const quantity = scannedItems.length || 0;

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                        <DrawerTitle className="font-normal font-voska text-2xl tracking-[0.0125em]">
                            <div className="relative mx-auto mb-3 w-fit">
                                <span className="-top-2 -right-2 z-10 absolute bg-yellow-500 px-2 py-1 rounded-full font-bold text-xs text-yellow-900">
                                    {quantity}
                                </span>
                                <div className="bg-primary/50 p-2 rounded-full">
                                    <Package
                                        size={48}
                                        strokeWidth={1}
                                        className="text-white"
                                    />
                                </div>
                            </div>
                            Ready to finish recycling?
                        </DrawerTitle>
                        <DrawerDescription className="sr-only">
                            Recycling Confirmation
                        </DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                        <Button
                            onClick={handleRecycle}
                            disabled={loading}
                            loading={loading}
                        >
                            Continue
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" disabled={loading}>
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
