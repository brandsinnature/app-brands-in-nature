import Container from "@/components/ui/container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AllProducts from "./all-products";
import MyProducts from "./my-products";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard",
};

export default function Home() {
    return (
        <Container>
            <Tabs defaultValue="all" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="all">All Products</TabsTrigger>
                    <TabsTrigger value="my">My Products</TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                    <AllProducts />
                </TabsContent>
                <TabsContent value="my">
                    <MyProducts />
                </TabsContent>
            </Tabs>
        </Container>
    );
}
