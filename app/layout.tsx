import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import NextTopLoader from "nextjs-toploader";
import { poppins, voska, voskaOutline } from "@/lib/font";

export const metadata: Metadata = {
    title: {
        template: "%s | BIN",
        default: "Brands In Nature",
    },
    description: "BIN - Brands In Nature",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${poppins.className} ${voska.variable} ${voskaOutline.variable}`}
            >
                <NextTopLoader showSpinner={false} />
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
