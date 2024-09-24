"use client";

import SDKProvider from "@/components/scandit/sdk";
import { StoreProvider } from "@/components/scandit/store";

export function ScanditWrapper({ children }: { children: React.ReactNode }) {
    return (
        <SDKProvider>
            <StoreProvider>{children}</StoreProvider>
        </SDKProvider>
    );
}
