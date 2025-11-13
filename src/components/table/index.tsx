interface TableCustomProps {
    thead?: string[]
    children?: React.ReactNode
}
export const TableCustom = ({ thead, children }: TableCustomProps) => {
    return (
        <table className="min-w-[600px] w-full table-auto">
            <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                    {thead?.map((item, index) => <th key={index} className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 uppercase">{item}</th>)}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-slate-800 text-xs">
                {children}
            </tbody>
        </table>
    );
};