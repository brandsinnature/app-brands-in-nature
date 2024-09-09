"use client";

import ReturnLocator from "@/components/return-locator";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/hooks/useLocation";
import { parseAsString, useQueryStates } from "next-usequerystate";

export default function ReturnLocationRcc() {
    const { lat, lng, isLoading, getCurrentLocation } = useLocation();

    const [qr, _] = useQueryStates({
        pa: parseAsString,
    });

    return (
        <div>
            {lat && lng ? (
                <ReturnLocator />
            ) : (
                <Button
                    onClick={getCurrentLocation}
                    disabled={!qr.pa || isLoading}
                    loading={isLoading}
                >
                    Enable location
                </Button>
            )}
        </div>
    );
}
