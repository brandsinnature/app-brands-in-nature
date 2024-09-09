"use client";

import { Button } from "@/components/ui/button";
import { returnProduct } from "@/data-access/product";
import {
    parseAsFloat,
    parseAsString,
    useQueryStates,
} from "next-usequerystate";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type props = {
    buyId: string;
};

export default function ReturnActionRcc({ buyId }: props) {
    const router = useRouter();

    const [returnObj, _] = useQueryStates({
        pa: parseAsString.withDefault(""),
        pn: parseAsString.withDefault(""),
        longitude: parseAsFloat.withDefault(0),
        latitude: parseAsFloat.withDefault(0),
        accuracy: parseAsFloat.withDefault(0),
    });
    const { pa, pn, longitude, latitude } = returnObj;

    const [loading, setLoading] = useState(false);

    const handleReturn = async () => {
        setLoading(true);

        if (!pa || !pn || !longitude || !latitude)
            return toast.error(
                "Please scan merchant's QR code and submit your current location to complete the return",
                {
                    duration: 8000,
                }
            );

        const { error } = await returnProduct({ ...returnObj, buyId });

        setLoading(false);

        if (error) return toast.error(error);

        toast.success("Return completed successfully. Redirecting...");
        router.push(`/`);
    };
    return (
        <div>
            <Button
                size="lg"
                className="w-full"
                onClick={handleReturn}
                loading={loading}
                disabled={loading}
            >
                Complete Return
            </Button>
        </div>
    );
}
