import Navbar from "@/components/navbar";

type Props = {
    children: React.ReactNode;
};

export default function AuthLayout({ children }: Props) {
    return (
        <>
            <Navbar />
            <main className="flex flex-col justify-center items-center px-4 h-[calc(100vh-65px)]">
                {children}
            </main>
            {/* <Footer /> */}
        </>
    );
}
