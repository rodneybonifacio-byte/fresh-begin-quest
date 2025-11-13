import { Power, UserRound } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { MenuItem } from "./itemMenu";
import authStore from "../../authentica/authentication.store";
import { useAllowedMenuItems, type PropsMenuItemExtended } from "../../hooks/useAllowedMenuItems";
import { truncateText } from "../../utils/funcoes";
import { useAuth } from "../../providers/AuthContext";
import clsx from "clsx";

interface PropsSideMenu {
    menuItems: PropsMenuItemExtended[];
    isOpen: boolean;
    closeMenu: () => void;
}

export const Aside: React.FC<PropsSideMenu> = ({ isOpen, closeMenu, menuItems }) => {

    const { user, logout } = useAuth();
    const userPermissions = authStore.getPermissions();

    const allowedMenuItems = useAllowedMenuItems(menuItems, userPermissions);
    const asideRef = useRef<HTMLDivElement>(null);

    // 🎯 Novo controle global de menu aberto
    const [openMenuTitle, setOpenMenuTitle] = useState<string | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const isMobile = window.matchMedia('(max-width: 1023px)').matches;
            if (isMobile && asideRef.current && !asideRef.current.contains(event.target as Node)) {
                closeMenu();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [closeMenu]);


    return (
        <aside
            ref={asideRef}
            className={clsx(
                "fixed top-0 left-0 z-40 w-64 h-screen pt-28 transition-transform border-r border-zinc-50 dark:border-slate-700 bg-white dark:bg-slate-900",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}
        >
            <div className="h-full px-3 pb-4 overflow-y-auto">
                <ul className="space-y-1 font-medium">
                    {allowedMenuItems.map((item) => (
                        <MenuItem key={item.title} {...item}
                            openMenuTitle={openMenuTitle}
                            setOpenMenuTitle={setOpenMenuTitle} />
                    ))}
                </ul>

                <div className="sticky top-[100vh] dark:text-gray-400">
                    <div className="flex flex-row h-20 items-center gap-3 border-t-1 border-gray-200 dark:border-gray-600">
                        <div className="flex gap-2 items-center w-4/5">
                            <UserRound className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700 border-2 border-gray-200 dark:border-gray-600 rounded-full" size={32} />
                            <div className="flex flex-col text-xs text-start text-gray-700 dark:text-gray-300">
                                <span>{truncateText(user?.name || "", 15)}</span>
                                <span>{truncateText(user?.email || "", 20)}</span>
                            </div>
                        </div>
                        <div className="w-1/5">
                            <button
                                onClick={logout}
                                className="flex flex-row text-danger gap-4 items-center w-auto justify-between cursor-pointer p-2 mr-1 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:text-danger-400 dark:hover:text-white dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600">
                                <Power size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}