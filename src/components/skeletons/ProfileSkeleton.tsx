
const TabSkeleton = () => {
    return (
        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24" />
        </div>
    );
};

const InputSkeleton = () => {
    return (
        <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24" />
            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded w-full" />
        </div>
    );
};

const SectionSkeleton = ({ title, inputCount = 2 }: { title: string; inputCount?: number }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array(inputCount)
                    .fill(0)
                    .map((_, i) => (
                        <InputSkeleton key={i} />
                    ))}
            </div>
        </div>
    );
};

export const ProfileSkeleton = () => {
    return (
        <div className="flex flex-col md:flex-row gap-6">
            {/* Aside Skeleton */}
            <aside className="w-full md:w-64 bg-white dark:bg-gray-800 rounded-xl p-4">
                <nav className="space-y-2">
                    <TabSkeleton />
                    <TabSkeleton />
                    <TabSkeleton />
                </nav>
            </aside>

            {/* Content Skeleton */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-6">
                <div className="space-y-8">
                    {/* Button Skeleton */}
                    <div className="flex justify-end mb-4">
                        <div className="h-10 w-32 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                    </div>

                    {/* Sections Skeleton */}
                    <SectionSkeleton title="Dados Principais" inputCount={4} />
                    <SectionSkeleton title="Contatos" inputCount={2} />
                    <SectionSkeleton title="Endereço" inputCount={7} />
                </div>
            </div>
        </div>
    );
};