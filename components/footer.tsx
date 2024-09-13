"use client";

import { cn } from "@/lib/utils";
import { CircleUserRound, House, Recycle, ScanLine, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function Footer() {
    const pathname = usePathname();

    if (pathname === "/login") return <></>;

    return (
        <footer className="bottom-0 z-50 fixed flex justify-around items-center bg-background py-4 border-t w-full text-sm">
            <FooterItem href={"/"}>
                <House size={20} />
                Home
            </FooterItem>
            <FooterItem href={"/scan"}>
                <ScanLine size={20} />
                Scan
            </FooterItem>
            <FooterItem href={"/recycle"}>
                <Recycle size={20} />
                Recycle
            </FooterItem>
            <FooterItem href={"/profile"}>
                <CircleUserRound size={20} />
                Profile
            </FooterItem>
        </footer>
    );
}

const FooterItem = ({
    href,
    children,
}: {
    href: string;
    children: ReactNode;
}) => {
    const isActive = usePathname() === href;

    return (
        <Link
            href={href}
            className={cn(
                "flex flex-col justify-center items-center gap-1 text-xs",
                isActive && "text-primary"
            )}
        >
            {children}
        </Link>
    );
};
