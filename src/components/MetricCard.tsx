import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

const colors = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    orange: "text-orange-600 dark:text-orange-400",
    purple: "text-purple-600 dark:text-purple-400",
    red: "text-red-600 dark:text-red-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    gray: "text-gray-600 dark:text-gray-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
    teal: "text-teal-600 dark:text-teal-400"
}
type TextSizeOption = 'text-xs' | 'text-sm' | 'text-md' | 'text-lg' | 'text-xl' | 'text-2xl' | 'text-3xl';
type ValueOption = { text: string; size?: TextSizeOption; };
export type IconColor = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'yellow' | 'gray' | 'indigo' | 'cyan' | 'teal';
interface MetricCardProps {
    title: ValueOption;
    subTitle?: string;
    value: ValueOption;
    icon: LucideIcon;
    iconColor?: IconColor;
    className?: string;
    loading?: boolean;
    suffix?: string;
    description?: string;
    isAlert?: boolean;
    showUrgentBadge?: boolean;
    titleColorByIcon?: boolean; // se true, o título usa a cor do ícone
    valueColorByIcon?: boolean; // se true, o value usa a cor do ícone
    onClick?: () => void; // handler para click no card
}


export const MetricCard: React.FC<MetricCardProps> = ({
    title = { text: '', size: 'text-xs' },
    subTitle,
    value = { text: '', size: 'text-xs' },
    icon: Icon,
    iconColor = 'blue',
    className = '',
    loading = false,
    suffix = '',
    description,
    isAlert = false,
    showUrgentBadge = false,
    titleColorByIcon = false,
    valueColorByIcon = false,
    onClick
}) => {
    const getIconColorClasses = (color: string) => {
        const colorMap = {
            blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
            green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
            orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
            purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
            red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
            yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
            gray: 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400',
            indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
            cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
        };
        return colorMap[color as keyof typeof colorMap] || colorMap.blue;
    };

    if (loading) {
        return (
            <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 animate-pulse ${className}`}>
                <div className="flex items-center justify-between">
                    <div className="">
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded mb-2 w-3/4"></div>
                        <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                        {description && (
                            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded mt-2 w-full"></div>
                        )}
                    </div>
                    <div className="p-3 rounded-full">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={clsx(
                "flex flex-row gap-2 justify-between bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-all duration-300",
                isAlert && "ring-4 ring-red-500 ring-opacity-50 bg-red-50 dark:bg-red-900/30 shadow-lg shadow-red-500/20 animate-pulse",
                onClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50",
                className
            )}
        >
            <div className='flex flex-col gap-1'>
                <p className={clsx(title.size, "font-medium mb-1", isAlert ? "text-red-700 dark:text-red-300 font-bold" : titleColorByIcon ? colors[iconColor] || "text-gray-600 dark:text-slate-400" : "text-gray-600 dark:text-slate-400")} >
                    {title.text}
                    {subTitle && (
                        <small className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-1">
                            {subTitle}
                        </small>
                    )}
                </p>
                <div>
                    <p className={clsx(value.size, "font-bold", isAlert ? "text-red-800 dark:text-red-200 text-3xl" : valueColorByIcon ? colors[iconColor] || "text-gray-900 dark:text-white" : "text-gray-900 dark:text-white")}>
                        {value.text}{suffix}
                    </p>
                    {description && (
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className={clsx("p-3 rounded-lg", getIconColorClasses(iconColor), isAlert && "animate-bounce")}>
                    <Icon className="w-6 h-6" />
                </div>
                {showUrgentBadge && (
                    <div className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                        URGENTE
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricCard;
