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
        <div className="flex items-center justify-center my-4">
            <button
                onClick={handlePrev}
                disabled={!meta?.prevPage}
                className="px-4 py-2 mr-2 bg-primary text-white border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ArrowLeft className="w-4 h-4" />
            </button>
            <span>
                Página {meta?.currentPage} de {meta?.totalPages} | {meta?.recordsOnPage} de {meta?.totalRecords} registros
            </span>
            <button
                onClick={handleNext}
                disabled={!meta?.nextPage}
                className="px-4 py-2 ml-2 bg-primary text-white border rounded disabled:opacity-50  disabled:cursor-not-allowed"
            >
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
};
