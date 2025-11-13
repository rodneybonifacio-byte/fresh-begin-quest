export interface ITransportadora {
    id: number
    transportadora_corpo_tabela_id: number
    nome_transportadora: string
    origem: string
    codigo_servico: string
    modalidade: string
    namespace_classe: string
    image_url: string
    percentual: string
    valor_adicional: string
    status: string
    total_logs: number
    tem_rastreio: string
    criado_em: string
    atualizado_em: string
}

export interface IResponseLogs {
    agrupamento_titulo: string
    data: ILogData[]
}

export interface ILogData {
    agrupamento_titulo: string
    data: Log[]
}

export interface Log {
    data: string
    origem: string
    conteudo: Conteudo
}

export interface Conteudo {
    exception: string
}
