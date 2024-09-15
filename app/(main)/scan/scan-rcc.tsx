"use client";

import ScannerProvider from "@/components/scandit/ScannerProvider";
import SDKProvider from "@/components/scandit/sdk";
import { StoreProvider } from "@/components/scandit/store";

export default function ScannerPage() {
    return (
        <SDKProvider>
            <StoreProvider>
                <ScannerProvider />
            </StoreProvider>
        </SDKProvider>
    );
}
