"use client";
import Container from "@/components/ui/container";
import { BarcodeScanner } from "react-barcode-scanner";
import "react-barcode-scanner/polyfill";

export default function Home() {
    return (
        <Container>
            <BarcodeScanner />
        </Container>
    );
}
