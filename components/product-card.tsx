import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IProduct } from "@/utils/common.interface";
import { PackageSearch } from "lucide-react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "./ui/button";
import { format } from "date-fns";
import Link from "next/link";

type Props = {
    product: IProduct;
    purchaseDate?: string;
    buyId?: string;
    status?: string;
    returnedAt?: string;
};

export default function ProductCard({
    product,
    purchaseDate,
    buyId,
    status,
    returnedAt,
}: Props) {
    return (
        <Card className="p-3">
            <CardHeader className="p-0 pb-3">
                <p className="text-muted-foreground text-xs capitalize">
                    {product?.category || "--"} &#x3e;{" "}
                    {product?.sub_category || "--"}
                </p>
            </CardHeader>
            <CardContent className="space-y-4 px-3 py-2">
                <div className="flex items-center gap-2">
                    <Avatar className="w-14 h-14">
                        <AvatarImage
                            src={product?.images?.front}
                            alt={product?.name || "--"}
                        />
                        <AvatarFallback>
                            <PackageSearch size={44} strokeWidth={1} />
                        </AvatarFallback>
                    </Avatar>

                    <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">
                            #{product?.gtin}
                        </p>
                        <p className="font-medium text-sm">
                            {product?.name || "--"}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                        {product?.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline">Brand: {product.brand}</Badge>
                        {product?.weights_and_measures?.net_weight && (
                            <Badge variant="outline">
                                Net weight:{" "}
                                {product.weights_and_measures.net_weight}{" "}
                                {product.weights_and_measures?.measurement_unit}
                            </Badge>
                        )}
                    </div>

                    {buyId && (
                        <div className="flex justify-between items-center">
                            <div className="space-y-0.5">
                                <p className="text-muted-foreground text-xs italic">
                                    Purchased on:{" "}
                                    {format(purchaseDate ?? Date.now(), "PP")}
                                </p>
                                {returnedAt && (
                                    <p className="text-muted-foreground text-xs italic">
                                        Returned on:{" "}
                                        {format(returnedAt ?? Date.now(), "PP")}
                                    </p>
                                )}
                            </div>
                            <div>
                                {status === "bought" ? (
                                    <Link href={`/return/${buyId}`}>
                                        <Button size={"sm"}>Return</Button>
                                    </Link>
                                ) : (
                                    <Badge className="uppercase">
                                        {status}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
