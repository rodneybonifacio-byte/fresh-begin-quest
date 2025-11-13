import clsx from 'clsx';

interface KpiCardProps {
    index: number;
    activeIndex: number | null;
    onClick: (index: number) => void;
    percentual: string | number; // aqui está o fix
    titulo?: string;
    total: number;
    colorClass: string;
    barColor: string;
}

export const KpiCard = ({
    index,
    activeIndex,
    onClick,
    percentual,
    titulo,
    total,
    colorClass,
    barColor,
}: KpiCardProps) => {
    const formatPercentual = typeof percentual === 'number' ? `${percentual}` : percentual;

    return (
        <div
            onClick={() => onClick(index)}
            className={clsx(
                'bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm text-center gap-2 flex flex-col cursor-pointer transition-all duration-300',
                {
                    'scale-110 z-10 ring-2 ring-purple-500 shadow-xl': activeIndex === index
                }
            )}
        >
            <div className={clsx('text-2xl font-bold', colorClass)}>{formatPercentual}%</div>
            <div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">{titulo}</div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                    <div className="h-full rounded-full" style={{ width: `${percentual}%`, backgroundColor: barColor }}></div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">{total} envios</div>
            </div>
        </div>
    );
};
