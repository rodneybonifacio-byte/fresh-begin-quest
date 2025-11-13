export interface IRelatorioDesempenhoResponse {
    relatorio: Relatorio
}

export interface Relatorio {
    data: Data
    items: Item[]
    groupedStateData: GroupedStateDaum[]
    groupedByServico: GroupedByServico[]
}

export interface Data {
    total: number
    entregues_antes: KpiResumo
    entregues_no_prazo: KpiResumo
    entregues_atraso: KpiResumo
    em_transito_no_prazo: KpiResumo
    em_transito_com_atraso: KpiResumo
    media_dias_atraso_ou_adiantamento: number
    percentual_no_prazo: number
    percentual_no_atraso: number
    cliente: string
    clienteCpfCnpj: string
    periodo: string
}

export interface Item {
    remetenteCpfCnpj: string
    remetenteNome: string
    destinatarioUf: string
    servico: string
    total: number
    remetenteId: string
    entregues_antes: number
    entregues_no_prazo: number
    entregues_atraso: number
    em_transito_no_prazo: number
    em_transito_com_atraso: number
    media_dias_atraso_ou_adiantamento: number
    percentual_no_prazo: number
    percentual_do_total: number
    remententeId: string
}

export interface GroupedStateDaum {
    uf: string
    antes: number
    noPrazo: number
    atraso: number
}

export interface GroupedByServico {
    servico: string
    total: number
    percentual: number
    antes: KpiResumo
    noPrazo: KpiResumo
    atraso: KpiResumo
}

export interface KpiResumo {
    tituloKpi: string
    total: number
    percentual: number
}
