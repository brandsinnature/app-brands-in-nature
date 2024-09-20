import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Container from "@/components/ui/container";
import { getCurrentUser } from "@/data-access/auth";
import { format } from "date-fns";
import { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
    title: "Profile",
};

export default async function Profile() {
    const user = await getCurrentUser();

    return (
        <Container className="p-0">
            <div className="flex flex-col justify-center space-y-2 bg-gradient-to-r from-sky-500 to-indigo-500 px-10 h-60">
                <Avatar className="bg-white/40 size-16">
                    <AvatarImage src="/default-user.png" alt="@shadcn" />
                    <AvatarFallback>BIN</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <p className="font-normal font-voska text-left text-xl tracking-[0.05em]">
                        {user?.email}
                    </p>
                    <p className="font-normal text-sm">
                        Joined {format(new Date(user?.created_at || ""), "PP")}
                    </p>
                </div>
            </div>
            <Tabs defaultValue="history" className="w-full">
                <TabsList className="grid grid-cols-2 rounded-none w-full">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                <TabsContent value="profile"></TabsContent>
                <TabsContent value="history"></TabsContent>
            </Tabs>
        </Container>
    );
}
