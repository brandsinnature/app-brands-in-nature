import { useCallback, useState } from "react";
import { Result, useZxing } from "react-zxing";
import { toast } from "sonner";
import { FaBarcode } from "react-icons/fa";
import { QrCode, Scan } from "lucide-react";
import { CgSpinnerAlt } from "react-icons/cg";
import { parseAsString, useQueryStates } from "next-usequerystate";

export default function ReturnScanner() {
    const [loading, setLoading] = useState(false);

    const [_, setQText] = useQueryStates({
        pa: parseAsString,
        pn: parseAsString,
        perr: parseAsString,
    });

    const handleResult = useCallback(
        (result: Result) => {
            setLoading(true);
            const urlObj = new URL(result.getText());
            const searchParams = new URLSearchParams(urlObj.search);

            const pa = searchParams.get("pa");
            const pn = searchParams.get("pn");

            if (!pa || !pn) return setQText({ perr: "Invalid QR code" });

            setQText({ pa, pn });
            setLoading(false);
        },
        [setQText]
    );

    const { ref } = useZxing({
        timeBetweenDecodingAttempts: 50,
        onDecodeResult: handleResult,
        onError(error) {
            toast.error(`error: ${error}`);
        },
    });

    return (
        <div className="relative">
            <video ref={ref} className="w-screen h-[450px] object-cover" />

            <div className="top-1/2 left-1/2 absolute -translate-x-1/2 -translate-y-1/2">
                <div className="relative w-96 h-96">
                    <Scan size={369} strokeWidth={0.25} className="absolute" />

                    {!loading && (
                        <div className="absolute inset-0 p-20 text-center">
                            <QrCode
                                size={128}
                                className="mx-auto"
                                strokeWidth={1}
                            />
                            <p className="font-semibold text-pretty">
                                Point your mobile phone towards the
                                merchant&apos;s QR to scan
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {loading && (
                <div className="top-1/2 left-1/2 fixed -translate-x-1/2 -translate-y-1/2">
                    <CgSpinnerAlt
                        className="animate-spin"
                        size={64}
                        strokeWidth={0.5}
                    />
                </div>
            )}
        </div>
    );
}
