import Container from "@/components/ui/container";
import { Metadata } from "next";
import ScannerPage from "./scan-rcc";

export const metadata: Metadata = {
    title: "Scan",
};

export default function page() {
    return (
        <Container className="mb-0 p-0">
            <ScannerPage />
        </Container>
    );
}
