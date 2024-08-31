import { Metadata } from "next";

import LoginForm from "@/components/forms/login-form";
import { getCurrentUser } from "@/data-access/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Login",
    description: "Login to your account",
};

export default async function LoginSignUp() {
    const user = await getCurrentUser();

    if (user) redirect("/scan");

    return <LoginForm />;
}
