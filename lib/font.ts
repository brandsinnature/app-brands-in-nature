import localFont from "next/font/local";
import { Caveat, Inter, Poppins } from "next/font/google";

const voskaOutline = localFont({
    src: [
        {
            path: "./fonts/VoskaOutline.otf",
            weight: "400",
            style: "normal",
        },
    ],
    display: "swap",
    variable: "--font-voska-outline",
});

const voska = localFont({
    src: [
        {
            path: "./fonts/Voska.otf",
            weight: "400",
            style: "normal",
        },
        {
            path: "./fonts/VoskaBold.otf",
            weight: "700",
            style: "bold",
        },
    ],
    display: "swap",
    variable: "--font-voska",
});

const caveat = Caveat({ subsets: ["latin"] });

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

export { voska, voskaOutline, caveat, poppins };
