import { useLocation } from "@/hooks/useLocation";
import { Button } from "./ui/button";
import { Locate } from "lucide-react";
import Map from "@/components/ui/google-map";
import { Suspense } from "react";
import { Skeleton } from "./ui/skeleton";

export default function ReturnLocator() {
    const { lat, lng, acc, isLoading, getCurrentLocation } = useLocation();

    return (
        <div className="space-y-4">
            <Suspense
                fallback={
                    <Skeleton>
                        <div className="w-full h-64" />
                    </Skeleton>
                }
            >
                <Map lat={lat} lng={lng} />
            </Suspense>

            <div className="flex justify-between items-center">
                <p className="text-muted-foreground text-sm italic">
                    Accurate to {Math.round(acc || Infinity)} meters
                </p>

                <Button
                    onClick={getCurrentLocation}
                    variant={"outline"}
                    size={"icon"}
                    loading={isLoading}
                    disabled={isLoading}
                >
                    <Locate />
                </Button>
            </div>
        </div>
    );
}
