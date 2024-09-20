import { IoAddCircle } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import CreateProductForm from "../create-product-form";
import { useEffect, useState } from "react";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
    code: string;
};

export default function AddProductDialog({ open, setOpen, code }: Props) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className="border-primary rounded-full text-primary"
                    type="button"
                    variant={"outline"}
                >
                    <IoAddCircle className="mr-2 w-6 h-6" /> Create product
                </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col gap-10 w-screen h-dvh overflow-auto">
                <DialogHeader>
                    <DialogTitle className="font-normal font-voska text-2xl text-left tracking-[0.0125em]">
                        Add product
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Add a new product to the inventory
                    </DialogDescription>
                </DialogHeader>
                <CreateProductForm code={code} setOpen={setOpen} />
            </DialogContent>
        </Dialog>
    );
}
