import CreateProductForm from "@/components/create-product-form";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create a Product",
};

export default function CreateProduct() {
    return <CreateProductForm />;
}
