
export interface IFatura {
    id: string;
    faturaId?: string;
    codigo?: string
    clienteId: string;
    totalObjetos: number;
    precoMedioFaturado: number;
    totalFaturado: string;
    totalCusto: string;
    dataVencimento: string;
    dataPagamento: string;
    status: string;
    criadoEm: string;
    periodoInicial: string;
    periodoFinal: string;
    cliente: {
        id: string;
        nome: string;
        cpfCnpj: string;
    };
    totalPago: string;
    valorRestante: string;
    faturas?: IFatura[]
    nome: string,
    cpfCnpj: string
}