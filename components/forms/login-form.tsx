"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    type ILoginForm,
    LoginFormSchema,
} from "@/components/forms/login.schema";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LuArrowRight } from "react-icons/lu";
import { login } from "@/data-access/auth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginForm() {
    const search = useSearchParams();
    const error_description = search.get("error_description");

    const form = useForm<ILoginForm>({
        resolver: zodResolver(LoginFormSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (formData: ILoginForm) => {
        const { error, message } = await login(formData);

        if (error) return toast(error);

        toast.success(message);
        form.reset();
    };

    const loading = form.formState.isSubmitting;

    useEffect(() => {
        toast.error(error_description);
    }, [error_description]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
                <Card className="space-y-8">
                    <CardHeader>
                        <CardTitle>Login/Signup</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            id="email"
                                            placeholder="john@example.com"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>

                    <CardFooter className="justify-end">
                        <Button disabled={loading} loading={loading}>
                            Send Magic Link
                            <LuArrowRight className="ms-2" />
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
