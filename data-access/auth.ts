import { ILoginForm } from "@/components/forms/login.schema";
import { createClient } from "@/utils/supabase/client";

export async function login(loginForm: ILoginForm) {
    const client = createClient();

    const { error } = await client.auth.signInWithOtp({
        ...loginForm,
        options: {
            shouldCreateUser: true,
            emailRedirectTo: `${process.env.META_URL}/scan`,
        },
    });

    if (error) return { error: error.message };

    return { message: "Magic link sent to your mail" };
}

export async function getCurrentUser() {
    const client = createClient();

    const { data, error } = await client.auth.getUser();

    if (error) return null;

    return data.user;
}
