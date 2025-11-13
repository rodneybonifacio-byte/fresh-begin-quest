import type { FaturaClienteDto } from "./FaturaClienteDto"
import type { FaturaDetalheDto } from "./FaturaDetalheDto"
import type { FaturaHistoricoPagamentoDto } from "./FaturaHistoricoPagamentoDto"

export interface FaturaDto {
    id: string
    codigo: string
    criadoEm: string
    dataVencimento: string
    dataPagamento: string
    status: string
    totalFaturado: string
    totalCusto: string
    totalObjetos: string
    periodoInicial: string
    periodoFinal: string   
    formaPagamento?: string
    cliente: FaturaClienteDto
    detalhe: FaturaDetalheDto[]
    faturaHistoricoPagamento?: FaturaHistoricoPagamentoDto[]
}