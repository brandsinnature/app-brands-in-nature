"use client";

import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { IGetRetailer } from "@/utils/common.interface";
import { useEffect, useState } from "react";
import { DialogClose } from "../ui/dialog";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import Link from "next/link";
import { bulkCartStatusUpdate } from "@/data-access/product";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = {
    open: boolean;
    count: number;
    setOpen: (open: boolean) => void;
    retailer: IGetRetailer | null;
};

export default function RetailerDrawer({
    open,
    retailer,
    setOpen,
    count,
}: Props) {
    const router = useRouter();

    const [isMounted, setIsMounted] = useState(false);

    const amount =
        count * parseInt(process.env.NEXT_PUBLIC_PER_QUANTITY_COST || "5");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    const handlePayment = async () => {
        const { message, error } = await bulkCartStatusUpdate("cart", "bought");

        if (error) return toast.error(error);

        toast.success(message);
        router.push("/recycle");
    };

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>Retailer Details</DrawerTitle>
                    <DrawerDescription className="sr-only">
                        Deposit product(s) refundable amount to the retailer
                    </DrawerDescription>
                </DrawerHeader>

                <div className="space-y-1 mx-auto px-4 w-full font-normal">
                    <p>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        {retailer?.pn}
                    </p>
                    <p>
                        <span className="text-muted-foreground">UPI:</span>{" "}
                        {retailer?.pa}
                    </p>
                </div>

                <DrawerFooter className="gap-4">
                    <DialogClose asChild>
                        <Link
                            href={`upi://pay?pa=${retailer?.pa}&pn=${retailer?.pn}&am=${amount}&tn=Deposit at BIN&cu=INR`}
                        >
                            <Button
                                type="button"
                                className="rounded-full w-full"
                                onClick={handlePayment}
                            >
                                Continue to Pay ₹{amount}
                            </Button>
                        </Link>
                    </DialogClose>
                    <Separator />
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            type="button"
                            className="rounded-full w-full"
                        >
                            Scan Again
                        </Button>
                    </DialogClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
