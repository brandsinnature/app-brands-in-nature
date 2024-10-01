"use server";

import {
    CompleteProduct,
    IGetRetailer,
    IJwtPayload,
    IProduct,
    IReturn,
} from "@/utils/common.interface";
import { createClient } from "@/utils/supabase/server";
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

    const { data, error } = await supabase
        .from("cart")
        .select("*")
        .eq("product_id", product.id)
        .eq("created_by", created_by)
        .eq("status", "cart")
        .single();

    if (data?.id && !error) {
        await supabase.rpc("increment_quantity", {
            p_product_id: product.id,
            p_created_by: created_by,
            p_status: "cart",
        });
    } else {
        const { error } = await supabase
            .from("cart")
            .insert({
                product_id: product.id,
                created_by,
                quantity: 1,
                status: "cart",
            })
            .select("*");

        if (error) return { error: error.message };
    }

    await supabase.from("cart_history").insert({
        product_id: product.id,
        created_by,
    });

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
        .eq("created_by", created_by)
        .eq("status", "cart");

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

export async function getRetailerByUpi({
    pa,
    pn,
    lat,
    lng,
    acc,
}: IGetRetailer) {
    const supabase = createClient();

    if (!pa) return { error: "Invalid UPI" };
    if (!pn) return { error: "Invalid Name" };
    if (!lat || !lng || !acc) return { error: "Invalid location" };

    const { data } = await supabase
        .from("retailers")
        .select("id")
        .eq("upi", pa)
        .single();

    if (data?.id) return { data };

    const { data: retailer, error: retailerError } = await supabase
        .from("retailers")
        .insert({
            upi: pa,
            name: pn,
            latitude: lat,
            longitude: lng,
            accuracy: acc,
        })
        .select("id")
        .single();

    if (retailerError) return { error: retailerError.message };

    return { data: retailer };
}

export async function countCartItems() {
    const supabase = createClient();

    const created_by = await getSessionUserId();
    if (!created_by) return 0;

    const { data, error } = await supabase
        .from("cart")
        .select("quantity, id")
        .eq("created_by", created_by)
        .eq("status", "cart");

    if (error) return 0;

    return data.reduce((acc, item) => acc + item.quantity, 0);
}

export async function bulkCartStatusUpdate(
    status: string,
    newStatus: string,
    bought_from: string
) {
    const supabase = createClient();

    const created_by = await getSessionUserId();
    if (!created_by) return { error: "User not found" };

    const { error } = await supabase
        .from("cart")
        .update({
            status: newStatus,
            bought_from,
            bought_at: new Date().toISOString(),
        })
        .eq("created_by", created_by)
        .eq("status", status);

    if (error) return { error: error.message };

    return { message: "Cart updated. Redirecting..." };
}

export async function getHistory(userId?: string) {
    const supabase = createClient();

    if (!userId) return [];

    const { data, error } = await supabase
        .from("cart_history")
        .select(
            "id, created_at, product_id, product:products!product_id(id, gtin, name, description)"
        )
        .eq("created_by", userId);

    if (error) return [];

    return data;
}

export async function getScanItemsData() {
    const supabase = createClient();

    // Get the current date in UTC
    const now = new Date();
    const todayUTC = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    // Calculate 6 days ago in UTC (to get 7 days including today)
    const sixDaysAgoUTC = new Date(todayUTC);
    sixDaysAgoUTC.setUTCDate(todayUTC.getUTCDate() - 6);

    const { data, error } = await supabase
        .from("cart_history")
        .select("created_at")
        .gte("created_at", sixDaysAgoUTC.toISOString())
        .lt("created_at", new Date(todayUTC.getTime() + 86400000).toISOString()) // Include all of today
        .order("created_at");

    // Initialize allDates with the past 7 days (including today)
    const allDates: { [key: string]: number } = {};
    for (
        let d = new Date(sixDaysAgoUTC);
        d <= todayUTC;
        d.setUTCDate(d.getUTCDate() + 1)
    ) {
        allDates[d.toISOString().split("T")[0]] = 0;
    }

    if (error) {
        return Object.entries(allDates).map(([date]) => ({
            date,
            scanned: 0,
        }));
    }

    data.forEach((item) => {
        const date = new Date(item.created_at).toISOString().split("T")[0];
        allDates[date] = (allDates[date] || 0) + 1;
    });

    const result = Object.entries(allDates).map(([date, scanned]) => ({
        date,
        scanned,
    }));

    return result;
}

export async function getRecyclingRate() {
    const supabase = createClient();

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).toISOString();
    const endOfYear = new Date(
        currentYear,
        11,
        31,
        23,
        59,
        59,
        999
    ).toISOString();

    const { data, error } = await supabase
        .from("cart")
        .select("status, quantity")
        .gte("created_at", startOfYear)
        .lte("created_at", endOfYear)
        .in("status", ["bought", "returned"]);

    if (error)
        return {
            year: currentYear,
            boughtCount: 0,
            returnedCount: 0,
            recyclingRate: 0,
        };

    let boughtCount = 0;
    let returnedCount = 0;

    data.forEach((item) => {
        if (item.status === "bought") return (boughtCount += item.quantity);

        returnedCount += item.quantity;
    });

    const recyclingRate =
        boughtCount > 0 ? (returnedCount / boughtCount) * 100 : 0;

    return {
        year: currentYear,
        boughtCount,
        returnedCount,
        recyclingRate: parseFloat(recyclingRate.toFixed(2)),
    };
}

export async function getBoughtPackages() {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("cart")
        .select(
            "id, product_id, quantity, created_at, product:products!product_id(id, gtin, brand, name, images, description)"
        )
        .eq("status", "bought");

    if (error) return [];

    return data;
}

export async function returnProducts({ merchantId, productIds }: IReturn) {
    const supabase = createClient();

    const created_by = await getSessionUserId();
    if (!created_by) return { error: "User not found" };

    const { data, error } = await supabase
        .from("cart")
        .update([
            {
                status: "returned",
                returned_to: merchantId,
                returned_at: new Date().toISOString(),
            },
        ])
        .eq("created_by", created_by)
        .in("id", productIds);

    if (error) return { error: error.message };

    return { data };
}
