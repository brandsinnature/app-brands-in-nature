import { ThemeToggle } from "@/components/ui/toggle-theme";
import Logo from "./logo";

export default function Navbar() {
    return (
        <nav className="flex justify-between items-center px-4 py-3 border-b">
            <Logo />
            <ThemeToggle />
        </nav>
    );
}
