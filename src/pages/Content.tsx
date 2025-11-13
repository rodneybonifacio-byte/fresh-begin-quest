import { Link } from "react-router-dom";
import { NotFoundData } from "../components/NotFoundData";
import clsx from "clsx";
import { LoadSpinner } from "../components/loading";
import { BreadCrumbCustom } from "../components/breadcrumb";

export interface ContentButtonProps {
    label: string
    onClick?: () => void
    link?: string
    isShow?: boolean
    icon?: React.ReactNode
    bgColor?: string
}

interface IContentProps {
    children: React.ReactNode
    titulo: string
    subTitulo?: string
    isButton?: boolean
    button?: ContentButtonProps[]
    data?: any[]
    isLoading?: boolean
}

export const Content = ({ children, titulo, subTitulo, isButton, button, data, isLoading }: IContentProps) => {
    return (
        <div className="flex flex-col gap-3">
            <BreadCrumbCustom />
            {isLoading ? <LoadSpinner mensagem="Carregando..." /> : null}

            <div className="bg-white dark:bg-slate-800 w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex flex-row items-center justify-between gap-2">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            {titulo}
                        </h1>
                        {subTitulo && <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{subTitulo}</span>}
                    </div>

                    <div className="flex flex-row gap-2">
                        {button && button.filter((btn) => btn.isShow !== true).map((btn, index) => {

                            const classes = clsx(
                                "py-3 px-4 w-full flex gap-2 text-white text-sm font-medium rounded-lg flex justify-center items-center transition",
                                btn.bgColor || 'bg-secondary hover:bg-secondary/80 dark:bg-secondary-dark dark:hover:bg-secondary-dark/80'
                            );

                            return (
                                <div key={index}>
                                    {btn.link ? (
                                        <Link to={btn.link} className={classes}>
                                            {btn.icon && btn.icon}
                                            {btn.label && btn.label.length > 0 && (
                                                <span className="hidden lg:block">{btn.label}</span>
                                            )}
                                        </Link>
                                    ) : (
                                        isButton &&
                                        <button
                                            onClick={btn.onClick}
                                            className={classes}
                                        >
                                            {btn.icon && btn.icon}
                                            {btn.label && <span className="hidden lg:block">{btn.label}</span>}
                                        </button>

                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {children}

            {data?.length === 0 && (
                <div className="bg-white dark:bg-slate-800 w-full p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <NotFoundData />
                </div>
            )}
        </div>
    );
};