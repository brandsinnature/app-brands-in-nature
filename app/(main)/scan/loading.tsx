import Container from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScanLoading() {
    return (
        <Container className="flex justify-center items-center px-20 w-full h-body">
            <Skeleton className="rounded-xl w-full h-40" />
        </Container>
    );
}
