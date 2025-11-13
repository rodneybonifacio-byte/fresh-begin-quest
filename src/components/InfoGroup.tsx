interface InfoGroupProps {
    label: string;
    values: (string | React.ReactNode | null | undefined)[];
    align?: 'left' | 'center' | 'right';
}

export const InfoGroup = ({ label, values, align = 'left' }: InfoGroupProps) => {
    const alignmentMap = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    const alignClass = alignmentMap[align] || alignmentMap.left;

    return (
        <div className={`flex flex-col gap-1 ${alignClass}`}>
            <span className="text-xs text-slate-900 dark:text-slate-100 font-medium">{label}</span>
            <div className="flex flex-col gap-1">
                {values.map((val, i) => (
                    <span key={i} className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {val || '-'}
                    </span>
                ))}
            </div>
        </div>
    );
};

