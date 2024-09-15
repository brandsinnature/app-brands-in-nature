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
import { TbShoppingBag } from "react-icons/tb";
import { useEffect, useState } from "react";
import {
    getAllCartItems,
    removeProductFromCart,
    updateCartQuantity,
} from "@/data-access/product";
import { ICart } from "@/utils/common.interface";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Minus, Package, Plus } from "lucide-react";
import { categorizeDate } from "@/lib/utils";
import CartEditTrigger from "./cart-edit-trigger";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

export default function CartTrigger({ open, setOpen }: Props) {
    const [cartItems, setCartItems] = useState<ICart[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    const costPerQuantity = parseInt(
        process.env.NEXT_PUBLIC_PER_QUANTITY_COST || "5"
    );

    useEffect(() => {
        async function fetchCart() {
            const data = await getAllCartItems();
            setCartItems(data as unknown as ICart[]);
        }

        fetchCart();
    }, []);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    const totalItems = cartItems.length;

    const totalQuantity = cartItems.reduce(
        (acc, item) => acc + item.quantity,
        0
    );

    const handleQuantityChange = async (type: "add" | "sub", index: number) => {
        setCartItems((prev) => {
            const newCart = prev.map((item, i) => {
                if (i === index) {
                    const newQuantity =
                        type === "add"
                            ? item.quantity + 1
                            : Math.max(1, item.quantity - 1);
                    return { ...item, quantity: newQuantity };
                }
                return item;
            });

            return newCart;
        });

        await updateCartQuantity(
            cartItems[index].id,
            type === "add"
                ? cartItems[index].quantity + 1
                : Math.max(1, cartItems[index].quantity - 1)
        );
    };

    const groupedCartItems = cartItems.reduce((acc, item) => {
        const category = categorizeDate(new Date(item.created_at));
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {} as Record<string, ICart[]>);

    const handleItemRemove = async (id: string) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
        await removeProductFromCart(id);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size={"icon"} className="rounded-full w-12 h-12">
                    <TbShoppingBag size={28} />
                </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col gap-10 w-screen h-dvh overflow-auto">
                <DialogHeader>
                    <DialogTitle className="bg-primary/30 mx-auto px-4 py-1 rounded-full w-fit font-medium text-sm">
                        Your bag
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Your shopping bag
                    </DialogDescription>
                </DialogHeader>
                <div className="gap-4 grid text-center">
                    <p className="mx-auto max-w-80 font-voska text-2xl">
                        Get ₹{totalQuantity * costPerQuantity}.00 refund when
                        you recycle.
                    </p>

                    <CartEditTrigger
                        groupedItems={groupedCartItems}
                        totalItems={totalItems}
                        handleRemove={handleItemRemove}
                    />

                    <div className="space-y-4 divide-y">
                        {Object.entries(groupedCartItems).map(
                            ([date, items]) => (
                                <div key={date} className="space-y-2">
                                    <p className="font-normal font-voska text-left text-muted-foreground">
                                        {date}
                                    </p>
                                    <div className="space-y-4 divide-y">
                                        {items.map(
                                            ({ id, product, quantity }) => (
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
                                                                    strokeWidth={
                                                                        1
                                                                    }
                                                                    className="text-muted-foreground"
                                                                />
                                                            </AvatarFallback>
                                                        </Avatar>

                                                        <div className="space-y-1 text-left">
                                                            <p className="font-medium text-left text-sm">
                                                                {product?.name ||
                                                                    "--"}
                                                            </p>
                                                            <p className="text-muted-foreground text-xs">
                                                                {product?.description ||
                                                                    "--"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            className="rounded-full w-6 h-6"
                                                            variant={"outline"}
                                                            size={"icon"}
                                                            disabled={
                                                                quantity === 1
                                                            }
                                                            onClick={() =>
                                                                handleQuantityChange(
                                                                    "sub",
                                                                    cartItems.findIndex(
                                                                        (
                                                                            item
                                                                        ) =>
                                                                            item.id ===
                                                                            id
                                                                    )
                                                                )
                                                            }
                                                        >
                                                            <Minus size={14} />
                                                        </Button>
                                                        <span className="px-2">
                                                            {quantity}
                                                        </span>
                                                        <Button
                                                            className="rounded-full w-6 h-6"
                                                            size={"icon"}
                                                            variant={"outline"}
                                                            onClick={() =>
                                                                handleQuantityChange(
                                                                    "add",
                                                                    cartItems.findIndex(
                                                                        (
                                                                            item
                                                                        ) =>
                                                                            item.id ===
                                                                            id
                                                                    )
                                                                )
                                                            }
                                                        >
                                                            <Plus size={14} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
                <DialogFooter className="mt-auto w-full">
                    <Button type="submit">Deposit {totalItems} packages</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
