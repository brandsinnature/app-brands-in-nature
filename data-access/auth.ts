import { ILoginForm } from "@/components/forms/login.schema";
import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";

export async function login(loginForm: ILoginForm) {
    const client = createClient();

    const { data, error } = await client.auth.signInWithOtp(loginForm);
    console.log("🚀 ~ login ~ data:", data);
    console.log("🚀 ~ login ~ error:", error);

    if (error) return { error: error.message };

    // redirect("/scan");
}

export async function getCurrentUser() {
    const client = createClient();

    const { data, error } = await client.auth.getUser();

    if (error) return null;

    return data.user;
}
