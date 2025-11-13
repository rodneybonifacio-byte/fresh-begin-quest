export interface IResponse<T> {
    data: T
    total?: number
    meta?: PaginationMeta
}

export interface PaginationMeta {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
    recordsOnPage: number | null;
}