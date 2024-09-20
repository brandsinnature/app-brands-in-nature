"use client";

import DepositProvider from "@/components/scandit/DepositProvider";
import SDKProvider from "@/components/scandit/sdk";
import { StoreProvider } from "@/components/scandit/store";

export default function DepositPage() {
    return (
        <SDKProvider>
            <StoreProvider>
                <DepositProvider />
            </StoreProvider>
        </SDKProvider>
    );
}
