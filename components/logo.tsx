"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";

export default function Logo() {
    const { resolvedTheme } = useTheme();

    const isDark = resolvedTheme === "dark";

    return (
        <Link href={"/"}>
            <Image
                src={isDark ? "/logo-dark.png" : "/logo-light.png"}
                alt="brands in nature logo"
                width={69}
                height={40}
                className="flex-shrink-0"
                priority
            />
        </Link>
    );
}
