"use client";

import { Button } from "@/components/ui/button";
import { CameraIcon, SwitchCamera, Zap, ZapOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraType } from "react-camera-pro";

export default function ScanRcc() {
    const camera = useRef<CameraType>(null);

    const [numberOfCameras, setNumberOfCameras] = useState(0);
    const [torchToggled, setTorchToggled] = useState<boolean>(false);
    const [image, setImage] = useState<string | null>(null);
    const [showTourButton, setShowTourButton] = useState<boolean>(false);

    useEffect(() => {
        setShowTourButton(camera.current?.torchSupported || false);
    }, [camera.current?.torchSupported]);

    return (
        <div>
            <Camera
                ref={camera}
                aspectRatio="cover"
                facingMode="environment"
                numberOfCamerasCallback={(i) => setNumberOfCameras(i)}
                errorMessages={{
                    noCameraAccessible:
                        "No camera device accessible. Please connect your camera or try a different browser.",
                    permissionDenied:
                        "Permission denied. Please refresh and give camera permission.",
                    switchCamera:
                        "It is not possible to switch camera to different one because there is only one video device accessible.",
                    canvas: "Canvas is not supported.",
                }}
                // videoReadyCallback={() => {
                //     console.log("Video feed ready.");
                // }}
            />

            <div className="">
                <Button
                    size={"icon-lg"}
                    className="bg-white/80 rounded-full fixed left-1/2 bottom-16 transform -translate-x-1/2"
                    onClick={() => {
                        if (camera.current) {
                            const photo = camera.current.takePhoto();
                            setImage(photo as string);
                        }
                    }}
                >
                    <CameraIcon size={30} />
                </Button>

                <div className="right-5 bottom-16 z-50 fixed flex items-center gap-5">
                    <Button
                        size={"icon"}
                        className="bg-black/80 dark:bg-white/80 rounded-full"
                        disabled={numberOfCameras <= 1}
                        onClick={() => {
                            if (camera.current) camera.current.switchCamera();
                        }}
                    >
                        <SwitchCamera />
                    </Button>

                    {showTourButton && (
                        <Button
                            size={"icon"}
                            className="bg-black/80 dark:bg-white/80 rounded-full"
                            onClick={() => {
                                if (camera.current) {
                                    setTorchToggled(
                                        camera.current.toggleTorch()
                                    );
                                }
                            }}
                        >
                            {torchToggled ? <Zap /> : <ZapOff />}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

{
    /* <TorchButton
    className={torchToggled ? "toggled" : ""}
    onClick={() => {
        if (camera.current) {
            setTorchToggled(camera.current.toggleTorch());
        }
    }}
/>; */
}
