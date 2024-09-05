import * as z from "zod";

export const CreateProductSchema = z.object({
    title: z.string().min(2, {
        message: "Title is required.",
    }),
});

export type ICreateProduct = z.infer<typeof CreateProductSchema>;
