"use client";

import { useState, useCallback } from "react";
import { useQueryStates } from "next-usequerystate";
import { parseAsFloat } from "next-usequerystate";
import { toast } from "sonner";

export const useLocation = () => {
    const [location, setLocation] = useQueryStates({
        latitude: parseAsFloat,
        longitude: parseAsFloat,
        accuracy: parseAsFloat,
    });

    const [isLoading, setIsLoading] = useState(false);

    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation)
            return toast.error("Geolocation is not supported by your browser");

        setIsLoading(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
                setIsLoading(false);
            },
            (error) => {
                toast.error(
                    `Error: ${error.message}. Please refresh the page and enable location services.`,
                    {
                        duration: 8000,
                        action: {
                            label: "Refresh",
                            onClick: () => window.location.reload(),
                        },
                    }
                );
                setIsLoading(false);
            }
        );
    }, [setLocation]);

    return {
        lat: location.latitude,
        lng: location.longitude,
        acc: location.accuracy,
        getCurrentLocation,
        isLoading,
    };
};
