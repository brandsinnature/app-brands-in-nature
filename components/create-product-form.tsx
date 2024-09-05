"use client";

import Container from "@/components/ui/container";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
    CreateProductSchema,
    ICreateProduct,
} from "@/components/forms/create-product";
import { Input } from "@/components/ui/input";

interface Props {
    code: string;
}

export default function CreateProductForm({ code }: Props) {
    const form = useForm<ICreateProduct>({
        resolver: zodResolver(CreateProductSchema),
        defaultValues: {
            title: "",
        },
    });

    const onSubmit = async (formData: ICreateProduct) => {
        return;
    };

    return (
        <Container className="space-y-8">
            <div>
                <h1 className="font-semibold text-lg">Create Product</h1>
                <p className="text-muted-foreground text-xs">#{code}</p>
            </div>

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-8 w-full"
                >
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Enter title"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </form>
            </Form>
        </Container>
    );
}
