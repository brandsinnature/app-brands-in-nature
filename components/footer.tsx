"use client";

import { cn } from "@/lib/utils";
import { LayoutDashboard, ScanLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
    const pathname = usePathname();

    if (pathname === "/login") return <></>;

    const isScan = pathname.startsWith("/scan");

    return (
        <footer className="bottom-0 z-50 fixed flex justify-around items-center bg-background py-4 border-t w-full text-sm">
            <Link
                href={"/"}
                className={cn(
                    "flex items-center gap-2",
                    !isScan && "text-primary"
                )}
            >
                <LayoutDashboard size={18} />
                Dashboard
            </Link>
            <Link
                href={"/scan"}
                className={cn(
                    "flex items-center gap-2",
                    isScan && "text-primary"
                )}
            >
                <ScanLine size={18} />
                Scan
            </Link>
        </footer>
    );
}
