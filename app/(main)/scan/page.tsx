import Container from "@/components/ui/container";
import ScanRcc from "./scan-rcc";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Scan",
};

export default function page() {
    return (
        <Container className="p-0">
            <ScanRcc />
        </Container>
    );
}
