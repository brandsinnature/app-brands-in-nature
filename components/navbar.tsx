import { ThemeToggle } from "@/components/ui/toggle-theme";
import Logo from "./logo";

export default function Navbar() {
    return (
        <nav className="relative z-50 flex justify-between items-center bg-background px-4 py-3 border-b">
            <Logo />
            <ThemeToggle />
        </nav>
    );
}
