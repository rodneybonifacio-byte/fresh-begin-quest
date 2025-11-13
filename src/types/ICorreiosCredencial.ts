export interface ICorreiosCredencial {
    cartaoPostagem: string;
    codigoAcesso: string;
    contrato: string;
    criadoEm?: string;
    descricao: string;
    id?: string;
    status?: string;
    creditoDisponivel?: number;
    limiteValorContrato?: number;
    tipoContrato?: string;
    usuario: string
}