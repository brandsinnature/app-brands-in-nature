import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import Title from "@/components/ui/title";
import { Metadata } from "next";
import ReturnScanRcc from "./return-scan-rcc";
import ReturnLocationRcc from "./return-location-rcc";
import ReturnActionRcc from "./return-action-rcc";

type Props = {
    params: {
        id: string;
    };
};

export const metadata: Metadata = {
    title: "Return",
};

export default function Return({ params }: Props) {
    return (
        <Container className="space-y-6">
            <div>
                <Title text="Return a product" />
                <p className="text-muted-foreground">
                    Return a product in 2 easy steps.
                </p>
            </div>

            <Separator />

            <div className="space-y-4">
                <div>
                    <p>
                        <b>Step 1:</b> Scan shop QR
                    </p>
                    <p className="text-muted-foreground text-sm">
                        Scan the merchant&apos;s QR code to initiate the return
                        process.
                    </p>
                </div>

                <ReturnScanRcc />
            </div>

            <Separator />

            <div className="space-y-4">
                <div>
                    <p>
                        <b>Step 2:</b> Add your current location
                    </p>
                    <p className="text-muted-foreground text-sm">
                        Add your current location to complete the return
                        process.
                    </p>
                </div>

                <ReturnLocationRcc />
            </div>

            <div className="bottom-1 left-0 z-[51] fixed bg-primary rounded-xl w-screen">
                <ReturnActionRcc buyId={params.id} />
            </div>
        </Container>
    );
}
