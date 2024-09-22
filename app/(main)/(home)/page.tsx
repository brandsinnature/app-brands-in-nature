import Container from "@/components/ui/container";
import { Metadata } from "next";
import { DashboardRcc } from "./dashboard-rcc";
import { getRecyclingRate, getScanItemsData } from "@/data-access/product";

export const metadata: Metadata = {
    title: "Dashboard",
};

export default async function Home() {
    const scanData = await getScanItemsData();

    const recyclingData = await getRecyclingRate();

    return (
        <Container>
            <DashboardRcc scanData={scanData} recyclingData={recyclingData} />
        </Container>
    );
}
