// import { useSDK } from "@/components/scandit/sdk";
import LoadingMessage from "@/components/scandit/LoadingMessage";
import Show from "@/components/scandit/Show";
import ScannerComponent from "@/components/scandit/ScannerComponent";
import { useStore } from "./store";

export default function ScannerProvider() {
    // const { loaded, loading } = useSDK();
    const {loading} = useStore();

    return (
        <div className="flex flex-col justify-center items-center w-screen h-body">
            <Show when={loading}>
                <LoadingMessage />
            </Show>
            <Show when={!loading}>
                <ScannerComponent />
            </Show>
        </div>
    );
}
