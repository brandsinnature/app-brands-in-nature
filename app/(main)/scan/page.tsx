import Container from "@/components/ui/container";
import ScanRcc from "./scan-rcc";
import { Metadata } from "next";
import ScannerPage from "./scan-rcc-new";

export const metadata: Metadata = {
    title: "Scan",
};

export default function page() {
    return (
        <Container className="mb-0 p-0">
            {/* <ScanRcc /> */}
            <ScannerPage />
        </Container>
    );
}
