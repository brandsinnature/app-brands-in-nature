"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ICartCheck } from "@/utils/common.interface";
import { Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import RecycleRcc from "./recycle-rcc";

type Props = {
    items: Record<string, ICartCheck[]>;
};

export default function PackageCard({ items }: Props) {
    const [cartItems, setCartItems] =
        useState<Record<string, ICartCheck[]>>(items);
    const [open, setOpen] = useState(false);

    const toggleSelected = (selected: boolean, index: number, date: string) => {
        setCartItems((prev) => {
            const updatedItems = [...prev[date]];
            updatedItems[index] = { ...updatedItems[index], checked: selected };
            return {
                ...prev,
                [date]: updatedItems,
            };
        });
    };

    return (
        <>
            <div className="space-y-4 divide-y">
                {Object.entries(cartItems).map(([date, items]) => (
                    <div key={date} className="space-y-2">
                        <p className="pt-3 font-normal font-voska text-left text-muted-foreground">
                            {date}
                        </p>
                        <div className="space-y-4 divide-y">
                            {items.map(
                                ({ id, product, quantity, checked }, index) => (
                                    <div
                                        key={id}
                                        className="flex justify-between items-center gap-3 pt-4 first:pt-0"
                                    >
                                        <div className="flex items-center gap-5">
                                            <Checkbox
                                                checked={checked}
                                                onCheckedChange={(value) =>
                                                    toggleSelected(
                                                        !!value,
                                                        index,
                                                        date
                                                    )
                                                }
                                                aria-label="Select Package"
                                            />
                                            <div className="relative">
                                                <span className="-top-2 -right-2 z-10 absolute bg-yellow-500 px-2 py-1 rounded-full font-bold text-xs text-yellow-900">
                                                    {quantity}
                                                </span>
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
                                            </div>

                                            <div className="space-y-1 text-left">
                                                <p className="font-medium text-left text-sm">
                                                    {product?.name || "--"}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    {product?.description ||
                                                        "--"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <RecycleRcc
                open={open}
                setOpen={setOpen}
                selectedItems={Object.values(cartItems).flatMap((items) =>
                    items.filter((item) => item.checked)
                )}
            ></RecycleRcc>
        </>
    );
}
