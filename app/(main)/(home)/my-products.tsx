import ProductCard from "@/components/product-card";
import { getMyProducts } from "@/data-access/product";
import { PackageSearch } from "lucide-react";

export default async function MyProducts() {
    const products = await getMyProducts();

    return (
        <div className="space-y-4">
            {products.map((product) => (
                <ProductCard key={product.ean} product={product} showReturn />
            ))}

            {products.length === 0 && (
                <div className="space-y-2 mt-10 text-center text-muted-foreground">
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
