"use server";

import {
    CompleteProduct,
    IJwtPayload,
    IProduct,
    IReturn,
} from "@/utils/common.interface";
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { jwtDecode } from "jwt-decode";
import { getSessionUserId } from "./auth";

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

    const product =
        data?.pageInfo?.totalResults > 0
            ? data.items[0]
            : data?.gepir[0] ?? { gtin };

    if (!product.name) product.name = gtin;

    return {
        data: product,
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
            "id, created_by, created_at, product_id, status, returned_at, product:products!product_id(id, gtin, brand, name, category, images, sub_category, description, weights_and_measures)"
        )
        .eq("created_by", jwt?.sub);

    if (error) return [];

    return data;
}

export async function returnProduct({
    accuracy,
    buyId,
    latitude,
    longitude,
    pa: upi,
    pn: name,
}: IReturn) {
    const supabase = createClient();

    let { data: merchant } = await supabase
        .from("merchants")
        .select("id")
        .eq("upi", upi)
        .single();

    if (!merchant?.id) {
        const { data, error } = await supabase
            .from("merchants")
            .upsert({ upi, name })
            .select("id")
            .single();

        if (error) return { error: error.message };
        merchant = data;
    }

    const { data, error: updateError } = await supabase
        .from("products_bought")
        .update({
            status: "returned",
            returned_to: merchant?.id,
            returned_at: new Date().toISOString(),
            latitude,
            longitude,
            accuracy,
        })
        .eq("id", buyId)
        .eq("status", "bought");

    if (updateError) return { error: updateError.message };

    return { data };
}

export async function addProductToCart(product: IProduct) {
    const supabase = createClient();

    const created_by = await getSessionUserId();
    if (!created_by) return { error: "User not found" };

    if (!product.id) {
        const { data, error } = await supabase
            .from("products")
            .upsert(
                {
                    gtin: product.gtin,
                    brand: product.brand,
                    name: product.name,
                    category: product.category,
                    images: product.images,
                    sub_category: product.sub_category,
                    description: product.description,
                    weights_and_measures: product.weights_and_measures,
                    created_by,
                },
                { onConflict: "gtin" }
            )
            .select("id")
            .single();

        product.id = data?.id;

        if (error) return { error: error.message };
    }

    const { data, error } = await supabase.from("cart").insert({
        product_id: product.id,
        quantity: 1,
        created_by,
    });

    if (error) return { error: error.message };

    return { data };
}

export async function getAllCartItems() {
    const supabase = createClient();

    const created_by = await getSessionUserId();
    if (!created_by) return [];

    const { data, error } = await supabase
        .from("cart")
        .select(
            "id, product_id, quantity, created_at, product:products!product_id(id, gtin, brand, name, images, description)"
        )
        .eq("created_by", created_by);

    if (error) return [];

    return data;
}

export async function removeProductFromCart(cartId: string) {
    const supabase = createClient();

    const { error } = await supabase.from("cart").delete().eq("id", cartId);

    if (error) return { error: error.message };

    return { message: "Product removed from cart" };
}

export async function updateCartQuantity(cartId: string, quantity: number) {
    const supabase = createClient();

    const { error } = await supabase
        .from("cart")
        .update({ quantity })
        .eq("id", cartId);

    if (error) return { error: error.message };

    return { message: "Cart updated" };
}
