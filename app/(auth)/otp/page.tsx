import { Metadata } from "next";

import OtpForm from "@/components/forms/otp-form";
import { getCurrentUser } from "@/data-access/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "OTP Verification",
    description: "Verify your phone number",
};

export default async function LoginSignUp() {
    const user = await getCurrentUser();

    if (user) redirect("/scan");

    return <OtpForm />;
}
