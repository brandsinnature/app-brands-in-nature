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
import { useState } from "react";
import { toast } from "sonner";
import { createProduct } from "@/data-access/product";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PackageSearch } from "lucide-react";
import { CompleteProduct } from "@/utils/common.interface";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
    product: CompleteProduct | null;
    code: string;
};

export default function ProductDrawer({ open, setOpen, product, code }: Props) {
    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader className="text-left">
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
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}

const ProductCardView = ({ product }: { product: CompleteProduct }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const isProductValid =
        product?.name &&
        product?.brand &&
        product?.category &&
        product?.sub_category &&
        product?.description &&
        product?.country_of_origin &&
        product?.weights_and_measures?.net_weight &&
        product?.weights_and_measures?.measurement_unit;

    const handleProductCreate = async () => {
        setLoading(true);

        const { error } = await createProduct(product);

        setLoading(false);

        if (error) return toast.error(error);

        toast.success("Product added successfully");
        router.push("/");
    };

    return (
        <>
            <div className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                    <Avatar className="w-20 h-20">
                        <AvatarImage
                            src={`${product?.images?.front}`}
                            alt={product?.name || "--"}
                        />
                        <AvatarFallback>
                            <PackageSearch size={44} strokeWidth={1} />
                        </AvatarFallback>
                    </Avatar>

                    <div className="space-y-1">
                        <p className="text-muted-foreground text-sm">
                            {product?.category || "--"} &#x3e;{" "}
                            {product?.sub_category || "--"}
                        </p>
                        <p className="font-semibold">{product?.name || "--"}</p>
                    </div>
                </div>

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
            </DrawerFooter>
        </>
    );
};

const NoProductFoundView = ({ code }: { code: string }) => {
    const [loading, setLoading] = useState(false);

    return (
        <div className="space-y-10">
            <div>
                <PackageSearch
                    size={100}
                    strokeWidth={1}
                    className="mx-auto text-muted-foreground"
                />
                <p className="mt-4 text-center text-muted-foreground">
                    No product found for this barcode
                </p>
            </div>

            <DrawerFooter className="gap-4">
                <div onClick={() => setLoading(true)}>
                    <Link href={`/scan/${code ?? "create"}`}>
                        <Button
                            className="w-full"
                            type="button"
                            loading={loading}
                            disabled={loading}
                        >
                            Create this product
                        </Button>
                    </Link>
                </div>
                <DrawerClose asChild>
                    <Button variant="outline" type="button" disabled={loading}>
                        Try again
                    </Button>
                </DrawerClose>
            </DrawerFooter>
        </div>
    );
};

const ProductScanError = () => {
    return (
        <div className="space-y-10">
            <div>
                <PackageSearch
                    size={100}
                    strokeWidth={1}
                    className="mx-auto text-muted-foreground"
                />
                <p className="mt-4 text-center text-muted-foreground">
                    Error while scanning this barcode
                </p>
            </div>

            <DrawerFooter className="gap-4">
                <DrawerClose asChild>
                    <Button variant="outline" type="button">
                        Try again
                    </Button>
                </DrawerClose>
            </DrawerFooter>
        </div>
    );
};
