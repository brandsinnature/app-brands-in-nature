import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IProduct } from "@/utils/common.interface";
import { PackageSearch } from "lucide-react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
    product: IProduct;
    showReturn?: boolean;
};

export default function ProductCard({ product, showReturn = false }: Props) {
    return (
        <Card>
            <CardHeader className="px-3 py-2">
                <p className="text-muted-foreground text-xs">
                    {product?.category || "--"}
                </p>
            </CardHeader>
            <CardContent className="space-y-3 px-3 py-2">
                <div className="flex items-center gap-2">
                    <Avatar className="w-12 h-12">
                        <AvatarImage
                            src={product?.images[0]}
                            alt={product?.title}
                        />
                        <AvatarFallback>
                            <PackageSearch size={44} strokeWidth={1} />
                        </AvatarFallback>
                    </Avatar>

                    <p className="font-medium text-sm">
                        {product?.title || "--"}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{product.brand}</Badge>
                    <Badge variant="secondary">{product.color}</Badge>
                    <Badge variant="secondary">
                        {product.dimension}/{product.size}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}
