export interface IFaturaSimpleView {
    id: string;
    codigo: string;
    criadoEm: string;
    dataVencimento: string;
    dataPagamento: string;
    status: string;
    totalFaturado: number;
    totalCusto: number;
    totalObjetos: number;
    periodoInicial: string;
    periodoFinal: string;
    formaPagamento: string;
    cliente: IFaturaCliente;
    remetente: IFaturaCliente;
    detalhe: IFaturaDetalhe[];
    faturaHistoricoPagamento: IFaturaHistoricoPagamento[];
}

export interface IFaturaCliente {
    id: string;
    nome: string;
    cpfCnpj: string;
    telefone: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
}

export interface IFaturaDetalhe {
    id: string;
    status: string;
    nome: string;
    valor: number;
    codigoObjeto: string;
    criadoEm: string;
}

export interface IFaturaHistoricoPagamento {
    id: string;
    valor: number;
    formaPagamento: string;
    dataPagamento: string;
    observacao: string;
}