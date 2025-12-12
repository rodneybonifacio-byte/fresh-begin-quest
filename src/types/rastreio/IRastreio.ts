
export interface IRastreioResponse {
    codigoObjeto: string
    dataPrevisaoEntrega: string
    modalidade: string
    servico: string
    eventos: IRastreio[]
}

export interface IRastreio {
    codigo: any
    descricao: string
    date: string
    horario: string
    detalhes: any
    image: string
    unidade?: Unidade
    dataCompleta: string
    unidadeDestino: any
}

export interface EnderecoUnidade {
    cep?: string
    logradouro?: string
    numero?: string
    bairro?: string
    cidade?: string
    uf?: string
}

export interface Unidade {
    cidadeUf: string
    tipo: string
    endereco?: EnderecoUnidade
}
