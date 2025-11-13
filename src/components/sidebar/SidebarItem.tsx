import { ChevronDown, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

interface SidebarItemProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    to?: string;
    active?: boolean;
    submenu?: SidebarItemProps[];
    isSidebarOpen?: boolean;
    onClick?: () => void;
    onItemClick?: (label: string) => void;
}

export const SidebarItem: React.FC<SidebarItemProps & {
    onItemClick?: (itemName: string) => void;
    isSidebarOpen: boolean;
    onClick?: () => void;
    handleItemClick?: (itemName: string) => void;
}> = ({
    label, icon: Icon, submenu, active, to, isSidebarOpen, onClick, handleItemClick
}) => {
        const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
        const [isHovered, setIsHovered] = useState(false);
        const itemRef = useRef<HTMLDivElement>(null);
        const hasSubmenu = submenu && submenu.length > 0;

        const content = (
            <div className={`flex items-center p-3 mx-2 rounded-md hover:bg-accent transition-colors cursor-pointer ${active ? 'bg-accent text-primary font-medium' : 'text-muted-foreground'
                }`}>
                <Icon className="w-5 h-5" />
                {/* Desktop: mostra texto quando isSidebarOpen é true, Mobile: sempre mostra */}
                <span className={`ml-3 flex-1 lg:${isSidebarOpen ? 'block' : 'hidden'}`}>
                    {label}
                </span>
                {hasSubmenu && (
                    <div className={`lg:${isSidebarOpen ? 'block' : 'hidden'} text-muted-foreground`}>
                        {isSubmenuOpen ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </div>
                )}
            </div>
        );

        return (
            <li>
                <div
                    ref={itemRef}
                    className="relative"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {to && !hasSubmenu ? (
                        <Link to={to}>
                            {content}
                        </Link>
                    ) : (
                        <a
                            href="#"
                            onClick={(e) => {
                                if (hasSubmenu) {
                                    e.preventDefault();
                                    setIsSubmenuOpen(!isSubmenuOpen);
                                } else if (onClick) {
                                    e.preventDefault();
                                    onClick();
                                }
                            }}
                        >
                            {content}
                        </a>
                    )}

                    {/* Desktop: submenu aparece inline quando sidebar aberto, ou como popover quando minimizado */}
                    {hasSubmenu && (
                        <>
                            {/* Submenu inline quando sidebar está aberto e expandido */}
                            {isSidebarOpen && isSubmenuOpen && (
                                <ul className="ml-8 mt-1 space-y-1">
                                    {submenu.map((item, index) => (
                                        <li key={index}>
                                            {item.to ? (
                                                <Link
                                                    to={item.to}
                                                    className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${item.active
                                                        ? 'bg-accent text-primary'
                                                        : 'text-muted-foreground hover:bg-accent'
                                                        }`}
                                                >
                                                    <item.icon className="w-4 h-4 mr-3" />
                                                    {item.label}
                                                </Link>
                                            ) : (
                                                <a
                                                    href="#"
                                                    className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${item.active
                                                        ? 'bg-accent text-primary'
                                                        : 'text-muted-foreground hover:bg-accent'
                                                        }`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (handleItemClick) {
                                                            handleItemClick(item.label);
                                                        }
                                                    }}
                                                >
                                                    <item.icon className="w-4 h-4 mr-3" />
                                                    {item.label}
                                                </a>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Submenu como popover quando sidebar está minimizado e hover - APENAS DESKTOP */}
                            {hasSubmenu && !isSidebarOpen && isHovered && window.innerWidth >= 1024 && createPortal(
                                <div
                                    className="fixed bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-xl py-2 min-w-[200px] z-[60]"
                                    style={{
                                        left: '5rem', // 80px (w-20 do sidebar) 
                                        top: itemRef.current ? `${itemRef.current.getBoundingClientRect().top}px` : '0px',
                                    }}
                                >
                                    {/* Seta indicativa */}
                                    <div className="absolute left-0 top-4 transform -translate-x-full">
                                        <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-200 dark:border-r-slate-700"></div>
                                        <div className="absolute top-0 left-0.5 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-white dark:border-r-slate-800"></div>
                                    </div>

                                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700 mb-2">
                                        {label}
                                    </div>
                                    {submenu.map((item, index) => (
                                        <div key={index}>
                                            {item.to ? (
                                                <Link
                                                    to={item.to}
                                                    className={`flex items-center px-3 py-2 text-sm transition-colors ${item.active
                                                        ? 'bg-primary/10 dark:bg-white/10 text-primary dark:text-white'
                                                        : 'text-gray-600 dark:text-slate-400 hover:bg-primary/5 dark:hover:bg-white/5 hover:text-primary dark:hover:text-white'
                                                        }`}
                                                >
                                                    <item.icon className="w-4 h-4 mr-3" />
                                                    {item.label}
                                                </Link>
                                            ) : (
                                                <a
                                                    href="#"
                                                    className={`flex items-center px-3 py-2 text-sm transition-colors ${item.active
                                                        ? 'bg-primary/10 dark:bg-white/10 text-primary dark:text-white'
                                                        : 'text-gray-600 dark:text-slate-400 hover:bg-primary/5 dark:hover:bg-white/5 hover:text-primary dark:hover:text-white'
                                                        }`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (handleItemClick) {
                                                            handleItemClick(item.label);
                                                        }
                                                    }}
                                                >
                                                    <item.icon className="w-4 h-4 mr-3" />
                                                    {item.label}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>,
                                document.body
                            )}
                        </>
                    )}
                </div>
            </li>
        );
    };