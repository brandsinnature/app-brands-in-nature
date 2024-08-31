import Image from "next/image";
import Link from "next/link";

export default function Logo() {
    return (
        <Link href={"/"}>
            <Image
                src={"/logo.png"}
                alt="brands in nature logo"
                width={150}
                height={35}
                className="flex-shrink-0"
            />
        </Link>
    );
}
