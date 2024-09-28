import Container from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScanLoading() {
    return (
        <Container className="space-y-8 p-0 w-full h-body">
            <Skeleton className="rounded-none w-full h-20" />

            {Array.from({ length: 4 }).map((_, i) => (
                <div className="flex items-center gap-3 px-4" key={i}>
                    <Skeleton className="rounded-full w-16 h-16" />

                    <div className="space-y-2">
                        <Skeleton className="w-60 h-4" />
                        <Skeleton className="w-48 h-4" />
                    </div>
                </div>
            ))}
        </Container>
    );
}
