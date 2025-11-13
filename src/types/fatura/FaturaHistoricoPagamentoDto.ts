export interface FaturaHistoricoPagamentoDto {
    id: string
    dataPagamento: string
    valor: string
    observacao: string
    comprovante?: string
    formaPagamento: string
}