import * as z from "zod";

export const OtpFormSchema = z.object({
    otp: z.string().min(9, {
        message: "Phone number must be at least 9 characters",
    }),
});

export type IOtpForm = z.infer<typeof OtpFormSchema>;
