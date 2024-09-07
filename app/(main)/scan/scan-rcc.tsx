"use client";

import ProductDrawer from "@/components/product-drawer";
import { Button } from "@/components/ui/button";
import { Scan, Zap, ZapOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useZxing } from "react-zxing";
import { FaBarcode } from "react-icons/fa";
import { CompleteProduct } from "@/utils/common.interface";
import { toast } from "sonner";
import { getProductByGtin } from "@/data-access/product";
import { CgSpinner } from "react-icons/cg";

export default function ScanRcc() {
    const [code, setCode] = useState("");
    const [open, setOpen] = useState(false);
    const [product, setProduct] = useState<CompleteProduct | null>(null);
    const [loading, setLoading] = useState(false);

    const {
        ref,
        torch: { on, off, isOn, isAvailable },
    } = useZxing({
        paused: open,
        onDecodeResult(result) {
            setCode(result.getText());
        },
        onError(error) {
            toast.error(`error: ${error}`);
        },
    });

    useEffect(() => {
        async function fetchProduct() {
            if (!code) return setProduct(null);

            setLoading(true);

            try {
                const { data, error } = await getProductByGtin(code);

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
                setOpen(true);
            }
        }

        fetchProduct();
    }, [code]);

    useEffect(() => {
        if (open) return;

        setCode("");
    }, [open]);

    return (
        <div>
            <video ref={ref} className="w-screen h-body object-cover" />

            <div className="top-1/2 left-1/2 fixed -translate-x-1/2 -translate-y-1/2">
                <div className="relative w-[369px] h-[369px]">
                    <Scan size={369} strokeWidth={0.25} className="absolute" />

                    {!open && !loading && (
                        <div className="absolute inset-0 p-20 text-center">
                            <FaBarcode size={128} className="mx-auto" />
                            <p className="font-semibold text-pretty">
                                Point your mobile phone towards the
                                package&apos;s barcode to scan
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {loading && (
                <div className="top-1/2 left-1/2 fixed -translate-x-1/2 -translate-y-1/2">
                    <CgSpinner
                        className="animate-spin"
                        size={64}
                        strokeWidth={0.5}
                    />
                </div>
            )}

            <div className="right-5 bottom-16 z-50 fixed flex items-center gap-5">
                {/* <Button
                    size={"icon"}
                    className="bg-black/80 dark:bg-white/80 rounded-full"
                    disabled={devices?.length <= 1}
                    onClick={() => {
                        setDeviceId(devices[1].deviceId);
                    }}
                >
                    <SwitchCamera />
                </Button> */}

                {isAvailable && (
                    <Button
                        size={"icon"}
                        className="bg-black/80 dark:bg-white/80 rounded-full"
                        onClick={() => (isOn ? off() : on())}
                    >
                        {isOn ? <Zap /> : <ZapOff />}
                    </Button>
                )}
            </div>

            <ProductDrawer
                open={open}
                setOpen={setOpen}
                product={product}
                code={code}
            />
        </div>
    );
}
