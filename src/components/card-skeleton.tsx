export default function CardSkeleton() {
    return (
        <>
            <div className="cursor-pointer w-full animate-pulse flex-shrink-0 bg-[#fefefe] dark:bg-slate-800 rounded-lg border border-[#e3e4e8] dark:border-gray-600 flex-col justify-start items-start inline-flex" style={{ maxWidth: "300px" }}>
                <div className="p-4 bg-[#fefefe] dark:bg-slate-800 rounded-lg flex-col justify-start items-start gap-4 flex">
                    <div className="relative justify-center flex flex-col items-center">
                        <img className="w-[295px] h-[150px] rounded-lg"
                            alt=""
                            src="https://via.placeholder.com/763x414" />
                    </div>
                    <div className="self-stretch justify-start items-start gap-1 inline-flex">
                        <div className="grow shrink basis-0 flex-col justify-start items-start inline-flex">
                            <span className="h-3.5 bg-gray-200 rounded-full dark:bg-gray-700 w-full mb-2"></span>
                            <span className="h-3.5 bg-gray-200 rounded-full dark:bg-gray-700 w-full mb-2"></span>
                        </div>
                    </div>
                </div>
                <div className="self-stretch p-4 border-t border-[#e3e4e8] dark:border-gray-600 justify-start items-center gap-2 inline-flex">
                    <span className="h-3.5 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2"></span>
                </div>
            </div>
        </>
    );
}
