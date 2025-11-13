import type { IAddress } from "./IAddress";

export interface IRemetente {
    id: string;
    nome: string;
    cpfCnpj: string;
    documentoEstrangeiro: string;
    celular: string;
    telefone: string;
    email: string;
    endereco?: IAddress
    criadoEm?: Date;
}