"use client";

import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createProduct } from "@/data-access/product";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package, PackageSearch } from "lucide-react";
import { CompleteProduct } from "@/utils/common.interface";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { IoAddCircle } from "react-icons/io5";
import { DialogClose } from "./ui/dialog";
import { Badge } from "./ui/badge";

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
                    {product ? (
                        <ProductCardView product={product} />
                    ) : (
                        <NoProductFoundView />
                    )}

                    {/* <DrawerHeader className="text-left">
                        <DrawerTitle>Product details</DrawerTitle>
                        <DrawerDescription>#{code}</DrawerDescription>
                    </DrawerHeader>

                    {product ? (
                        product?.brand ? (
                            <ProductCardView product={product} />
                        ) : (
                            <NoProductFoundView code={code} />
                        )
                    ) : (
                        <ProductScanError />
                    )} */}
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

            {/* <div className="space-y-3 p-4">
                <div className="space-y-2 ps-3">
                    <p className="text-muted-foreground text-sm">
                        {product?.description}
                    </p>
                    <div className="flex items-center gap-2">
                        <p className="text-muted-foreground text-sm">Brand:</p>
                        <p className="font-semibold">
                            {product?.brand || "--"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-muted-foreground text-sm">
                            Country of Origin:
                        </p>
                        <p className="font-semibold">
                            {product?.country_of_origin || "--"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-muted-foreground text-sm">
                            Sku Code:
                        </p>
                        <p className="font-semibold">
                            {product?.sku_code || "--"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-muted-foreground text-sm">
                            Packaging Type:
                        </p>
                        <p className="font-semibold">
                            {product?.packaging_type || "--"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-muted-foreground text-sm">
                            Activation Date:
                        </p>
                        <p className="font-semibold">
                            {format(
                                new Date(
                                    (product?.activation_date ||
                                        product?.created_date) ??
                                        ""
                                ),
                                "PP"
                            )}
                        </p>
                    </div>
                </div>
            </div>
            <DrawerFooter className="gap-4">
                {isProductValid ? (
                    <Button
                        onClick={handleProductCreate}
                        disabled={loading}
                        loading={loading}
                        type="submit"
                    >
                        Add product
                    </Button>
                ) : (
                    <div>
                        <Link
                            href={`/scan/${product?.gtin ?? ""}?name=${
                                product?.name ?? ""
                            }&brand=${product?.brand ?? ""}&category=${
                                product?.category ?? ""
                            }&sub_category=${
                                product?.sub_category ?? ""
                            }&description=${
                                product?.description ?? ""
                            }&country_of_origin=${
                                product?.country_of_origin ?? ""
                            }&net_weight=${
                                product?.weights_and_measures?.net_weight ?? ""
                            }&measurement_unit=${
                                product?.weights_and_measures
                                    ?.measurement_unit ?? ""
                            }`}
                        >
                            <Button
                                disabled={loading}
                                loading={loading}
                                type="button"
                                className="w-full"
                            >
                                Complete product details
                            </Button>
                        </Link>
                    </div>
                )}
                <DrawerClose asChild>
                    <Button variant="outline" disabled={loading} type="button">
                        Close
                    </Button>
                </DrawerClose>
            </DrawerFooter> */}
        </>
    );
};

const NoProductFoundView = () => {
    const [loading, setLoading] = useState(false);

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
                <div onClick={() => setLoading(true)}>
                    <Link href={`/scan/${"code" ?? "create"}`}>
                        <Button
                            className="border-primary rounded-full text-primary"
                            type="button"
                            variant={"outline"}
                            loading={loading}
                            disabled={loading}
                        >
                            <IoAddCircle className="mr-2 w-6 h-6" /> Add product
                        </Button>
                    </Link>
                </div>
                <DialogClose asChild>
                    <Button
                        variant="outline"
                        type="button"
                        disabled={loading}
                        className="rounded-full"
                    >
                        Continue scanning
                    </Button>
                </DialogClose>
            </DrawerFooter>
        </>
    );
};
