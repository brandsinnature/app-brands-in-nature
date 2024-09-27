import { ICart } from "@/utils/common.interface";
import { ScanditWrapper } from "../scandit/ScanditWrapper";
import RecycleProvider from "./recycle-provider";

export default function RecycleProviderWrapper() {
    return (
        <ScanditWrapper>
            <RecycleProvider />
        </ScanditWrapper>
    );
}
