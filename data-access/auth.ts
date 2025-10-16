"use server";

import { ILoginForm } from "@/components/forms/login.schema";
import { IJwtPayload } from "@/utils/common.interface";
import { createClient } from "@/utils/supabase/server";
import { jwtDecode } from "jwt-decode";
import { redirect } from "next/navigation";

export async function login(loginForm: ILoginForm) {
  const client = createClient();

  // Force the redirect URL to use production domain
  const redirectUrl = process.env.META_URL || "https://mybins.vercel.app";
  const fullRedirectUrl = `${redirectUrl}/auth/confirm?next=/scan`;

  console.log(`Redirect link: ${fullRedirectUrl}`);

  const { error } = await client.auth.signInWithOtp({
    ...loginForm,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: fullRedirectUrl,
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

export async function logout() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) return { error: error.message };

  redirect("/login");
}

export async function getSessionUserId() {
  const client = createClient();

  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) return null;

  const jwt: IJwtPayload = jwtDecode(session?.access_token || "");

  return jwt?.sub;
}

export async function getSessionUser() {
  const client = createClient();

  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) return null;

  const user: IJwtPayload = jwtDecode(session?.access_token || "");

  return user;
}
