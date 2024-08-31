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
import { PhoneInput } from "@/components/ui/phone-input";

export default function LoginForm() {
    const form = useForm<ILoginForm>({
        resolver: zodResolver(LoginFormSchema),
        defaultValues: {
            phone: "",
        },
    });

    const onSubmit = async (formData: ILoginForm) => {
        const res = await login(formData);

        if (res?.error) return toast(res.error);
    };

    const loading = form.formState.isSubmitting;

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
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone number</FormLabel>
                                    <FormControl>
                                        <PhoneInput
                                            id="phone"
                                            placeholder="Enter phone"
                                            international
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
                            Continue
                            <LuArrowRight className="ms-2" />
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
