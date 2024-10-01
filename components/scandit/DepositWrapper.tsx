import { useCallback, useEffect, useState } from "react";
import RetailerDrawer from "../drawers/retailer-drawer";
import { useSDK } from "./sdk";
import { countCartItems } from "@/data-access/product";
import { IGetRetailer } from "@/utils/common.interface";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";
import { parseAsString, useQueryState } from "next-usequerystate";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
    retailer: IGetRetailer | null;
};

export default function DepositWrapper({ open, setOpen, retailer }: Props) {
    const { sdk } = useSDK();

    const [count, setCount] = useState(0);

    const [_, setMode] = useQueryState(
        "mode",
        parseAsString.withDefault("cart")
    );

    useEffect(() => {
        async function openHandler() {
            if (!open) await sdk.enableScanning(true);
        }

        openHandler();
    }, [open, sdk]);

    const getCartItemsCount = useCallback(async () => {
        const count = await countCartItems();
        setCount(count || 0);
    }, []);

    useEffect(() => {
        getCartItemsCount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toogleToCart = async () => {
        setMode("cart");
        setOpen(false);
    };

    return (
        <>
            <p className="top-0 left-0 z-50 fixed bg-background px-4 py-3 rounded-b-3xl w-full font-normal font-voska text-xl tracking-[0.0125em]">
                Scan Retailer&apos;s QR code to deposit your items
            </p>
            <Button
                size={"icon"}
                className="bottom-24 left-4 z-50 fixed rounded-full w-12 h-12"
                onClick={toogleToCart}
            >
                <ArrowLeft size={28} />
            </Button>

            <RetailerDrawer
                open={open}
                setOpen={setOpen}
                retailer={retailer}
                count={count}
            />
        </>
    );
}
