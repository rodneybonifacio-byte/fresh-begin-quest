import React from 'react';
import type { PaginationMeta } from '../types/IResponse';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PaginacaoProps {
    meta?: PaginationMeta;
    onPageChange: (page: number) => void;
}

export const PaginacaoCustom: React.FC<PaginacaoProps> = ({ meta, onPageChange }) => {
    const handlePrev = () => {
        if (meta?.prevPage) onPageChange(meta.prevPage);
    };

    const handleNext = () => {
        if (meta?.nextPage) onPageChange(meta.nextPage);
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 my-4 px-4">
            <div className="flex items-center gap-2">
                <button
                    onClick={handlePrev}
                    disabled={!meta?.prevPage}
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    aria-label="Página anterior"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={handleNext}
                    disabled={!meta?.nextPage}
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    aria-label="Próxima página"
                >
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
            <div className="text-sm text-center text-gray-700 dark:text-gray-300">
                <span className="font-medium">
                    Página {meta?.currentPage} de {meta?.totalPages}
                </span>
                <span className="hidden sm:inline text-gray-500 dark:text-gray-400 mx-1">|</span>
                <span className="block sm:inline text-gray-500 dark:text-gray-400">
                    {meta?.recordsOnPage} de {meta?.totalRecords} registros
                </span>
            </div>
        </div>
    );
};
