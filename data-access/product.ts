"use server";

import {
    CompleteProduct,
    IJwtPayload,
    IProduct,
} from "@/utils/common.interface";
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { jwtDecode } from "jwt-decode";

export async function getProductByGtin(gtin: string) {
    const supabase = createClient();

    const { data: existingProduct } = await supabase
        .from("products")
        .select("*")
        .eq("gtin", gtin)
        .single();

    if (existingProduct) return { data: existingProduct };

    const res = await fetch(
        `https://gs1datakart.org/dkapi/product?gtin=${gtin}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GS1_DATAKART_AUTH_TOKEN}`,
            },
        }
    );

    if (!res.ok)
        return {
            error: res?.statusText || "Error fetching product data",
        };

    const data = await res.json();

    return {
        data:
            data?.pageInfo?.totalResults > 0
                ? data.items[0]
                : data?.gepir[0] ?? { gtin },
    };
}

export async function createProduct(product: CompleteProduct | null) {
    const supabase = createClient();

    const {
        data: { session },
        error: authError,
    } = await supabase.auth.getSession();

    if (authError) return { error: authError.message };

    const jwt: IJwtPayload = jwtDecode(session?.access_token || "");

    const { data: found_product } = await supabase
        .from("products")
        .select("id")
        .eq("gtin", product?.gtin)
        .single();

    if (found_product?.id)
        return await createProductBought(
            supabase,
            product?.gtin,
            jwt?.sub,
            found_product?.id
        );

    const { data, error } = await supabase
        .from("products")
        .insert({
            gtin: product?.gtin,
            brand: product?.brand,
            name: product?.name,
            description: product?.description,
            derived_description: product?.derived_description,
            caution: product?.caution,
            sku_code: product?.sku_code,
            category: product?.category,
            sub_category: product?.sub_category,
            gpc_code: product?.gpc_code,
            marketing_info: product?.marketing_info,
            url: product?.url,
            activation_date: product?.activation_date,
            deactivation_date: product?.deactivation_date,
            country_of_origin: product?.country_of_origin,
            created_date: new Date().toISOString(),
            modified_date: new Date().toISOString(),
            type: product?.type,
            packaging_type: product?.packaging_type,
            primary_gtin: product?.primary_gtin,
            published: product?.published === "Yes" ? true : false,
            images: product?.images,
            company_detail: product?.company_detail,
            weights_and_measures: product?.weights_and_measures,
            dimensions: product?.dimensions,
            case_configuration: product?.case_configuration,
            mrp: product?.mrp,
            hs_code: product?.hs_code,
            igst: product?.igst,
            cgst: product?.cgst,
            sgst: product?.sgst,
            margin: product?.margin,
            attributes: product?.attributes,
            additional_attributes: product?.additional_attributes,
            created_by: jwt?.sub,
        })
        .select("id")
        .single();

    if (error) return { error: error.message };

    return await createProductBought(
        supabase,
        product?.gtin,
        jwt?.sub,
        data?.id
    );
}

export async function createProductBought(
    supabase: SupabaseClient,
    gtin?: string,
    created_by?: string,
    product_id?: string
) {
    const { data, error } = await supabase.from("products_bought").insert({
        gtin,
        created_by,
        product_id,
    });

    if (error) return { error: error.message };

    return { data };
}

export async function getAllProducts() {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("products")
        .select(
            "id, gtin, brand, name, category, images, sub_category, description, weights_and_measures"
        );

    if (error) return [];

    return data;
}

export async function getMyProducts() {
    const supabase = createClient();

    const {
        data: { session },
        error: authError,
    } = await supabase.auth.getSession();

    if (authError) return [];

    const jwt: IJwtPayload = jwtDecode(session?.access_token || "");

    const { data, error } = await supabase
        .from("products_bought")
        .select(
            "id, created_by, created_at, product_id, product:products!product_id(id, gtin, brand, name, category, images, sub_category, description, weights_and_measures)"
        )
        .eq("created_by", jwt?.sub);

    if (error) return [];

    return data;
}
