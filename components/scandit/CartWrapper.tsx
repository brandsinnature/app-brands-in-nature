import ProductDrawer from "../product-drawer";
import CartTrigger from "../cart-trigger";
import { useEffect, useState } from "react";
// import { useSDK } from "./sdk";
import { ICart } from "@/utils/common.interface";
import { getAllCartItems } from "@/data-access/product";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
    product: any;
};

export default function CartWrapper({ open, setOpen, product }: Props) {
    // const { sdk } = useSDK();

    const [cartOpen, setCartOpen] = useState(false);
    const [cartItems, setCartItems] = useState<ICart[]>([]);

    // useEffect to toggle scanning when product drawer is opened/closed
    useEffect(() => {
        // async function openHandler() {
        //     if (!open) await sdk.enableScanning(true);
        // }

        // openHandler();
        fetchCart();
    }, [open]);

    // useEffect to toggle scanning when cart drawer is opened/closed
    // useEffect(() => {
    //     async function openHandler() {
    //         if (cartOpen) await sdk.enableScanning(false);
    //         else await sdk.enableScanning(true);
    //     }

    //     openHandler();
    // }, [cartOpen, sdk]);

    async function fetchCart() {
        const data = await getAllCartItems();
        setCartItems(data as unknown as ICart[]);
    }

    return (
        <>
            <ProductDrawer open={open} setOpen={setOpen} product={product} />

            <div className="bottom-24 left-4 absolute">
                <CartTrigger
                    open={cartOpen}
                    setOpen={setCartOpen}
                    fetchCart={fetchCart}
                    cartItems={cartItems}
                    setCartItems={setCartItems}
                />
            </div>
        </>
    );
}
