import { ReactNode } from "react";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    bgIcon?: string;
    textColor?: string;
    loading?: boolean;
}

export const StatCard = ({ title, value, icon, bgIcon = "bg-slate-200", textColor = "text-slate-800", loading = false }: StatCardProps) => {
    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-100 dark:border-slate-600 animate-pulse">
                <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-slate-200 dark:bg-slate-700 mr-4 w-10 h-10" />
                    <div className="flex flex-col gap-2 w-full">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                        <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-32" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-100 dark:border-gray-600 shadow-sm">
            <div className="flex items-center">
                <div className={`p-3 rounded-lg mr-4 ${bgIcon}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-xs text-slate-400 dark:text-slate-300">{title}</p>
                    <p className={`text-md font-bold ${textColor}`}>{value}</p>
                </div>
            </div>
        </div>
    );
};
