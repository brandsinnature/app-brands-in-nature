import ProductCard from "@/components/product-card";
import { getMyProducts } from "@/data-access/product";
import { IProduct } from "@/utils/common.interface";
import { PackageSearch } from "lucide-react";

export default async function MyProducts() {
    const my_products = await getMyProducts();

    return (
        <div className="space-y-4">
            {my_products.map((mp) => (
                <ProductCard
                    key={mp.id}
                    product={mp.product as unknown as IProduct}
                    purchaseDate={mp.created_at}
                    showReturn
                />
            ))}

            {my_products.length === 0 && (
                <div className="space-y-2 mt-20 text-center text-muted-foreground">
                    <PackageSearch
                        className="mx-auto"
                        size={100}
                        strokeWidth={1}
                    />
                    No products found
                </div>
            )}
        </div>
    );
}
