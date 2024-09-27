import { useSDK } from "../scandit/sdk";
import Show from "../scandit/Show";
import LoadingMessage from "../scandit/LoadingMessage";
import RecycleComponent from "./recycle-component";
import { ICart } from "@/utils/common.interface";

export default function RecycleProvider() {
    const { loaded, loading } = useSDK();

    return (
        <div className="flex flex-col justify-center items-center w-screen h-body">
            <Show when={loading}>
                <LoadingMessage />
            </Show>
            <Show when={loaded}>
                <RecycleComponent />
            </Show>
        </div>
    );
}
