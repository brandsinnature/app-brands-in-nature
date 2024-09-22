import Container from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
    return (
        <Container className="space-y-6">
            <Skeleton className="w-full h-40" />
            <Skeleton className="w-full h-40" />
            <Skeleton className="w-full h-40" />
        </Container>
    );
}
