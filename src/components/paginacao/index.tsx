import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePaginacao, type PaginacaoProps } from "./usePaginacao";

export const Paginacao = <T,>({ data, dataPerPage = 10, setData }: PaginacaoProps<T>) => {
    const { handleNextPage, handlePrevPage, currentPage, totalPages } = usePaginacao({
        data,
        dataPerPage,
        setData,
    });

    return (
        <div className="flex justify-center sm:justify-end items-center">
            <div className="sm:p-4 flex justify-between items-center gap-4">
                <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 ${currentPage === 1 ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <ArrowLeft />
                </button>
                <span className="text-gray-700">
                    Página {currentPage} de {totalPages} - {data.length} registros
                </span>
                <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 ${currentPage === totalPages ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <ArrowRight />
                </button>
            </div>
        </div>
    );
};