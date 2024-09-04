"use server";

import { IJwtPayload, IProduct } from "@/utils/common.interface";
import { createClient } from "@/utils/supabase/server";
import { jwtDecode } from "jwt-decode";

export async function getProductByUpc(upc: string) {
    const res = await fetch("https://api.upcitemdb.com/prod/trial/lookup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ upc }),
    });

    if (!res.ok)
        return {
            error: res?.statusText || "Error fetching product data",
        };

    const data = await res.json();

    return { data: data.items[0] };
}

export async function createProduct(product: IProduct | null) {
    const supabase = createClient();

    const {
        data: { session },
        error: authError,
    } = await supabase.auth.getSession();

    if (authError) return { error: authError.message };

    const jwt: IJwtPayload = jwtDecode(session?.access_token || "");

    const { data, error } = await supabase.from("products").insert({
        ean: product?.ean,
        title: product?.title,
        brand: product?.brand,
        model: product?.model,
        color: product?.color,
        size: product?.size,
        dimension: product?.dimension,
        weight: product?.weight,
        category: product?.category,
        images: product?.images,
        elid: product?.elid,
        created_by: jwt?.sub,
    });

    if (error) return { error: error.message };

    return { data };
}
