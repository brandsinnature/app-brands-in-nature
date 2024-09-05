import CreateProductForm from "@/components/create-product-form";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create a Product",
};

type Props = {
    params: {
        code: string;
    };
};

export default function CreateProduct({ params }: Props) {
    const { code } = params;

    return <CreateProductForm code={code} />;
}
