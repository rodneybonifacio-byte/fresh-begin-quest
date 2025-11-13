import { useEffect, useState } from "react";

export interface PaginacaoProps<T> {
    data: T[];
    dataPerPage?: number;
    setData: (data: T[]) => void;
}

export function usePaginacao<T>({ data, dataPerPage = 10, setData }: PaginacaoProps<T>) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(data.length / dataPerPage);

    useEffect(() => {
        setCurrentPage(1); // sempre que os dados mudam, reseta para página 1
    }, [data]);

    useEffect(() => {
        const start = (currentPage - 1) * dataPerPage;
        const end = start + dataPerPage;
        const paginado = data.slice(start, end);
        setData(paginado);
    }, [currentPage, dataPerPage, data]);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    return {
        currentPage,
        totalPages,
        handleNextPage,
        handlePrevPage
    };
}
