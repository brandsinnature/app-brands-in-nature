"use client";

import ProductDrawer from "@/components/product-drawer";
import { Button } from "@/components/ui/button";
import { Scan, Zap, ZapOff } from "lucide-react";
import { useState } from "react";
import { useZxing } from "react-zxing";

export default function ScanRcc() {
    const [result, setResult] = useState("");
    const [open, setOpen] = useState(false);

    const {
        ref,
        torch: { on, off, isOn, isAvailable },
    } = useZxing({
        paused: open,
        onDecodeResult(result) {
            setResult(result.getText());
            setOpen(true);
        },
    });

    return (
        <div>
            <video ref={ref} className="w-screen h-body object-cover" />

            <div className="top-1/2 left-1/2 fixed -translate-x-1/2 -translate-y-1/2">
                <div className="relative w-[369px] h-[369px]">
                    <Scan size={369} strokeWidth={0.25} className="absolute" />

                    {!open && (
                        <div className="absolute inset-0 p-16 overflow-hidden">
                            <div className="bg-primary to-transparent w-60 h-1 animate-scanning"></div>
                        </div>
                    )}
                </div>
            </div>

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

            <ProductDrawer open={open} setOpen={setOpen} code={result} />
        </div>
    );
}
