"use client";

import DepositProvider from "@/components/scandit/DepositProvider";
import { ScanditWrapper } from "@/components/scandit/ScanditWrapper";

export default function DepositPage() {
    return (
        <ScanditWrapper>
            <DepositProvider />
        </ScanditWrapper>
    );
}
