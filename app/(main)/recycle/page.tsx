import PackageCard from "@/components/recycle/package-card";
import Container from "@/components/ui/container";
import { getBoughtPackages } from "@/data-access/product";
import { categorizeDate } from "@/lib/utils";
import { ICart, ICartCheck } from "@/utils/common.interface";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Recycle",
};

export default async function Recycle() {
    const packages = await getBoughtPackages();

    const groupedCartItems = packages.reduceRight((acc, item) => {
        const category = categorizeDate(new Date(item.created_at));
        if (!acc[category]) acc[category] = [];

        acc[category].push({
            ...(item as unknown as ICart),
            checked: false,
        });
        return acc;
    }, {} as Record<string, ICartCheck[]>);

    return (
        <Container className="space-y-6">
            <div className="space-y-1">
                <p className="font-normal font-voska text-2xl text-left tracking-[0.0125em]">
                    Recycle packages
                </p>
                <p className="text-muted-foreground text-sm">
                    Scan barcode to start recycling
                </p>
            </div>

            <PackageCard
                items={groupedCartItems}
                packages={packages as unknown as ICart[]}
            />
        </Container>
    );
}
