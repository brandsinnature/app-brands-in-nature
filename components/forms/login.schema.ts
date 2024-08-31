import * as z from "zod";

export const LoginFormSchema = z.object({
    email: z.string().email({
        message: "Invalid email address.",
    }),
});

export type ILoginForm = z.infer<typeof LoginFormSchema>;
