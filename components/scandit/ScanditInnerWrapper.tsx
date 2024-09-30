import { useEffect, useRef } from "react";
import { useSDK } from "./sdk";
import { useStore } from "./store";
import { CgSpinnerAlt } from "react-icons/cg";
import Show from "./Show";
import { usePathname } from "next/navigation";

export default function ScanditInnerWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const host = useRef<HTMLDivElement | null>(null);
    const { loaded, sdk } = useSDK();
    const { loading } = useStore();

    useEffect(() => {
        async function onMount(): Promise<void> {
            if (loaded && host.current) {
                sdk.connectToElement(host.current);
                await sdk.enableCamera(true);
                await sdk.enableScanning(true);
            }
        }

        void onMount();
        return () => {
            if (loaded) {
                sdk.detachFromElement();
            }
        };
    }, [loaded, sdk]);

    return (
        <>
            <div ref={host} className="fixed w-full h-full">
                <Show when={loading}>
                    <div className="top-1/2 left-1/2 z-50 absolute -translate-x-1/2 -translate-y-1/2">
                        <CgSpinnerAlt className="mr-2 animate-spin" size={64} />
                    </div>
                </Show>
            </div>

            {children}
        </>
    );
}
