import Container from "@/components/ui/container";
import { Metadata } from "next";
import DepositPage from "./deposit-rcc";

export const metadata: Metadata = {
    title: "Deposit",
};

export default function page() {
    return (
        <Container className="mb-0 p-0">
            <DepositPage />
        </Container>
    );
}
