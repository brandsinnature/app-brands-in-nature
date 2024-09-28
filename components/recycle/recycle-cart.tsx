import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useCallback, useContext, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package, ScanEye } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { RecycleContext } from "./recycle-rcc";
import { cn } from "@/lib/utils";

type Props = {};

export default function RecycleCart({}: Props) {
    const { scannedItems, selectedItems } = useContext(RecycleContext);
    const [open, setOpen] = useState(false);

    const [isMounted, setIsMounted] = useState(false);

    const costPerQuantity = parseInt(
        process.env.NEXT_PUBLIC_PER_QUANTITY_COST || "5"
    );

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    const totalItems = scannedItems.length || 0;

    const totalQuantity = scannedItems.reduce(
        (acc, item) => acc + item.quantity,
        0
    );

    const isScanned = (id: string) =>
        scannedItems.some((item) => item.id === id);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size={"icon"}
                    className="bottom-4 left-4 z-50 fixed rounded-full w-12 h-12"
                >
                    <span className="-top-2 -right-2 absolute bg-yellow-500 px-2 py-1 rounded-full font-bold text-xs text-yellow-900">
                        {totalItems}
                    </span>
                    <ScanEye size={28} />
                </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col gap-10 w-screen h-dvh overflow-auto">
                <DialogHeader>
                    <DialogTitle className="bg-primary/30 mx-auto px-4 py-1 rounded-full w-fit font-medium text-sm">
                        Recycle bag
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Your shopping bag
                    </DialogDescription>
                </DialogHeader>
                <div className="gap-4 grid text-center">
                    <p className="mx-auto max-w-80 font-voska text-2xl">
                        You will get ₹{totalQuantity * costPerQuantity}.00
                        refund when you recycle.
                    </p>

                    <div className="space-y-6">
                        {selectedItems.map(({ id, product, quantity }) => (
                            <div
                                key={id}
                                className={cn(
                                    "flex justify-between items-center gap-3 p-3 rounded-xl bg-muted/40",
                                    isScanned(id) && "bg-primary/30"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <span className="-top-2 -right-2 z-10 absolute bg-yellow-500 px-2 py-1 rounded-full font-bold text-xs text-yellow-900">
                                            {quantity}
                                        </span>
                                        <Avatar>
                                            <AvatarImage
                                                src={`${product?.images?.front}`}
                                                alt={product?.name || "--"}
                                            />
                                            <AvatarFallback>
                                                <Package
                                                    size={28}
                                                    strokeWidth={1}
                                                    className="text-muted-foreground"
                                                />
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>

                                    <div className="space-y-1 text-left">
                                        <p className="font-medium text-left text-sm">
                                            {product?.name || "--"}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            {product?.description || "--"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter className="mt-auto">
                    <Link href="/deposit">
                        <Button className="w-full">
                            Deposit {totalItems} packages
                        </Button>
                    </Link>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
