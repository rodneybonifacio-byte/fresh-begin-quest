// Interface para configuração de transportadora
export interface ITransportadoraConfig {
    id?: string;
    clienteId: string;
    transportadora: 'correios' | 'rodonave';
    porcentagem: number;
    ativo: boolean;
    criadoEm?: Date;
    atualizadoEm?: Date;
}

// Enum para tipos de transportadora
export enum TipoTransportadora {
    CORREIOS = 'correios',
    RODONAVE = 'rodonave'
}

// Interface para resposta da API
export interface ITransportadoraConfigResponse {
    data: ITransportadoraConfig[];
    message?: string;
    success: boolean;
}