export interface ICotacaoMinimaResponse {
    idLote?: string;
    codigoServico: string;
    nomeServico: string;
    preco: string;
    prazo: number;
    imagem?: string;
    isNotaFiscal?: boolean;
}

export interface ICotacaoResponse {
    preco: Preco;
    prazo: Prazo;
}

export interface Preco {
    nomeServico: string;
    coProduto: string;
    pcBase: string;
    pcBaseGeral: string;
    peVariacao: string;
    pcReferencia: string;
    vlBaseCalculoImposto: string;
    nuRequisicao: string;
    inPesoCubico: string;
    psCobrado: string;
    servicoAdicional: ServicoAdicional[];
    peAdValorem: string;
    vlSeguroAutomatico: string;
    qtAdicional: string;
    pcFaixa: string;
    pcFaixaVariacao: string;
    pcProduto: string;
    pcTotalServicosAdicionais: string;
    pcFinal: string;
}

export interface ServicoAdicional {
    coServAdicional: string;
    tpServAdicional: string;
    pcServicoAdicional: string;
}

export interface Prazo {
    nomeServico: string;
    coProduto: string;
    nuRequisicao: string;
    prazoEntrega: number;
    dataMaxima: string;
    entregaDomiciliar: string;
    entregaSabado: string;
    entregaDomingo: string;
}
