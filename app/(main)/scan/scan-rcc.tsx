"use client";

import { ScanditWrapper } from "@/components/scandit/ScanditWrapper";
import ScannerProvider from "@/components/scandit/ScannerProvider";

export default function ScannerPage() {
    return (
        <ScanditWrapper>
            <ScannerProvider />
        </ScanditWrapper>
    );
}
