"use client";

import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createProduct, getProductByUpc } from "@/data-access/product";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PackageSearch } from "lucide-react";
import { IProduct } from "@/utils/common.interface";
import { useRouter } from "next/navigation";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
    code: string;
};

export default function ProductDrawer({ open, setOpen, code }: Props) {
    const router = useRouter();

    const [product, setProduct] = useState<IProduct | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchProduct() {
            if (!code) {
                setProduct(null);
                return;
            }

            setLoading(true);

            try {
                const { data, error } = await getProductByUpc(code);
                if (error) {
                    toast.error(error);
                    return setProduct(null);
                }

                setProduct(data);
            } catch (error) {
                toast.error("An error occurred while fetching the product.");
                setProduct(null);
            } finally {
                setLoading(false);
            }
        }

        fetchProduct();
    }, [code]);

    const handleProductCreate = async () => {
        setLoading(true);

        const { data, error } = await createProduct(product);

        setLoading(false);

        if (error) return toast.error(error);

        toast.success("Product added successfully");
        router.push("/");
    };

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            {/* <DrawerTrigger asChild>
                <Button variant="outline">Open Drawer</Button>
            </DrawerTrigger> */}
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader className="text-left">
                        <DrawerTitle>Product details</DrawerTitle>
                        <DrawerDescription>#{code}</DrawerDescription>
                    </DrawerHeader>
                    <div className="space-y-3 p-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="w-20 h-20">
                                <AvatarImage
                                    src={product?.images[0]}
                                    alt={product?.title}
                                />
                                <AvatarFallback>
                                    <PackageSearch size={44} strokeWidth={1} />
                                </AvatarFallback>
                            </Avatar>

                            <div className="space-y-1">
                                <p className="text-muted-foreground text-sm">
                                    {product?.category || "--"}
                                </p>
                                <p className="font-semibold">
                                    {product?.title || "--"}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 ps-3">
                                <p className="text-muted-foreground text-sm">
                                    Model:
                                </p>
                                <p className="font-semibold">
                                    {product?.model || "--"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 ps-3">
                                <p className="text-muted-foreground text-sm">
                                    Brand:
                                </p>
                                <p className="font-semibold">
                                    {product?.brand || "--"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 ps-3">
                                <p className="text-muted-foreground text-sm">
                                    Color:
                                </p>
                                <p className="font-semibold">
                                    {product?.color || "--"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 ps-3">
                                <p className="text-muted-foreground text-sm">
                                    Weight:
                                </p>
                                <p className="font-semibold">
                                    {product?.weight || "--"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 ps-3">
                                <p className="text-muted-foreground text-sm">
                                    Dimension/Size:
                                </p>
                                <p className="font-semibold">
                                    {product?.dimension || "--"}/
                                    {product?.size || "--"}
                                </p>
                            </div>
                        </div>
                    </div>
                    <DrawerFooter className="gap-4">
                        <Button
                            onClick={handleProductCreate}
                            disabled={loading}
                            loading={loading}
                        >
                            Add product
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" disabled={loading}>
                                Close
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
