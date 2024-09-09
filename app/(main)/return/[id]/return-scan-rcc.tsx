"use client";

import ReturnScanner from "@/components/return-scanner";
import { Button } from "@/components/ui/button";
import { parseAsString, useQueryStates } from "next-usequerystate";
import { useState } from "react";
import { TbQrcodeOff } from "react-icons/tb";

export default function ReturnScanRcc() {
    const [text, setQText] = useQueryStates({
        pa: parseAsString,
        pn: parseAsString,
        perr: parseAsString,
    });
    const [showScanner, setShowScanner] = useState(text?.pa ?? false);

    return (
        <div>
            {showScanner ? (
                <>
                    {text?.pa ? (
                        <div className="space-y-4">
                            <div className="space-y-2 p-3 border rounded-xl">
                                <p className="italic">Merchant Details:</p>
                                <p>
                                    <span className="text-muted-foreground">
                                        Name:
                                    </span>{" "}
                                    {text.pn}
                                </p>
                                <p>
                                    <span className="text-muted-foreground">
                                        UPI:
                                    </span>{" "}
                                    {text.pa}
                                </p>
                            </div>

                            <div className="text-right">
                                <Button
                                    variant={"outline"}
                                    onClick={() =>
                                        setQText({
                                            pa: "",
                                            pn: "",
                                            perr: "",
                                        })
                                    }
                                >
                                    Rescan
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {text?.perr ? (
                                <div className="space-y-4">
                                    <TbQrcodeOff size={64} />
                                    <p>{text.perr}</p>
                                </div>
                            ) : (
                                <ReturnScanner />
                            )}
                        </>
                    )}
                </>
            ) : (
                <Button onClick={() => setShowScanner(true)}>Scan QR</Button>
            )}
        </div>
    );
}
