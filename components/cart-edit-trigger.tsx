import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { ICart } from "@/utils/common.interface";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Minus, Package, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
    groupedItems: Record<string, ICart[]>;
    totalItems: number;
    handleRemove: (id: string) => void;
};

export default function CartEditTrigger({
    groupedItems,
    totalItems,
    handleRemove,
}: Props) {
    const [isMounted, setIsMounted] = useState(false);

    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);

        () => router.refresh();
    }, []);

    if (!isMounted) return null;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    className="mx-auto w-auto text-primary"
                    variant={"outline"}
                >
                    Edit packages ({totalItems})
                </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col justify-between gap-10 w-screen h-dvh overflow-auto">
                <DialogHeader>
                    <DialogTitle className="font-normal font-voska text-2xl text-left tracking-[0.0125em]">
                        Remove scanned packages
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Remove items from your shopping bag
                    </DialogDescription>
                </DialogHeader>
                <div className="gap-4 grid text-center">
                    <div className="space-y-4 divide-y">
                        {Object.entries(groupedItems).map(([date, items]) => (
                            <div key={date} className="space-y-2">
                                <p className="pt-3 font-normal font-voska text-left text-muted-foreground">
                                    {date}
                                </p>
                                <div className="space-y-4 divide-y">
                                    {items.map(({ id, product, quantity }) => (
                                        <div
                                            key={id}
                                            className="flex justify-between items-center gap-3 pt-4 first:pt-0"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage
                                                        src={`${product?.images?.front}`}
                                                        alt={
                                                            product?.name ||
                                                            "--"
                                                        }
                                                    />
                                                    <AvatarFallback>
                                                        <Package
                                                            size={28}
                                                            strokeWidth={1}
                                                            className="text-muted-foreground"
                                                        />
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div className="space-y-1">
                                                    <p className="font-medium text-left text-sm">
                                                        {product?.name || "--"}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {product?.description ||
                                                            "--"}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                className="rounded-full w-6 h-6"
                                                variant={"destructive"}
                                                size={"icon"}
                                                onClick={() => handleRemove(id)}
                                            >
                                                <Minus size={14} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
