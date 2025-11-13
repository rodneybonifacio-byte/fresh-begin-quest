import React, { useRef, useState, type ComponentProps } from "react";
import { Link } from "react-router-dom";
import { tv, VariantProps } from 'tailwind-variants'
import config from "../utils/config";

const aVariants = tv({
    base: 'self-stretch flex flex-row gap-4 items-center justify-between',

    variants: {
        variant: {
            primary: 'border-b border-[#E3E4E8]',
            secondary: 'border-none',
        },
        size: {
            default: 'py-4',
        },
        display: {
            show: '',
            hidden: 'hidden'
        }
    },

    defaultVariants: {
        variant: 'primary',
        size: 'default'
    }
})

interface SidebarItemProps extends ComponentProps<'a'>, VariantProps<typeof aVariants> {
    icon: string;
    title: string;
    description?: string;
    to: string;
    onClick?: () => void; // Adicionando onClick como prop opcional
}

const SidebarItem = ({ icon, title, description, to, variant, size, display, onClick, ...props }: SidebarItemProps) => {

    const handleClick = () => {
        if (onClick) onClick(); // Chama a função de fechamento, se existir
        if (to.startsWith('#')) {
            const element = document.getElementById(to.substring(1)); // Obtém o elemento pela ID
            element?.scrollIntoView({ behavior: 'smooth' }); // Rola suavemente para o elemento
        }
    };

    return (
        <Link to={to} {...props} className={aVariants({ variant, size, display })} onClick={handleClick}>
            <div className="flex flex-row gap-3 items-center">
                <img src={icon} alt="icon" className="w-6 h-6 relative flex-col justify-start items-start inline-flex" />
                <div className="flex flex-col">
                    <span className="text-[#1D2939] text-[16px] font-[400]">{title}</span>
                    <span className="text-[#475467] text-[12px] font-[400]">{description}</span>
                </div>
            </div>
            <img src="/images/group.svg" alt="groupIcon" className="w-6 h-6 py-2" />
        </Link>
    )
}

interface SideMenuProps {
    id: string;
    isOpen: boolean;
    closeSidebar?: () => void;
}

export const Sidebar: React.FC<SideMenuProps> = ({ id, isOpen, closeSidebar }) => {
    const [authenticado] = useState(true);

    const { siteName } = config;

    const asideRef = useRef<HTMLDivElement>(null);
    return (
        <aside ref={asideRef} id={id} className={`bg-[#fefefe] fixed top-0 left-0 z-40 w-full h-screen py-2 px-6 transition-transform ${isOpen ? '' : '-translate-x-full'}  xl:px-72`} aria-label="Sidebar">
            <div className="h-screen w-full">
                {/* Header */}
                <header className="fixed flex flex-row top-0 left-0 w-full py-2 px-6 h-[100px] justify-between items-center border-b border-[#E3E4E8] bg-white z-10 xl:px-72">
                    <div className="flex gap-3">
                        <img src="/images/logo.svg" alt="tem-proposta" className="w-10 max-w-10 h-10 max-h-10" />
                        <span className="font-semibold text-2xl text-[#1D2939]">{authenticado ? 'Edson Costa' : siteName}</span>
                    </div>
                    <button onClick={closeSidebar}>
                        <img src="/images/close.svg" alt="groupIcon" className="w-6 max-w-6 h-6 max-h-6 " />
                    </button>
                </header>

                {/* Sidebar */}
                <div className="flex flex-col gap-3 mt-[72px] overflow-y-auto h-full">
                    <SidebarItem icon="/images/car.svg" display={authenticado ? 'show' : 'hidden'} title="Button" description="Componente de button" to="/button" />
                </div>
            </div>
        </aside>
    )
}