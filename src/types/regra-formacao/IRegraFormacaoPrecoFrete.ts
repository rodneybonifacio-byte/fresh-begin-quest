
export interface IRegraFormacaoPrecoFrete {
    id: string
    clienteId: string
    remetenteId: string
    alturaMaxima: number
    larguraMaxima: number
    comprimentoMaximo: number
    pesoMaximo: number
    tipoAcrescimo: "VALOR" | "PERCENTUAL";
    valorAcrescimo: string
    criadoEm: string
}