import { ReactNode, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ToggleSectionProps {
    title: string;
    defaultOpen?: boolean;
    children: ReactNode;
}

export const ToggleSection = ({ title, defaultOpen = false, children }: ToggleSectionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="w-full">
            <div
                className="flex justify-between items-center cursor-pointer mb-2"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h2 className="text-1xl font-semibold text-slate-600">{title}</h2>
                {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>
            {isOpen && <div>{children}</div>}
        </div>
    );
};
