export const StatCardSkeleton = () => {
    return (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100 animate-pulse">
            <div className="flex items-center">
                <div className="p-3 rounded-lg bg-slate-200 mr-4 w-10 h-10" />
                <div className="flex flex-col gap-2 w-full">
                    <div className="h-4 bg-slate-200 rounded w-24" />
                    <div className="h-6 bg-slate-300 rounded w-32" />
                </div>
            </div>
        </div>
    );
};
