import * as z from "zod";

export const LoginFormSchema = z.object({
    phone: z.string().min(9, {
        message: "Phone number must be at least 9 characters",
    }),
});

export type ILoginForm = z.infer<typeof LoginFormSchema>;
