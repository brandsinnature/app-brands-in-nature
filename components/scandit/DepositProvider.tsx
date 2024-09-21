import { useSDK } from "@/components/scandit/sdk";
import LoadingMessage from "@/components/scandit/LoadingMessage";
import Show from "@/components/scandit/Show";
import DepositComponent from "@/components/scandit/DepositComponent";

export default function DepositProvider() {
    const { loaded, loading } = useSDK();

    return (
        <div className="flex flex-col justify-center items-center w-screen h-body">
            <Show when={loading}>
                <LoadingMessage />
            </Show>
            <Show when={loaded}>
                <DepositComponent />
            </Show>
        </div>
    );
}
