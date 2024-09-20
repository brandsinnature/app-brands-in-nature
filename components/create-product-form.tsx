"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createProduct } from "@/data-access/product";
import { CompleteProduct } from "@/utils/common.interface";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

const formSchema = z.object({
    brand: z.string().min(1, "Brand is required"),
    name: z.string().min(1, "Name is required"),
    gtin: z.string().min(1, "GTIN is required"),
    category: z.string().min(1, "Category is required"),
    sub_category: z.string().min(1, "Sub category is required"),
    description: z.string().min(1, "Description is required"),
    country_of_origin: z.string().min(1, "Country of origin is required"),
    weights_and_measures: z.object({
        net_weight: z.string().min(1, "Net weight is required"),
        measurement_unit: z.string().min(1, "Measurement unit is required"),
    }),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
    code: string;
    setOpen: (open: boolean) => void;
};

export default function CreateProductForm({ code, setOpen }: Props) {
    const search = useSearchParams();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            brand: search.get("brand") ?? "",
            name: search.get("name") ?? "",
            gtin: code,
            category: search.get("category") ?? "",
            sub_category: search.get("sub_category") ?? "",
            description: search.get("description") ?? "",
            country_of_origin: search.get("country_of_origin") ?? "",
            weights_and_measures: {
                net_weight: search.get("net_weight") ?? "",
                measurement_unit: search.get("measurement_unit") ?? "",
            },
        },
    });

    async function onSubmit(values: FormValues) {
        const { error } = await createProduct(
            values as unknown as CompleteProduct
        );

        if (error) return toast.error(error);

        form.reset();
        toast.success("Product created successfully");
        setOpen(false);
    }

    const isLoading = form.formState.isSubmitting;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="gtin"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>GTIN</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter GTIN"
                                    {...field}
                                    readOnly
                                    disabled
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter product name"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Brand</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter brand name"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value ?? undefined}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="electronics">
                                        Electronics
                                    </SelectItem>
                                    <SelectItem value="clothing">
                                        Clothing
                                    </SelectItem>
                                    <SelectItem value="food">Food</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="sub_category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sub Category</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter sub category"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter product description"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="country_of_origin"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Country of Origin</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter country of origin"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="weights_and_measures.net_weight"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Net Weight</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter net weight"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="weights_and_measures.measurement_unit"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Measurement Unit</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value ?? undefined}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a unit" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="kg">
                                        Kilogram (kg)
                                    </SelectItem>
                                    <SelectItem value="g">Gram (g)</SelectItem>
                                    <SelectItem value="lb">
                                        Pound (lb)
                                    </SelectItem>
                                    <SelectItem value="oz">
                                        Ounce (oz)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button
                    type="submit"
                    className="w-full"
                    loading={isLoading}
                    disabled={isLoading}
                >
                    Submit
                </Button>
            </form>
        </Form>
    );
}
