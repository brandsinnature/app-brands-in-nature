import Container from "@/components/ui/container";
import { ScanFace } from "lucide-react";

export default function page() {
    return (
        <Container className="flex flex-col justify-center items-center gap-8 h-body text-center">
            <ScanFace className="text-muted-foreground" size={128} />
            <div className="space-y-1">
                <p className="font-normal font-voska text-2xl tracking-[0.0125em]">
                    Product(s) recycled.{" "}
                </p>
                <p>Your refund will be processed soon.</p>
            </div>
        </Container>
    );
}
