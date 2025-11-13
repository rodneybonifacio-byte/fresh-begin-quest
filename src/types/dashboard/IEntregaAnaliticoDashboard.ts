export interface IEntregaAnaliticoDashboard {
    distribuicaoStatus: IEntregaStatusDistribuicao[];
    indicadores: IEntregaIndicadores;
    detalhes: IEntregaDetalhada[];
    distribuicaoServicos: IEntregaServicoDistribuicao[];
}

export interface IEntregaServicoDistribuicao {
    servico: string;
    total: number;
    totalNoPrazo: number;
    totalComAtraso: number;
}

export interface IEntregaStatusDistribuicao {
    status: StatusEntrega;
    total: number;
}

export interface IEntregaIndicadores {
    totalEntregues: number;
    totalEmTransito: number;
    atrasoMedio: number;
    totalComAtraso: number;
    sla: number;
}

export interface IEntregaDetalhada {
    codObjeto: string;
    dtPrevista: string;
    dataUltimoEvento: string;
    servico: string;
    status: string;
    statusEntrega: string;
    diasDeAtraso: number;
}

export type StatusEntrega = | 'ENTREGUE_NO_PRAZO'
    | 'ENTREGUE_COM_ATRASO'
    | 'EM_TRANSITO_NO_PRAZO'
    | 'EM_TRANSITO_COM_ATRASO';