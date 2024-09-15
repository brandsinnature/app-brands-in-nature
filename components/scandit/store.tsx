import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Barcode, Symbology } from "scandit-web-datacapture-barcode";

import { useSDK } from "./sdk";

export interface Store {
    barcode: Barcode | undefined;
    keepCameraOn: boolean;
    symbologies: Partial<Record<Symbology, boolean>>;
    setBarcode: Dispatch<SetStateAction<Barcode | undefined>>;
    setKeepCameraOn: Dispatch<SetStateAction<boolean>>;
    setSymbologies: Dispatch<Partial<Record<Symbology, boolean>>>;
    loading: boolean;
    setLoading: Dispatch<SetStateAction<boolean>>;
}

export const StoreContext = createContext<Store>({
    barcode: undefined,
    keepCameraOn: true,
    symbologies: {},
    setBarcode: () => {},
    setKeepCameraOn: () => {},
    setSymbologies: () => {},
    loading: false,
    setLoading: () => {},
});

export interface StoreProviderProps {
    children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps): JSX.Element {
    const { sdk, loaded } = useSDK();
    const [barcode, setBarcode] = useState<Barcode | undefined>();
    const [keepCameraOn, setKeepCameraOn] = useState(true);
    const [symbologies, setSymbologies] = useState<
        Partial<Record<Symbology, boolean>>
    >({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (loaded) {
            const enabledSymbologyEntries = sdk
                .getEnabledSymbologies()
                ?.map((symbology) => [symbology, true] as const);
            if (enabledSymbologyEntries) {
                const enabledSymbologies = Object.fromEntries(
                    enabledSymbologyEntries
                );
                setSymbologies(enabledSymbologies);
            }
        }
    }, [loaded, sdk]);

    return (
        <StoreContext.Provider
            value={useMemo(
                () => ({
                    barcode,
                    setBarcode,
                    keepCameraOn,
                    setKeepCameraOn,
                    symbologies,
                    setSymbologies,
                    loading,
                    setLoading,
                }),
                [barcode, keepCameraOn, loading, symbologies]
            )}
        >
            {children}
        </StoreContext.Provider>
    );
}

export function useStore(): Store {
    return useContext(StoreContext);
}
