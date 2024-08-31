import { Skeleton } from "@/components/ui/skeleton";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";

export default function loading() {
    return (
        <Card className="space-y-8 w-full">
            <CardHeader>
                <Skeleton className="w-1/4 h-12" />
            </CardHeader>

            <CardContent className="space-y-6">
                <Skeleton className="w-full h-12" />
            </CardContent>

            <CardFooter className="justify-end">
                <Skeleton className="w-1/4 h-12" />
            </CardFooter>
        </Card>
    );
}
