export interface IFaturaDashboard {
    resumo: IFaturaDashboardResumoGeral;
    comparativoClientes: IFaturaDashboardResumoCliente[];
}

export interface IFaturaDashboardResumoGeral {
    faturado: number;
    pago: number;
    lucro: number;
    custo: number;
    porcentagemRecebida: number;
    totalObjetos: number;
}

export interface IFaturaDashboardResumoCliente extends IFaturaDashboardResumoGeral {
    clienteId: string;
    cliente: string;
}

