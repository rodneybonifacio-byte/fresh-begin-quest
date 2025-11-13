import { EllipsisVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export interface DropdownItem {
    id: string;
    label: string;
    subTitle?: string;
    type: 'link' | 'button';
    onClick?: () => void;
    to?: string;   // Para Link do react-router-dom
    href?: string; // Para link externo
    isShow?: boolean;
    target?: '_blank' | undefined; // Para links externos, como "_blank"
}

interface TableDropdownProps {
    dropdownKey: string;
    items: DropdownItem[];
}

export const TableDropdown = ({ dropdownKey, items }: TableDropdownProps) => {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = (id: string) => {
        if (openDropdown === id) {
            setOpenDropdown(null);
        } else {
            // Dispara evento para fechar todos os dropdowns que não sejam o que está sendo aberto
            const event = new CustomEvent("closeDropdowns", { detail: { source: id } });
            document.dispatchEvent(event);
            setOpenDropdown(id);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!(event.target as HTMLElement).closest('.dropdown-container')) {
                setOpenDropdown(null);
            }
        };

        const handleCloseDropdowns = (event: CustomEvent) => {
            // Fecha este dropdown se o evento não veio dele
            if (event.detail.source !== dropdownKey) {
                setOpenDropdown(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        document.addEventListener("closeDropdowns", handleCloseDropdowns as EventListener);
        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener("closeDropdowns", handleCloseDropdowns as EventListener);
        };
    }, [dropdownKey]);

    return (
        <div className="relative dropdown-container">
            <button
                onClick={() => toggleDropdown(dropdownKey)}
                className="text-sm font-medium text-white rounded-md hover:text-white flex"
            >
                <EllipsisVertical className="text-slate-950 dark:text-slate-100" />
            </button>

            {openDropdown === dropdownKey && (
                <div
                    ref={dropdownRef}
                    className={`text-left absolute mt-1 w-60 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 -right-52 md:right-12`}
                >
                    <ul className="py-2">
                        {items.filter(item => item.isShow !== false).map(item => (
                            <li key={item.id}>
                                {item.type === 'link' && item.to ? (
                                    <Link to={item.to} {...item.target ? { target: item.target } : {}} className="flex flex-col px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                                        {item.label}
                                        {item.subTitle && <small className="text-slate-400 dark:text-slate-300">{item.subTitle}</small>}
                                    </Link>
                                ) : item.type === 'link' && item.href ? (
                                    <a href={item.href} className="flex flex-col px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                                        {item.label}
                                        {item.subTitle && <small className="text-slate-400 dark:text-slate-300">{item.subTitle}</small>}
                                    </a>
                                ) : (
                                    <button
                                        onClick={item.onClick}
                                        className="w-full flex-col text-left flex px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                    >
                                        {item.label}
                                        {item.subTitle && <small className="text-slate-400 dark:text-slate-300">{item.subTitle}</small>}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
