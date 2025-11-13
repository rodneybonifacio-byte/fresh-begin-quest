import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { preloadRouteByPath } from "../../router/preload.utils";

export interface PropsMenuItem {
    icon: React.ReactNode;
    title: string;
    to: string;
    submenu?: PropsMenuItem[];
    openMenuTitle?: string | null;
    setOpenMenuTitle?: (title: string | null) => void;
}

export const MenuItem: React.FC<PropsMenuItem> = ({
    icon,
    title,
    to,
    submenu,
    openMenuTitle,
    setOpenMenuTitle,
}) => {
    const location = useLocation();
    const navigate = useNavigate();

    const hasSubmenu = submenu && submenu.length > 0;
    const isOpen = openMenuTitle === title;

    const isActive = () => {
        if (!hasSubmenu) {
            return location.pathname === to;
        }
        return submenu!.some((sub) => location.pathname.startsWith(sub.to));
    };

    useEffect(() => {
        if (isActive() && hasSubmenu) {
            setOpenMenuTitle?.(title);
        }
    }, []);

    const handleClick = (e: React.MouseEvent) => {
        if (hasSubmenu) {
            e.preventDefault();
            setOpenMenuTitle?.(isOpen ? null : title);
        } else {
            preloadRouteByPath(to); // 🔥 Preload na hora do clique
            setOpenMenuTitle?.(null);
            navigate(to);
        }
    };

    const active = isActive();

    return (
        <li className="flex flex-col">
            <div className="flex items-center justify-between w-full">
                <Link
                    to={hasSubmenu ? "#" : to}
                    onClick={handleClick}
                    className={`flex items-center w-full p-2 text-base font-normal rounded-lg transition-colors duration-300
            ${active ? "bg-slate-100 text-gray-900" : "hover:bg-slate-100"}`}
                >
                    {icon}
                    <span className="flex-1 ml-3 text-left">{title}</span>
                    {hasSubmenu && (
                        isOpen ? <ChevronDown className="text-blue-500 w-4" /> : <ChevronRight className="w-4" />
                    )}
                </Link>
            </div>

            {hasSubmenu && (
                <ul className={`pl-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[500px]" : "max-h-0"}`}>
                    {submenu!.map((subItem) => (
                        <MenuItem key={subItem.title} {...subItem} openMenuTitle={openMenuTitle} setOpenMenuTitle={setOpenMenuTitle} />
                    ))}
                </ul>
            )}
        </li>
    );
};
