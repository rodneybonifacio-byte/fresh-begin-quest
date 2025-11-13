import { TabsTrigger } from "@radix-ui/react-tabs";

interface TabItemProps {
    value: string;
    label: string;
    hasError?: boolean;
}

export const TabItem = ({ value, label, hasError = false }: TabItemProps) => {
    return (
        <TabsTrigger
            value={value}
            className={`px-4 py-1 rounded-lg transition-colors duration-200 text-gray-700 dark:text-gray-200 
            data-[state=active]:bg-secondary data-[state=active]:text-white data-[state=active]:dark:bg-secondary-dark data-[state=active]:dark:text-white
            ${hasError ? "text-red-500 dark:text-red-400" : "hover:bg-gray-100 dark:hover:bg-slate-700 active:bg-gray-200 dark:active:bg-slate-600 focus:bg-gray-100 dark:focus:bg-slate-700"}`}
        >
            {label}
        </TabsTrigger>
    );
};
