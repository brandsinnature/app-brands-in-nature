import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Container from "@/components/ui/container";
import { getCurrentUser } from "@/data-access/auth";
import { format } from "date-fns";
import { Metadata } from "next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getHistory } from "@/data-access/product";
import { categorizeDate } from "@/lib/utils";
import { IHistory } from "@/utils/common.interface";
import Show from "@/components/scandit/Show";
import { PiScanLight } from "react-icons/pi";

export const metadata: Metadata = {
    title: "Profile",
};

export default async function Profile() {
    const user = await getCurrentUser();

    const history = await getHistory(user?.id);

    const groupedHistoryItems = (history as unknown as IHistory[]).reduceRight(
        (acc, item) => {
            const category = categorizeDate(new Date(item.created_at));
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        },
        {} as Record<string, IHistory[]>
    );

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
                <TabsContent value="history">
                    <Show when={!Object.entries(groupedHistoryItems)?.length}>
                        <PiScanLight className="mx-auto mt-20" size={64} />
                        <p className="pt-3 font-normal font-voska text-center text-muted-foreground">
                            Your scan history will appear here
                        </p>
                    </Show>

                    <div className="space-y-4 px-4 divide-y">
                        {Object.entries(groupedHistoryItems).map(
                            ([date, items]) => (
                                <div key={date} className="space-y-2">
                                    <p className="pt-3 font-normal font-voska text-left text-muted-foreground">
                                        {date}
                                    </p>
                                    <div className="space-y-4 divide-y">
                                        {items.map(({ id, product }) => (
                                            <div
                                                key={id}
                                                className="flex flex-col gap-1 pt-4 first:pt-0 w-full"
                                            >
                                                <div className="flex items-center gap-3 w-full">
                                                    <PiScanLight size={24} />
                                                    <div className="space-y-1 grow">
                                                        <div className="flex justify-between items-center w-full">
                                                            <p className="font-medium text-left text-sm">
                                                                {product?.name ||
                                                                    "--"}
                                                            </p>
                                                            <p className="font-semibold text-primary text-sm whitespace-nowrap">
                                                                + 5 INR
                                                            </p>
                                                        </div>

                                                        <div className="flex justify-between items-center w-full font-light text-muted-foreground text-xs">
                                                            <p className="mr-2 truncate">
                                                                {product?.description ||
                                                                    "--"}
                                                            </p>
                                                            <p className="whitespace-nowrap">
                                                                Scanned
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </Container>
    );
}
