import Navbar from "@/components/navbar";

type Props = {
    children: React.ReactNode;
};

export default function RootLayout({ children }: Props) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            {/* <Footer /> */}
        </>
    );
}
