"use client";

import { Button } from "@/components/ui/button";
import { CameraIcon, SwitchCamera, Zap, ZapOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useZxing } from "react-zxing";
import { toast } from "sonner";

export default function ScanRcc() {
    const [result, setResult] = useState("");
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const {
        ref,
        torch: { on, off, isOn, isAvailable },
    } = useZxing({
        onDecodeResult(result) {
            setResult(result.getText());
        },
    });

    // useEffect(() => {
    //     (async () => {
    //         try {
    //             const availableDevices =
    //                 await navigator.mediaDevices.enumerateDevices();
    //             const availableVideoDevices = availableDevices.filter(
    //                 (device) => device.kind === "videoinput"
    //             );
    //             if (availableVideoDevices.length === 0)
    //                 return toast.error("No cameras found");
    //             setDevices(availableVideoDevices);
    //         } catch (e) {
    //             toast.error(
    //                 "Failed to find cameras. This could be permissions problem"
    //             );
    //         }
    //     })();
    // }, []);

    return (
        <div>
            <video ref={ref} />

            <p>
                <span>Last result:</span>
                <span>{result}</span>
            </p>
            {isAvailable ? (
                <button onClick={() => (isOn ? off() : on())}>
                    {isOn ? "Turn off" : "Turn on"} torch
                </button>
            ) : (
                <strong>
                    Unfortunately, torch is not available on this device.
                </strong>
            )}
        </div>
    );
}

//  <div className="">
//      <Button
//          size={"icon-lg"}
//          className="bg-white/80 rounded-full fixed left-1/2 bottom-16 transform -translate-x-1/2"
//          onClick={() => {
//              if (camera.current) {
//                  const photo = camera.current.takePhoto();
//                  setImage(photo as string);
//              }
//          }}
//      >
//          <CameraIcon size={30} />
//      </Button>

//      <div className="right-5 bottom-16 z-50 fixed flex items-center gap-5">
//          <Button
//              size={"icon"}
//              className="bg-black/80 dark:bg-white/80 rounded-full"
//              disabled={numberOfCameras <= 1}
//              onClick={() => {
//                  if (camera.current) camera.current.switchCamera();
//              }}
//          >
//              <SwitchCamera />
//          </Button>

//          {camera.current?.torchSupported && (
//              <Button
//                  size={"icon"}
//                  className="bg-black/80 dark:bg-white/80 rounded-full"
//                  onClick={() => {
//                      if (camera.current) {
//                          setTorchToggled(camera.current.toggleTorch());
//                      }
//                  }}
//              >
//                  {torchToggled ? <Zap /> : <ZapOff />}
//              </Button>
//          )}
//      </div>
//  </div>;
