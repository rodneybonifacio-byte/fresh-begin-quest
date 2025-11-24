import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NotFoundData } from '../../components/NotFoundData';
import { BreadCrumbCustom } from '../../components/breadcrumb';
import clsx from 'clsx';
import { LoadSpinner } from '../../components/loading';
import { ArrowLeft, MoreVertical } from 'lucide-react';

export interface ContentButtonProps {
    label: string;
    onClick?: () => void;
    link?: string;
    isShow?: boolean;
    icon?: React.ReactNode;
    bgColor?: string;
}

interface IContentProps {
    children: React.ReactNode;
    titulo: string;
    subTitulo?: string;
    isButton?: boolean;
    button?: ContentButtonProps[];
    data?: any[];
    isLoading?: boolean;
    isToBack?: boolean;
    isBreadCrumb?: boolean;
}

export const Content = ({ children, titulo, subTitulo, isButton, button, data, isLoading, isToBack, isBreadCrumb = false }: IContentProps) => {
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const visibleButtons = button?.filter((btn) => btn.isShow !== true) || [];

    const voltar = () => navigate(-1);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="flex flex-col gap-3 ">
            {isBreadCrumb && <BreadCrumbCustom />}
            {isLoading && <LoadSpinner mensagem="Carregando..." />}

            <div className="bg-white text-gray-900 dark:text-gray-100 dark:bg-slate-800 w-full p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
                    <div className="flex flex-col flex-1 min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">{titulo}</h1>
                        {subTitulo && <span className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">{subTitulo}</span>}
                    </div>

                    <div className="flex flex-row gap-2 items-center relative flex-shrink-0">
                        {isToBack && (
                            <button
                                onClick={voltar}
                                className="min-w-[44px] min-h-[44px] border border-slate-300 dark:border-slate-600 py-2 px-3 sm:py-3 sm:px-4 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium rounded-lg flex justify-center items-center transition"
                                aria-label="Voltar"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}

                        {/* Botões em telas grandes */}
                        <div className="hidden md:flex flex-row gap-2">
                            {visibleButtons.map((btn, index) => {
                                const classes = clsx(
                                    'min-h-[44px] py-2.5 px-4 flex gap-2 text-white text-sm font-medium rounded-lg justify-center items-center transition whitespace-nowrap',
                                    btn.bgColor || 'bg-secondary hover:bg-secondary/80 dark:bg-secondary-dark dark:hover:bg-secondary-dark/80'
                                );

                                return (
                                    <div key={index}>
                                        {btn.link ? (
                                            <Link to={btn.link} className={classes}>
                                                {btn.icon}
                                                <span>{btn.label}</span>
                                            </Link>
                                        ) : (
                                            isButton && (
                                                <button onClick={btn.onClick} className={classes}>
                                                    {btn.icon}
                                                    <span>{btn.label}</span>
                                                </button>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Dropdown em telas pequenas */}
                        {visibleButtons.length > 0 && (
                            <div className="md:hidden relative" ref={dropdownRef}>
                                <button
                                    className="min-w-[44px] min-h-[44px] border border-slate-300 dark:border-slate-600 py-2 px-3 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    aria-label="Menu de ações"
                                >
                                    <MoreVertical size={20} />
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 top-12 z-50 bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 rounded-lg overflow-hidden min-w-[200px]">
                                        {visibleButtons.map((btn, index) =>
                                            btn.link ? (
                                                <Link
                                                    key={index}
                                                    to={btn.link}
                                                    className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                                >
                                                    {btn.icon}
                                                    <span className="flex-1">{btn.label}</span>
                                                </Link>
                                            ) : (
                                                <button
                                                    key={index}
                                                    onClick={() => {
                                                        btn.onClick?.();
                                                        setDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                                >
                                                    {btn.icon}
                                                    <span className="flex-1">{btn.label}</span>
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {children}

            {data?.length === 0 && <NotFoundData />}
        </div>
    );
};
