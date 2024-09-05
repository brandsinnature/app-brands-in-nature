import { cn } from "@/lib/utils";

type Props = {
    children: React.ReactNode;
    className?: string;
};

export default function Container({ children, className }: Props) {
    return <div className={cn("p-3", className)}>{children}</div>;
}
