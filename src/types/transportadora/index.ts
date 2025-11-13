import type { TransportadoraTipoAutenticacao } from './TransportadoraTipoAutenticacao';

export interface ITransportadora {
    id: string;
    nome: string;
    tipoAutenticacao: TransportadoraTipoAutenticacao;
    status: string;
}
