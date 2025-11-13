import { useState } from "react";
import { Link } from "react-router-dom";
import { AlignLeft, XIcon } from "lucide-react";
import { MenuUserNavBar } from "./menuUser";
import { LogoApp } from "../logo";

const NavBar = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <>
            <nav className="border-b px-4 py-6 border-slate-50 fixed left-0 right-0 top-0 z-50 bg-white">
                <div className="flex flex-wrap justify-between items-center">
                    <div className="flex justify-start items-center">
                        <button
                            data-drawer-target="drawer-navigation"
                            data-drawer-toggle="drawer-navigation"
                            aria-controls="drawer-navigation"
                            className="p-2 mr-2 text-gray-600 rounded-lg cursor-pointer md:hidden hover:text-gray-900 hover:bg-gray-100  focus:ring-2 focus:ring-gray-100 dark:focus:ring-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {!mobileMenuOpen ? (<AlignLeft />) : (<XIcon className="w-6 h-6" />)}
                            <span className="sr-only">Toggle sidebar</span>
                        </button>
                        <Link
                            to={`/app`}
                            className="flex items-center justify-between"
                            id="drawer-navigation"
                        >
                            <LogoApp size="medium" />
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <MenuUserNavBar />
                    </div>
                </div>
            </nav>
        </>
    );
}

export default NavBar;