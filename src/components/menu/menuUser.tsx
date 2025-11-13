import { Power, UserRound } from "lucide-react"
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom"
import { useAuth } from "../../providers/AuthContext";
import { useLayout } from "../../providers/LayoutContext";
import { SaldoCliente } from "../SaldoCliente";

export const planos = {
    "Brlog Gold": "bg-yellow-500 text-black",
    "Brlog Platinum": "bg-gray-400 text-black",
    "Brlog Diamond": "bg-slate-900 text-white",
    "Brlog Silver": "bg-zinc-300 text-black",
    "Brlog Rubi": "bg-red-700 text-white",
    "VESTI TOP": "bg-blue-500 text-white",
    "VESTI MEDIO": "bg-blue-900 text-white",
    "ADMINISTRADOR": "bg-slate-900 text-white",
    "default": "bg-gray-200 text-black",
};


export const MenuUserNavBar = () => {
    const { user, logout } = useAuth();
    const { layout } = useLayout();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    return (
        <div className="relative text-slate-900" ref={dropdownRef}>
            <button
                className="flex text-sm bg-slate-800 rounded-full"
                onClick={toggleDropdown}
            >
                <UserRound className="text-slate-800 bg-slate-50 border-2 rounded-full" size={28} />
            </button>

            {dropdownOpen && (
                <div className="text-slate-600 z-50 absolute right-0 mt-2 w-56 text-base list-none bg-white divide-y divide-slate-400 rounded shadow border-1" id="dropdown-user" >
                    <div className="py-3 px-4 flex flex-col gap-2">
                        <div>
                            <span className="block text-sm font-semibold truncate">
                                {user?.name}
                            </span>
                            <small> {user?.email}</small>
                        </div>
                        {user?.role === "CLIENTE" || layout === "app" && (
                            <div className="block sm:hidden mt-3">
                                <SaldoCliente />
                            </div>
                        )}
                    </div>
                    <ul className="py-1" aria-labelledby="dropdown">
                        {user?.role === "ADMIN" && (
                            <li>
                                <Link to={layout === "admin" ? "/app" : "/admin"} className="block py-2 px-4 text-sm hover:bg-slate-100" >
                                    Painel do {layout === "admin" ? "Cliente" : "Administrador"}
                                </Link>
                            </li>
                        )}

                        <li>
                            <Link to="/app/profile" className="block py-2 px-4 text-sm hover:bg-slate-100">
                                Meu Perfil
                            </Link>
                        </li>
                    </ul>
                    <ul className="py-1 text-slate-300" aria-labelledby="dropdown" >
                        <li>
                            <div
                                onClick={logout}
                                className="flex flex-row gap-4 py-2 px-4 text-sm cursor-pointer hover:bg-slate-100"
                            >
                                <Power size={18} className="text-red-500" />
                                <span className="text-red-500">Sign out</span>
                            </div>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    )
}