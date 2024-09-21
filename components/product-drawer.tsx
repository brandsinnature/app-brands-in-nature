"use client";

import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package } from "lucide-react";
import { CompleteProduct } from "@/utils/common.interface";
import { DialogClose } from "./ui/dialog";
import { Badge } from "./ui/badge";
import AddProductDialog from "./dialogs/add-product";
import Show from "./scandit/Show";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
    product: CompleteProduct | null;
};

export default function ProductDrawer({ open, product, setOpen }: Props) {
    const [isMounted, setIsMounted] = useState(false);

    const code = product?.gtin;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent>
                <div className="mx-auto w-full">
                    <Show when={!!product?.gtin}>
                        <ProductCardView product={product!} />
                    </Show>
                    <Show when={!product?.gtin}>
                        <NoProductFoundView code={code} />
                    </Show>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

const ProductCardView = ({ product }: { product: CompleteProduct }) => {
    return (
        <>
            <p className="ml-4 font-light text-muted-foreground text-xs">
                #{product?.gtin}
            </p>
            <DrawerHeader className="gap-4 text-left">
                <DrawerTitle asChild>
                    <div className="flex items-center gap-3">
                        <Avatar className="w-20 h-20">
                            <AvatarImage
                                src={`${product?.images?.front}`}
                                alt={product?.name || "--"}
                            />
                            <AvatarFallback>
                                <Package size={44} strokeWidth={1} />
                            </AvatarFallback>
                        </Avatar>

                        <div className="space-y-2">
                            <p className="font-semibold">
                                {product?.name || "--"}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {product?.description || "--"}
                            </p>
                        </div>
                    </div>
                </DrawerTitle>
                <DrawerDescription asChild>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">Brand: {product.brand}</Badge>
                        {product?.weights_and_measures?.net_weight && (
                            <Badge variant="outline">
                                Net weight:{" "}
                                {product.weights_and_measures.net_weight}{" "}
                                {product.weights_and_measures?.measurement_unit}
                            </Badge>
                        )}
                    </div>
                </DrawerDescription>
            </DrawerHeader>

            <DrawerFooter>
                <DialogClose asChild>
                    <Button
                        variant="outline"
                        type="button"
                        className="rounded-full w-full"
                    >
                        Continue scanning
                    </Button>
                </DialogClose>
            </DrawerFooter>
        </>
    );
};

const NoProductFoundView = ({ code }: { code?: string }) => {
    const [productDialog, setProductDialog] = useState(false);

    return (
        <>
            <DrawerHeader className="text-left">
                <DrawerTitle>What product is this?</DrawerTitle>
                <DrawerDescription>
                    This helps us in calculate the CO<sub>2</sub> value and give
                    you recycling instructions.
                </DrawerDescription>
            </DrawerHeader>

            <DrawerFooter className="flex-row gap-4">
                <AddProductDialog
                    open={productDialog}
                    setOpen={setProductDialog}
                    code={code || "0000000000000"}
                />
                <DialogClose asChild>
                    <Button
                        variant="outline"
                        type="button"
                        className="rounded-full"
                    >
                        Continue scanning
                    </Button>
                </DialogClose>
            </DrawerFooter>
        </>
    );
};
